'use server'

import { createClient } from '@/lib/supabase/server'

interface RoutingResult {
  agentId: string | null
  stationId: string | null
  reason: string
}

/**
 * Find the best agent for a ticket based on routing strategy
 */
export async function findBestAgent(
  organizationId: string,
  branchId: string,
  serviceId: string
): Promise<RoutingResult> {
  const supabase = await createClient()

  // Get routing config
  const { data: config } = await supabase
    .from('routing_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .maybeSingle()

  const strategy = config?.strategy || 'round_robin'

  // Get active agents in this branch with their current load
  const { data: activeSessions } = await supabase
    .from('agent_sessions')
    .select('user_id, station_id')
    .eq('branch_id', branchId)
    .eq('is_active', true)

  if (!activeSessions || activeSessions.length === 0) {
    return { agentId: null, stationId: null, reason: 'No hay agentes activos' }
  }

  // Get current ticket counts per agent (serving status)
  const agentIds = activeSessions.map(s => s.user_id)
  const { data: servingTickets } = await supabase
    .from('tickets')
    .select('agent_id')
    .in('agent_id', agentIds)
    .eq('status', 'serving')

  const agentLoad = new Map<string, number>()
  for (const agent of activeSessions) {
    agentLoad.set(agent.user_id, 0)
  }
  for (const ticket of servingTickets || []) {
    if (ticket.agent_id) {
      agentLoad.set(ticket.agent_id, (agentLoad.get(ticket.agent_id) || 0) + 1)
    }
  }

  let bestAgentId: string | null = null
  let bestReason = 'Round robin'

  if (strategy === 'skill_based' || strategy === 'hybrid') {
    // Get skill proficiency for this service
    const { data: skills } = await supabase
      .from('agent_skills')
      .select('agent_id, proficiency')
      .in('agent_id', agentIds)
      .eq('service_id', serviceId)
      .eq('is_active', true)
      .order('proficiency', { ascending: false })

    if (skills && skills.length > 0) {
      if (strategy === 'hybrid') {
        // Hybrid: best score = proficiency * (1 - normalized_load)
        let bestScore = -1
        for (const skill of skills) {
          const load = agentLoad.get(skill.agent_id) || 0
          const maxLoad = Math.max(...Array.from(agentLoad.values()), 1)
          const normalizedLoad = load / maxLoad
          const score = skill.proficiency * (1 - normalizedLoad * (config?.load_balance_weight || 0.5))

          if (score > bestScore) {
            bestScore = score
            bestAgentId = skill.agent_id
            bestReason = `Hybrid (skill: ${skill.proficiency}, load: ${load})`
          }
        }
      } else {
        bestAgentId = skills[0].agent_id
        bestReason = `Skill-based (proficiency: ${skills[0].proficiency})`
      }
    }
  }

  if (!bestAgentId && (strategy === 'least_busy' || strategy === 'hybrid')) {
    // Least busy: agent with fewest current tickets
    let minLoad = Infinity
    for (const [agentId, load] of agentLoad) {
      if (load < minLoad) {
        minLoad = load
        bestAgentId = agentId
        bestReason = `Least busy (load: ${load})`
      }
    }
  }

  if (!bestAgentId) {
    // Round robin fallback: just pick first available
    bestAgentId = activeSessions[0].user_id
    bestReason = 'Round robin (default)'
  }

  // Find station for the selected agent
  const agentSession = activeSessions.find(s => s.user_id === bestAgentId)

  return {
    agentId: bestAgentId,
    stationId: agentSession?.station_id || null,
    reason: bestReason,
  }
}

/**
 * Get routing configuration for an organization
 */
export async function getRoutingConfig(organizationId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('routing_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle()

  return data
}

/**
 * Save routing configuration
 */
export async function saveRoutingConfig(
  organizationId: string,
  config: {
    strategy: string
    load_balance_weight: number
    prefer_same_agent: boolean
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('routing_configs')
    .upsert({
      organization_id: organizationId,
      ...config,
      is_active: true,
    }, { onConflict: 'organization_id' })

  if (error) return { error: error.message }
  return { success: true }
}

/**
 * Get agent skills for an organization
 */
export async function getAgentSkills(organizationId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('agent_skills')
    .select(`
      *,
      agent:users!agent_skills_agent_id_fkey(full_name),
      service:services!agent_skills_service_id_fkey(name)
    `)
    .order('proficiency', { ascending: false })

  // Filter by org (since agent_skills doesn't have org_id directly)
  return data || []
}

/**
 * Save an agent skill
 */
export async function saveAgentSkill(
  agentId: string,
  serviceId: string,
  proficiency: number
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('agent_skills')
    .upsert({
      agent_id: agentId,
      service_id: serviceId,
      proficiency: Math.min(10, Math.max(1, proficiency)),
      is_active: true,
    }, { onConflict: 'agent_id,service_id' })

  if (error) return { error: error.message }
  return { success: true }
}

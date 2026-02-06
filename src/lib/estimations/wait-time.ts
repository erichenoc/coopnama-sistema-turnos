import { createClient } from '@/lib/supabase/client'

interface WaitTimeEstimate {
  position: number
  estimatedMinutes: number
  activeAgents: number
  avgServiceMinutes: number
}

/**
 * Estimates wait time for a specific service at a branch.
 * Formula: (people_ahead * avg_service_time) / max(active_agents, 1)
 *
 * Uses recent completed tickets for avg service time (last 50),
 * falls back to service.avg_duration_minutes if no recent data.
 */
export async function estimateWaitTime(
  branchId: string,
  serviceId: string,
  fallbackAvgMinutes: number = 5
): Promise<Omit<WaitTimeEstimate, 'position'> & { waitingCount: number }> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Parallel queries: waiting count, active agents, recent completed tickets
  const [waitingRes, agentsRes, completedRes] = await Promise.all([
    supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('service_id', serviceId)
      .eq('status', 'waiting')
      .gte('created_at', today),

    supabase
      .from('agent_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('is_active', true),

    supabase
      .from('tickets')
      .select('called_at, completed_at')
      .eq('branch_id', branchId)
      .eq('service_id', serviceId)
      .eq('status', 'completed')
      .not('called_at', 'is', null)
      .not('completed_at', 'is', null)
      .gte('created_at', today)
      .order('completed_at', { ascending: false })
      .limit(50),
  ])

  const waitingCount = waitingRes.count || 0
  const activeAgents = Math.max(agentsRes.count || 1, 1)

  // Calculate avg service time from recent completions
  let avgServiceMinutes = fallbackAvgMinutes
  const completed = completedRes.data || []

  if (completed.length > 0) {
    const totalMinutes = completed.reduce((sum, t) => {
      const calledAt = new Date(t.called_at).getTime()
      const completedAt = new Date(t.completed_at).getTime()
      return sum + (completedAt - calledAt) / 60000
    }, 0)
    avgServiceMinutes = Math.round(totalMinutes / completed.length)
    if (avgServiceMinutes < 1) avgServiceMinutes = 1
  }

  const estimatedMinutes = Math.max(
    Math.round((waitingCount * avgServiceMinutes) / activeAgents),
    1
  )

  return { waitingCount, estimatedMinutes, activeAgents, avgServiceMinutes }
}

/**
 * Estimates wait time for a specific ticket's position in queue.
 */
export async function estimateWaitTimeForTicket(
  branchId: string,
  serviceId: string,
  ticketCreatedAt: string,
  fallbackAvgMinutes: number = 5
): Promise<WaitTimeEstimate> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Count tickets ahead in queue (same service, created before this one)
  const [positionRes, agentsRes, completedRes] = await Promise.all([
    supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('service_id', serviceId)
      .eq('status', 'waiting')
      .gte('created_at', today)
      .lt('created_at', ticketCreatedAt),

    supabase
      .from('agent_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('is_active', true),

    supabase
      .from('tickets')
      .select('called_at, completed_at')
      .eq('branch_id', branchId)
      .eq('service_id', serviceId)
      .eq('status', 'completed')
      .not('called_at', 'is', null)
      .not('completed_at', 'is', null)
      .gte('created_at', today)
      .order('completed_at', { ascending: false })
      .limit(50),
  ])

  const position = (positionRes.count || 0) + 1
  const activeAgents = Math.max(agentsRes.count || 1, 1)

  let avgServiceMinutes = fallbackAvgMinutes
  const completed = completedRes.data || []

  if (completed.length > 0) {
    const totalMinutes = completed.reduce((sum, t) => {
      const calledAt = new Date(t.called_at).getTime()
      const completedAt = new Date(t.completed_at).getTime()
      return sum + (completedAt - calledAt) / 60000
    }, 0)
    avgServiceMinutes = Math.round(totalMinutes / completed.length)
    if (avgServiceMinutes < 1) avgServiceMinutes = 1
  }

  const estimatedMinutes = Math.max(
    Math.round((position * avgServiceMinutes) / activeAgents),
    1
  )

  return { position, estimatedMinutes, activeAgents, avgServiceMinutes }
}

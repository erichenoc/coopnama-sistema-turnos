'use server'

import { createClient } from '@/lib/supabase/server'

export interface SentimentStats {
  total: number
  positive: number
  neutral: number
  negative: number
  avgRating: number
}

export interface SentimentByAgent {
  agentId: string
  agentName: string
  total: number
  positive: number
  neutral: number
  negative: number
  avgRating: number
}

export interface SentimentByService {
  serviceId: string
  serviceName: string
  total: number
  positive: number
  neutral: number
  negative: number
  avgRating: number
}

export interface SentimentTrend {
  date: string
  positive: number
  neutral: number
  negative: number
  total: number
}

export async function getSentimentOverview(
  organizationId: string,
  branchId?: string,
  days: number = 30
): Promise<SentimentStats> {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('tickets')
    .select('rating, sentiment')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .gte('completed_at', since)
    .not('rating', 'is', null)

  if (branchId && branchId !== 'all') {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error || !data) return { total: 0, positive: 0, neutral: 0, negative: 0, avgRating: 0 }

  const total = data.length
  const positive = data.filter(d => d.sentiment === 'positive').length
  const neutral = data.filter(d => d.sentiment === 'neutral').length
  const negative = data.filter(d => d.sentiment === 'negative').length
  const avgRating = total > 0 ? data.reduce((sum, d) => sum + (d.rating || 0), 0) / total : 0

  return { total, positive, neutral, negative, avgRating: Math.round(avgRating * 10) / 10 }
}

export async function getSentimentByAgent(
  organizationId: string,
  branchId?: string,
  days: number = 30
): Promise<SentimentByAgent[]> {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('tickets')
    .select('rating, sentiment, agent_id, agent:users!tickets_agent_id_fkey(full_name)')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .gte('completed_at', since)
    .not('rating', 'is', null)
    .not('agent_id', 'is', null)

  if (branchId && branchId !== 'all') {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error || !data) return []

  const agentMap = new Map<string, { name: string; ratings: number[]; sentiments: string[] }>()

  for (const ticket of data) {
    const agentId = ticket.agent_id as string
    const agentName = (ticket.agent as any)?.full_name || 'Agente'

    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, { name: agentName, ratings: [], sentiments: [] })
    }
    const entry = agentMap.get(agentId)!
    entry.ratings.push(ticket.rating || 0)
    entry.sentiments.push(ticket.sentiment || 'neutral')
  }

  return Array.from(agentMap.entries()).map(([agentId, info]) => ({
    agentId,
    agentName: info.name,
    total: info.ratings.length,
    positive: info.sentiments.filter(s => s === 'positive').length,
    neutral: info.sentiments.filter(s => s === 'neutral').length,
    negative: info.sentiments.filter(s => s === 'negative').length,
    avgRating: Math.round((info.ratings.reduce((a, b) => a + b, 0) / info.ratings.length) * 10) / 10,
  })).sort((a, b) => b.avgRating - a.avgRating)
}

export async function getSentimentByService(
  organizationId: string,
  branchId?: string,
  days: number = 30
): Promise<SentimentByService[]> {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('tickets')
    .select('rating, sentiment, service_id, service:services!tickets_service_id_fkey(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .gte('completed_at', since)
    .not('rating', 'is', null)

  if (branchId && branchId !== 'all') {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error || !data) return []

  const serviceMap = new Map<string, { name: string; ratings: number[]; sentiments: string[] }>()

  for (const ticket of data) {
    const serviceId = ticket.service_id as string
    const serviceName = (ticket.service as any)?.name || 'Servicio'

    if (!serviceMap.has(serviceId)) {
      serviceMap.set(serviceId, { name: serviceName, ratings: [], sentiments: [] })
    }
    const entry = serviceMap.get(serviceId)!
    entry.ratings.push(ticket.rating || 0)
    entry.sentiments.push(ticket.sentiment || 'neutral')
  }

  return Array.from(serviceMap.entries()).map(([serviceId, info]) => ({
    serviceId,
    serviceName: info.name,
    total: info.ratings.length,
    positive: info.sentiments.filter(s => s === 'positive').length,
    neutral: info.sentiments.filter(s => s === 'neutral').length,
    negative: info.sentiments.filter(s => s === 'negative').length,
    avgRating: Math.round((info.ratings.reduce((a, b) => a + b, 0) / info.ratings.length) * 10) / 10,
  })).sort((a, b) => b.avgRating - a.avgRating)
}

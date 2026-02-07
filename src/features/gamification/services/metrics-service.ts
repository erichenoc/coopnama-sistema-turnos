/**
 * Gamification Metrics Service
 * Queries agent performance metrics, leaderboards, and achievements
 */

import { createClient } from '@/lib/supabase/client'

// ============================================
// TYPES
// ============================================

export interface LeaderboardAgent {
  agent_id: string
  agent_name: string
  avatar_url: string | null
  tickets_served: number
  avg_service_time: number | null
  avg_rating: number | null
  total_score: number
  rank: number
}

export interface AgentMetrics {
  agent_id: string
  today_served: number
  week_served: number
  month_served: number
  avg_rating: number | null
  total_ratings: number
  streak_days: number
  best_service_time: number | null
}

export interface Achievement {
  id: string
  agent_id: string
  achievement_type: string
  achievement_name: string
  description: string | null
  earned_at: string
}

export interface AchievementRule {
  type: string
  name: string
  description: string
  check: (stats: AgentStats) => boolean
}

interface AgentStats {
  total_tickets: number
  avg_service_time: number | null
  max_rating: number | null
  today_tickets: number
}

// ============================================
// ACHIEVEMENT RULES
// ============================================

const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    type: 'first_ticket',
    name: 'Primer Turno',
    description: 'Atendió su primer turno',
    check: (stats) => stats.total_tickets >= 1,
  },
  {
    type: 'speed_demon',
    name: 'Demonio de la Velocidad',
    description: 'Tiempo promedio de servicio menor a 3 minutos',
    check: (stats) => (stats.avg_service_time ?? Infinity) < 180,
  },
  {
    type: 'five_star',
    name: 'Cinco Estrellas',
    description: 'Recibió una calificación de 5 estrellas',
    check: (stats) => (stats.max_rating ?? 0) === 5,
  },
  {
    type: 'century',
    name: 'Centurión',
    description: 'Atendió más de 100 turnos',
    check: (stats) => stats.total_tickets >= 100,
  },
  {
    type: 'marathon',
    name: 'Maratonista',
    description: 'Atendió 20+ turnos en un día',
    check: (stats) => stats.today_tickets >= 20,
  },
]

// ============================================
// EXPORTED FUNCTIONS
// ============================================

/**
 * Get leaderboard ranked by total score
 * Score = tickets_served*10 + (5-avg_service_time/60)*5 + avg_rating*20
 */
export async function getLeaderboard(
  organizationId: string,
  branchId?: string
): Promise<LeaderboardAgent[]> {
  const supabase = createClient()

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  try {
    // Build query for today's completed tickets
    let query = supabase
      .from('tickets')
      .select(
        `
        agent_id,
        service_time_seconds,
        rating,
        users!tickets_agent_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString())
      .lt('completed_at', tomorrow.toISOString())
      .not('agent_id', 'is', null)

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    const { data: tickets, error } = await query

    if (error) {
      console.error('Error fetching leaderboard data:', error)
      return []
    }

    // Group by agent and calculate metrics
    const agentMap = new Map<string, {
      agent_id: string
      agent_name: string
      avatar_url: string | null
      tickets_served: number
      total_service_time: number
      service_count: number
      total_rating: number
      rating_count: number
    }>()

    tickets?.forEach((ticket) => {
      if (!ticket.agent_id || !ticket.users) return

      const agent = agentMap.get(ticket.agent_id) || {
        agent_id: ticket.agent_id,
        agent_name: (ticket.users as any).full_name || 'Agente',
        avatar_url: (ticket.users as any).avatar_url || null,
        tickets_served: 0,
        total_service_time: 0,
        service_count: 0,
        total_rating: 0,
        rating_count: 0,
      }

      agent.tickets_served++

      if (ticket.service_time_seconds !== null) {
        agent.total_service_time += ticket.service_time_seconds
        agent.service_count++
      }

      if (ticket.rating !== null) {
        agent.total_rating += ticket.rating
        agent.rating_count++
      }

      agentMap.set(ticket.agent_id, agent)
    })

    // Calculate scores and rankings
    const leaderboard: LeaderboardAgent[] = Array.from(agentMap.values()).map((agent) => {
      const avg_service_time = agent.service_count > 0
        ? agent.total_service_time / agent.service_count
        : null

      const avg_rating = agent.rating_count > 0
        ? agent.total_rating / agent.rating_count
        : null

      // Score calculation
      const ticketsScore = agent.tickets_served * 10
      const timeScore = avg_service_time !== null
        ? (5 - avg_service_time / 60) * 5
        : 0
      const ratingScore = avg_rating !== null ? avg_rating * 20 : 0

      const total_score = Math.max(0, ticketsScore + timeScore + ratingScore)

      return {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        avatar_url: agent.avatar_url,
        tickets_served: agent.tickets_served,
        avg_service_time,
        avg_rating,
        total_score,
        rank: 0, // Will be set after sorting
      }
    })

    // Sort by score and assign ranks
    leaderboard.sort((a, b) => b.total_score - a.total_score)
    leaderboard.forEach((agent, index) => {
      agent.rank = index + 1
    })

    return leaderboard
  } catch (error) {
    console.error('Error in getLeaderboard:', error)
    return []
  }
}

/**
 * Get detailed metrics for a specific agent
 */
export async function getAgentMetrics(agentId: string): Promise<AgentMetrics | null> {
  const supabase = createClient()

  try {
    // Get date ranges
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const monthAgo = new Date(now)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    // Get tickets for different periods
    const [todayData, weekData, monthData, allTimeData] = await Promise.all([
      // Today
      supabase
        .from('tickets')
        .select('id')
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString()),

      // Week
      supabase
        .from('tickets')
        .select('id')
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .gte('completed_at', weekAgo.toISOString()),

      // Month
      supabase
        .from('tickets')
        .select('id')
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .gte('completed_at', monthAgo.toISOString()),

      // All time with ratings and service times
      supabase
        .from('tickets')
        .select('rating, service_time_seconds, completed_at')
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false }),
    ])

    const today_served = todayData.data?.length || 0
    const week_served = weekData.data?.length || 0
    const month_served = monthData.data?.length || 0

    // Calculate rating stats
    const ratingsData = allTimeData.data?.filter((t) => t.rating !== null) || []
    const avg_rating = ratingsData.length > 0
      ? ratingsData.reduce((sum, t) => sum + (t.rating || 0), 0) / ratingsData.length
      : null
    const total_ratings = ratingsData.length

    // Calculate best service time
    const serviceTimes = allTimeData.data?.filter((t) => t.service_time_seconds !== null) || []
    const best_service_time = serviceTimes.length > 0
      ? Math.min(...serviceTimes.map((t) => t.service_time_seconds!))
      : null

    // Calculate streak (consecutive days with at least 1 completed ticket)
    const streak_days = calculateStreak(allTimeData.data || [])

    return {
      agent_id: agentId,
      today_served,
      week_served,
      month_served,
      avg_rating,
      total_ratings,
      streak_days,
      best_service_time,
    }
  } catch (error) {
    console.error('Error in getAgentMetrics:', error)
    return null
  }
}

/**
 * Get achievements for a specific agent
 */
export async function getAchievements(agentId: string): Promise<Achievement[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('agent_achievements')
      .select('*')
      .eq('agent_id', agentId)
      .order('earned_at', { ascending: false })

    if (error) {
      console.error('Error fetching achievements:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAchievements:', error)
    return []
  }
}

/**
 * Check if agent qualifies for new achievements and award them
 */
export async function checkAndAwardAchievements(
  agentId: string,
  organizationId: string
): Promise<Achievement[]> {
  const supabase = createClient()

  try {
    // Get current achievements
    const existingAchievements = await getAchievements(agentId)
    const existingTypes = new Set(existingAchievements.map((a) => a.achievement_type))

    // Get agent stats
    const stats = await getAgentStatsForAchievements(agentId, organizationId)

    // Check which achievements to award
    const newAchievements: Achievement[] = []

    for (const rule of ACHIEVEMENT_RULES) {
      // Skip if already earned
      if (existingTypes.has(rule.type)) continue

      // Check if qualifies
      if (rule.check(stats)) {
        const { data, error } = await supabase
          .from('agent_achievements')
          .insert({
            agent_id: agentId,
            achievement_type: rule.type,
            achievement_name: rule.name,
            description: rule.description,
          })
          .select()
          .single()

        if (!error && data) {
          newAchievements.push(data)
        }
      }
    }

    return newAchievements
  } catch (error) {
    console.error('Error in checkAndAwardAchievements:', error)
    return []
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate consecutive days streak
 */
function calculateStreak(tickets: Array<{ completed_at: string | null }>): number {
  if (tickets.length === 0) return 0

  // Group tickets by date
  const dateSet = new Set<string>()
  tickets.forEach((ticket) => {
    if (ticket.completed_at) {
      const date = new Date(ticket.completed_at)
      date.setHours(0, 0, 0, 0)
      dateSet.add(date.toISOString())
    }
  })

  const dates = Array.from(dateSet)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())

  if (dates.length === 0) return 0

  // Calculate streak from today
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < dates.length; i++) {
    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - i)
    expectedDate.setHours(0, 0, 0, 0)

    if (dates[i].getTime() === expectedDate.getTime()) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Get agent stats for achievement evaluation
 */
async function getAgentStatsForAchievements(
  agentId: string,
  organizationId: string
): Promise<AgentStats> {
  const supabase = createClient()

  try {
    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('tickets')
      .select('service_time_seconds, rating, completed_at')
      .eq('agent_id', agentId)
      .eq('organization_id', organizationId)
      .eq('status', 'completed')

    if (error || !data) {
      return {
        total_tickets: 0,
        avg_service_time: null,
        max_rating: null,
        today_tickets: 0,
      }
    }

    const total_tickets = data.length

    // Calculate average service time
    const serviceTimes = data.filter((t) => t.service_time_seconds !== null)
    const avg_service_time = serviceTimes.length > 0
      ? serviceTimes.reduce((sum, t) => sum + (t.service_time_seconds || 0), 0) / serviceTimes.length
      : null

    // Get max rating
    const ratings = data.filter((t) => t.rating !== null)
    const max_rating = ratings.length > 0
      ? Math.max(...ratings.map((t) => t.rating!))
      : null

    // Count today's tickets
    const today_tickets = data.filter((t) => {
      if (!t.completed_at) return false
      const completedDate = new Date(t.completed_at)
      completedDate.setHours(0, 0, 0, 0)
      return completedDate.getTime() === today.getTime()
    }).length

    return {
      total_tickets,
      avg_service_time,
      max_rating,
      today_tickets,
    }
  } catch (error) {
    console.error('Error in getAgentStatsForAchievements:', error)
    return {
      total_tickets: 0,
      avg_service_time: null,
      max_rating: null,
      today_tickets: 0,
    }
  }
}

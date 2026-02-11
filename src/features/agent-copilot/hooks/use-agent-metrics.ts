'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLocalDateString } from '@/shared/utils/date'
import type { AgentMetrics } from '../types'

export function useAgentMetrics(agentId: string | null) {
  const [metrics, setMetrics] = useState<AgentMetrics>({
    todayServed: 0,
    avgServiceTime: null,
    avgRating: null,
    totalRatings: 0,
  })
  const [loading, setLoading] = useState(false)

  const fetchMetrics = useCallback(async () => {
    if (!agentId) return

    setLoading(true)
    try {
      const supabase = createClient()
      const today = getLocalDateString()

      const { data, error } = await supabase
        .from('tickets')
        .select('service_time_seconds, rating')
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00`)

      if (error) throw error

      const tickets = data || []
      const rated = tickets.filter((t) => t.rating !== null)
      const withTime = tickets.filter((t) => t.service_time_seconds !== null)

      setMetrics({
        todayServed: tickets.length,
        avgServiceTime:
          withTime.length > 0
            ? Math.round(
                withTime.reduce((sum, t) => sum + (t.service_time_seconds || 0), 0) /
                  withTime.length
              )
            : null,
        avgRating:
          rated.length > 0
            ? Math.round(
                (rated.reduce((sum, t) => sum + (t.rating || 0), 0) / rated.length) * 10
              ) / 10
            : null,
        totalRatings: rated.length,
      })
    } catch (error) {
      console.error('Error fetching agent metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  return { metrics, loading, refetch: fetchMetrics }
}

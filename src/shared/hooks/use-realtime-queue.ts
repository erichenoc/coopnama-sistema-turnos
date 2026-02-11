'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import type { TicketWithRelations } from '@/shared/types/domain'
import { getLocalDateString } from '@/shared/utils/date'

export function useRealtimeQueue(branchId: string | null) {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!branchId || branchId === 'all') {
      setLoading(false)
      return
    }

    const supabase = createClient()
    const today = getLocalDateString()

    const { data, error: fetchError } = await supabase
      .from('tickets')
      .select(`*, service:services!tickets_service_id_fkey(*), station:stations(*), agent:users(*)`)
      .eq('branch_id', branchId)
      .in('status', ['waiting', 'called', 'serving'])
      .gte('created_at', today)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setTickets((data || []) as TicketWithRelations[])
      setError(null)
    }
    setLoading(false)
  }, [branchId])

  useEffect(() => {
    fetchQueue()

    if (!branchId || branchId === 'all') return

    const supabase = createClient()

    const channel = supabase
      .channel(`queue-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          fetchQueue()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [branchId, fetchQueue])

  const waiting = tickets.filter(t => t.status === 'waiting')
  const called = tickets.filter(t => t.status === 'called')
  const serving = tickets.filter(t => t.status === 'serving')

  return { tickets, waiting, called, serving, loading, error, refresh: fetchQueue }
}

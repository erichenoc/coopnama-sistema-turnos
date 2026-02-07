'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import type { TicketWithRelations } from '@/shared/types/domain'

interface BranchQueueData {
  branchId: string
  branchName: string
  waiting: TicketWithRelations[]
  called: TicketWithRelations[]
  serving: TicketWithRelations[]
  total: number
}

export function useRealtimeOrgQueue(organizationId: string | null) {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!organizationId) return

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error: fetchError } = await supabase
      .from('tickets')
      .select(`*, service:services!tickets_service_id_fkey(*), station:stations(*), agent:users(*), branch:branches!tickets_branch_id_fkey(id, name)`)
      .eq('organization_id', organizationId)
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
  }, [organizationId])

  useEffect(() => {
    fetchQueue()

    if (!organizationId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`org-queue-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchQueue()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, fetchQueue])

  // Group tickets by branch
  const byBranch: BranchQueueData[] = []
  const branchMap = new Map<string, BranchQueueData>()

  for (const ticket of tickets) {
    const bId = ticket.branch_id
    const bName = (ticket as TicketWithRelations & { branch?: { id: string; name: string } }).branch?.name || 'Sucursal'

    if (!branchMap.has(bId)) {
      const entry: BranchQueueData = { branchId: bId, branchName: bName, waiting: [], called: [], serving: [], total: 0 }
      branchMap.set(bId, entry)
      byBranch.push(entry)
    }

    const entry = branchMap.get(bId)!
    entry.total++
    if (ticket.status === 'waiting') entry.waiting.push(ticket)
    else if (ticket.status === 'called') entry.called.push(ticket)
    else if (ticket.status === 'serving') entry.serving.push(ticket)
  }

  byBranch.sort((a, b) => a.branchName.localeCompare(b.branchName))

  const waiting = tickets.filter(t => t.status === 'waiting')
  const called = tickets.filter(t => t.status === 'called')
  const serving = tickets.filter(t => t.status === 'serving')

  return { tickets, waiting, called, serving, byBranch, loading, error, refresh: fetchQueue }
}

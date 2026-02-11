'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/components'
import { useOrg } from '@/shared/providers/org-provider'
import { resolveSLABreach } from '@/features/sla/services/sla-service'
import type { SLABreach } from '@/features/sla/services/sla-service'
import Link from 'next/link'

/**
 * COOPNAMA Sistema de Turnos
 * SLA Alerts Widget
 *
 * Dashboard component that shows real-time SLA breach alerts.
 * Subscribes to Supabase realtime for instant updates.
 */

const BREACH_COLORS = {
  warning: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  critical: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  breached: 'bg-red-500/10 text-red-300 border-red-500/20',
}

const BREACH_LABELS = {
  warning: 'Advertencia',
  critical: 'Crítico',
  breached: 'Violación',
}

export function SLAAlerts() {
  const { organizationId, branchId } = useOrg()
  const [breaches, setBreaches] = useState<SLABreach[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  // Fetch breaches from database
  const fetchBreaches = async () => {
    const supabase = createClient()

    let query = supabase
      .from('sla_breaches')
      .select(`
        *,
        ticket:tickets(
          ticket_number,
          customer_name,
          status,
          service:services(name)
        )
      `)
      .eq('organization_id', organizationId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    // Filter by branch if not viewing all branches
    if (branchId !== 'all') {
      query = query.eq('branch_id', branchId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching SLA breaches:', error)
      setLoading(false)
      return
    }

    // Sort by severity: breached > critical > warning
    const severityOrder = { breached: 3, critical: 2, warning: 1 }
    const sorted = (data || []).sort((a, b) => {
      const scoreA = severityOrder[a.breach_type as keyof typeof severityOrder] || 0
      const scoreB = severityOrder[b.breach_type as keyof typeof severityOrder] || 0
      return scoreB - scoreA
    })

    setBreaches(sorted as SLABreach[])
    setLoading(false)
  }

  // Subscribe to realtime updates
  useEffect(() => {
    fetchBreaches()

    const supabase = createClient()
    const channel = supabase
      .channel('sla-breaches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sla_breaches',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchBreaches()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [organizationId, branchId])

  // Dismiss/resolve breach
  const handleResolve = async (breachId: string) => {
    setResolving(breachId)
    try {
      await resolveSLABreach(breachId)
      // Remove from local state immediately for instant feedback
      setBreaches((prev) => prev.filter((b) => b.id !== breachId))
    } catch (error) {
      console.error('Error resolving SLA breach:', error)
    } finally {
      setResolving(null)
    }
  }

  // Calculate relative time (e.g., "hace 5 min")
  const formatRelativeTime = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin < 1) return 'hace un momento'
    if (diffMin === 1) return 'hace 1 min'
    if (diffMin < 60) return `hace ${diffMin} min`

    const diffHr = Math.floor(diffMin / 60)
    if (diffHr === 1) return 'hace 1 hora'
    if (diffHr < 24) return `hace ${diffHr} horas`

    const diffDays = Math.floor(diffHr / 24)
    if (diffDays === 1) return 'hace 1 día'
    return `hace ${diffDays} días`
  }

  // Don't render empty state
  if (!loading && breaches.length === 0) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Alertas SLA</CardTitle>
            {breaches.length > 0 && (
              <span className="px-2.5 py-0.5 bg-red-500/10 text-red-300 text-xs font-semibold rounded-full">
                {breaches.length}
              </span>
            )}
          </div>
          {breaches.length > 5 && (
            <Link
              href="/dashboard/sla"
              className="text-sm font-medium text-[#009e59] hover:underline"
            >
              Ver todo
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-[#009e59] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {breaches.slice(0, 5).map((breach) => (
              <div
                key={breach.id}
                className={`p-4 rounded-lg border ${
                  BREACH_COLORS[breach.breach_type as keyof typeof BREACH_COLORS]
                } flex items-start justify-between gap-3`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-sm">
                      {breach.ticket?.ticket_number || 'N/A'}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {BREACH_LABELS[breach.breach_type as keyof typeof BREACH_LABELS]}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-white mb-0.5">
                    {breach.ticket?.service?.name || 'Servicio desconocido'}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span>
                      Espera: <strong>{breach.wait_minutes} min</strong>
                    </span>
                    <span className="text-gray-500">•</span>
                    <span>{formatRelativeTime(breach.created_at)}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResolve(breach.id)}
                  disabled={resolving === breach.id}
                  className="shrink-0"
                >
                  {resolving === breach.id ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

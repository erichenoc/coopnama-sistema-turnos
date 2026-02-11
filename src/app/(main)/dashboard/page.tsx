'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeQueue } from '@/shared/hooks/use-realtime-queue'
import { useRealtimeOrgQueue } from '@/shared/hooks/use-realtime-org-queue'
import {
  PageHeader, StatCard, DashboardGrid,
  Card, CardHeader, CardTitle, CardContent, Button,
} from '@/shared/components'
import { StatusBadge, PriorityBadge } from '@/shared/components/badge'
import { Spinner } from '@/shared/components/spinner'
import { PRIORITY_NAME_MAP } from '@/shared/types/domain'
import type { DailyStats, BranchDailyStats } from '@/shared/types/domain'
import Link from 'next/link'
import { useOrg } from '@/shared/providers/org-provider'
import { AnomalyAlerts } from '@/features/ai/components/anomaly-alerts'
import { SLAAlerts } from '@/features/sla/components/sla-alerts'
import { SubscriptionBanner } from '@/features/billing/components/subscription-banner'

export default function DashboardPage() {
  const { branchId, organizationId } = useOrg()
  const isAllBranches = branchId === 'all'

  // Single branch hooks
  const singleQueue = useRealtimeQueue(isAllBranches ? null : branchId)
  // Org-level hooks
  const orgQueue = useRealtimeOrgQueue(isAllBranches ? organizationId : null)

  const [stats, setStats] = useState<DailyStats | null>(null)
  const [branchStats, setBranchStats] = useState<BranchDailyStats[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    if (isAllBranches) {
      const { data } = await supabase.rpc('get_org_daily_stats', {
        p_organization_id: organizationId,
        p_date: today,
      })

      if (data && data.length > 0) {
        setBranchStats(data as BranchDailyStats[])
        // Aggregate totals
        const totals: DailyStats = {
          total_tickets: 0,
          completed_tickets: 0,
          waiting_tickets: 0,
          serving_tickets: 0,
          no_show_tickets: 0,
          cancelled_tickets: 0,
          avg_wait_time_seconds: 0,
          avg_service_time_seconds: 0,
        }
        let waitTimeCount = 0
        let serviceTimeCount = 0
        for (const b of data as BranchDailyStats[]) {
          totals.total_tickets += Number(b.total_tickets)
          totals.completed_tickets += Number(b.completed_tickets)
          totals.waiting_tickets += Number(b.waiting_tickets)
          totals.serving_tickets += Number(b.serving_tickets)
          totals.no_show_tickets += Number(b.no_show_tickets)
          totals.cancelled_tickets += Number(b.cancelled_tickets)
          if (b.avg_wait_time_seconds && Number(b.avg_wait_time_seconds) > 0) {
            totals.avg_wait_time_seconds = (totals.avg_wait_time_seconds || 0) + Number(b.avg_wait_time_seconds)
            waitTimeCount++
          }
          if (b.avg_service_time_seconds && Number(b.avg_service_time_seconds) > 0) {
            totals.avg_service_time_seconds = (totals.avg_service_time_seconds || 0) + Number(b.avg_service_time_seconds)
            serviceTimeCount++
          }
        }
        if (waitTimeCount > 0) totals.avg_wait_time_seconds = (totals.avg_wait_time_seconds || 0) / waitTimeCount
        if (serviceTimeCount > 0) totals.avg_service_time_seconds = (totals.avg_service_time_seconds || 0) / serviceTimeCount
        setStats(totals)
      } else {
        setBranchStats([])
        setStats(null)
      }
    } else {
      const { data } = await supabase.rpc('get_daily_stats', {
        p_branch_id: branchId,
        p_date: today,
      })
      if (data?.[0]) {
        setStats(data[0] as DailyStats)
      }
    }
    setStatsLoading(false)
  }, [branchId, organizationId, isAllBranches])

  useEffect(() => {
    setStatsLoading(true)
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  // Pick the right queue data
  const tickets = isAllBranches ? orgQueue.tickets : singleQueue.tickets
  const waiting = isAllBranches ? orgQueue.waiting : singleQueue.waiting
  const called = isAllBranches ? orgQueue.called : singleQueue.called
  const serving = isAllBranches ? orgQueue.serving : singleQueue.serving
  const queueLoading = isAllBranches ? orgQueue.loading : singleQueue.loading
  const refresh = isAllBranches ? orgQueue.refresh : singleQueue.refresh

  const avgWaitMin = stats?.avg_wait_time_seconds
    ? (Number(stats.avg_wait_time_seconds) / 60).toFixed(1)
    : '0'

  // Total active agents across all branches
  const totalAgents = branchStats.reduce((sum, b) => sum + Number(b.active_agents), 0)

  const statCards = isAllBranches
    ? [
        {
          title: 'Total Turnos',
          value: stats?.total_tickets ?? 0,
          change: { value: stats?.completed_tickets ?? 0, label: 'completados', positive: true },
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
        },
        {
          title: 'En Espera',
          value: waiting.length,
          change: { value: called.length, label: 'llamados', positive: false },
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },
        {
          title: 'Tiempo Promedio',
          value: `${avgWaitMin} min`,
          change: { value: serving.length, label: 'atendiendo', positive: true },
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
        },
        {
          title: 'Agentes Activos',
          value: totalAgents,
          change: { value: branchStats.length, label: 'sucursales', positive: true },
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        },
      ]
    : [
        {
          title: 'Turnos Hoy',
          value: stats?.total_tickets ?? 0,
          change: { value: stats?.completed_tickets ?? 0, label: 'completados', positive: true },
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
        },
        {
          title: 'En Espera',
          value: waiting.length,
          change: { value: called.length, label: 'llamados', positive: false },
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },
        {
          title: 'Tiempo Promedio',
          value: `${avgWaitMin} min`,
          change: { value: serving.length, label: 'atendiendo', positive: true },
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
        },
        {
          title: 'No Presentados',
          value: stats?.no_show_tickets ?? 0,
          change: { value: stats?.cancelled_tickets ?? 0, label: 'cancelados', positive: false },
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
        },
      ]

  if (queueLoading && statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={isAllBranches ? 'Dashboard - Todas las Sucursales' : 'Dashboard'}
        description={isAllBranches ? 'Vista consolidada de toda la organizacion' : 'Resumen del dia - Datos en tiempo real'}
        actions={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => { refresh(); fetchStats() }}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </Button>
            {!isAllBranches && (
              <Link href="/kiosk" target="_blank">
                <Button variant="primary">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Nuevo Turno
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <SubscriptionBanner />

      <DashboardGrid columns={4} className="mb-6">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </DashboardGrid>

      <SLAAlerts />

      {!isAllBranches && (
        <div className="mb-6">
          <AnomalyAlerts />
        </div>
      )}

      {/* === ALL BRANCHES VIEW === */}
      {isAllBranches && (
        <>
          {/* Branch comparison table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Rendimiento por Sucursal</CardTitle>
            </CardHeader>
            <CardContent>
              {branchStats.length === 0 ? (
                <p className="text-center py-4 text-gray-400">No hay datos de sucursales</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08]">
                        <th className="text-left py-3 px-4 font-semibold text-gray-200">Sucursal</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-200">Turnos</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-200">Espera</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-200">Atendiendo</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-200">Completados</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-200">Prom. Espera</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-200">Agentes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchStats.map((b) => (
                        <tr key={b.branch_id} className="border-b border-white/[0.06] hover:bg-white/[0.06]">
                          <td className="py-3 px-4 font-medium text-white">{b.branch_name}</td>
                          <td className="text-center py-3 px-3">{Number(b.total_tickets)}</td>
                          <td className="text-center py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-300">
                              {Number(b.waiting_tickets)}
                            </span>
                          </td>
                          <td className="text-center py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300">
                              {Number(b.serving_tickets)}
                            </span>
                          </td>
                          <td className="text-center py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-300">
                              {Number(b.completed_tickets)}
                            </span>
                          </td>
                          <td className="text-center py-3 px-3">
                            {Number(b.avg_wait_time_seconds) > 0
                              ? `${(Number(b.avg_wait_time_seconds) / 60).toFixed(1)} min`
                              : '-'}
                          </td>
                          <td className="text-center py-3 px-3 font-medium">{Number(b.active_agents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active queues per branch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {orgQueue.byBranch.map((bq) => (
              <Card key={bq.branchId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{bq.branchName}</CardTitle>
                    <span className="px-2 py-0.5 bg-[#009e59]/10 text-[#009e59] text-xs font-medium rounded-full">
                      {bq.total} activos
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm mb-3">
                    <span className="text-yellow-400">{bq.waiting.length} esperando</span>
                    <span className="text-emerald-400">{bq.called.length} llamados</span>
                    <span className="text-green-400">{bq.serving.length} atendiendo</span>
                  </div>
                  {bq.total === 0 ? (
                    <p className="text-sm text-gray-300">Sin turnos activos</p>
                  ) : (
                    <div className="space-y-2">
                      {[...bq.serving, ...bq.called, ...bq.waiting].slice(0, 4).map((ticket) => (
                        <div
                          key={ticket.id}
                          className="flex items-center justify-between p-2 bg-white/[0.06] shadow-neu-xs rounded-neu-sm text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#009e59]">{ticket.ticket_number}</span>
                            <span className="text-gray-300">{ticket.service?.name}</span>
                          </div>
                          <StatusBadge status={ticket.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick actions for all branches */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rapidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Reportes', href: '/reports', icon: '\u{1F4CA}' },
                  { label: 'Sucursales', href: '/branches', icon: '\u{1F4CD}' },
                  { label: 'Miembros', href: '/members', icon: '\u{1F464}' },
                  { label: 'Configuracion', href: '/settings', icon: '\u{2699}\u{FE0F}' },
                ].map((action, index) => (
                  <Link
                    key={index}
                    href={action.href}
                    className="flex flex-col items-center gap-2 p-4 bg-white/[0.06] shadow-neu-sm rounded-neu-sm hover:shadow-neu-xs active:shadow-neu-inset-xs transition-all"
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <span className="font-medium text-sm text-gray-200">{action.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* === SINGLE BRANCH VIEW === */}
      {!isAllBranches && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Cola Actual</CardTitle>
                  <span className="px-3 py-1 bg-coopnama-primary/10 text-coopnama-primary text-sm font-medium rounded-full">
                    {tickets.length} activos
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-300">No hay turnos activos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.slice(0, 8).map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-4 bg-white/[0.06] shadow-neu-sm rounded-neu-sm hover:shadow-neu-xs transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-lg text-[#009e59]">{ticket.ticket_number}</span>
                          <div>
                            <p className="font-medium text-white">{ticket.customer_name || 'Sin nombre'}</p>
                            <p className="text-sm text-gray-300">{ticket.service?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <PriorityBadge priority={PRIORITY_NAME_MAP[ticket.priority]} />
                          <StatusBadge status={ticket.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/queue" className="block w-full mt-4 py-2 text-center text-emerald-400 font-medium rounded-neu-sm hover:bg-emerald-400/10 transition-colors">
                  Ver todos los turnos
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acciones Rapidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Estacion del Agente', href: '/agents', icon: '&#128227;', color: 'text-emerald-400' },
                    { label: 'Pantalla TV', href: '/tv', icon: '&#128250;', color: 'text-emerald-400' },
                    { label: 'Modo Kiosko', href: '/kiosk', icon: '&#128421;', color: 'text-emerald-400' },
                    { label: 'Gestion de Miembros', href: '/members', icon: '&#128100;', color: 'text-gray-400' },
                  ].map((action, index) => (
                    <Link
                      key={index}
                      href={action.href}
                      target={action.href === '/tv' || action.href === '/kiosk' ? '_blank' : undefined}
                      className="flex items-center gap-3 p-4 bg-white/[0.06] shadow-neu-sm rounded-neu-sm hover:shadow-neu-xs active:shadow-neu-inset-xs transition-all"
                    >
                      <span className="text-2xl" dangerouslySetInnerHTML={{ __html: action.icon }} />
                      <span className="font-medium text-gray-200">{action.label}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribucion por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Completados', value: stats?.completed_tickets ?? 0, color: 'bg-status-serving', total: stats?.total_tickets || 1 },
                    { label: 'En Espera', value: waiting.length, color: 'bg-status-waiting', total: stats?.total_tickets || 1 },
                    { label: 'Atendiendo', value: serving.length, color: 'bg-status-called', total: stats?.total_tickets || 1 },
                    { label: 'No Presentados', value: stats?.no_show_tickets ?? 0, color: 'bg-status-noshow', total: stats?.total_tickets || 1 },
                    { label: 'Cancelados', value: stats?.cancelled_tickets ?? 0, color: 'bg-status-cancelled', total: stats?.total_tickets || 1 },
                  ].map((item, index) => {
                    const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0
                    return (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-200">{item.label}</span>
                          <span className="text-sm text-gray-400">{item.value} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informacion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-[#009e59]/10 rounded-neu-sm">
                    <p className="text-sm text-gray-300">Tiempo promedio de espera</p>
                    <p className="text-2xl font-bold text-[#009e59]">{avgWaitMin} min</p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-neu-sm">
                    <p className="text-sm text-gray-300">Tiempo promedio de atencion</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {stats?.avg_service_time_seconds
                        ? (Number(stats.avg_service_time_seconds) / 60).toFixed(1)
                        : '0'} min
                    </p>
                  </div>
                  <div className="p-4 bg-white/[0.04] rounded-neu-sm">
                    <p className="text-sm text-gray-300">Total completados hoy</p>
                    <p className="text-2xl font-bold text-gray-200">{stats?.completed_tickets ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  )
}

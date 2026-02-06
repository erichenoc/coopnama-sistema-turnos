'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeQueue } from '@/shared/hooks/use-realtime-queue'
import {
  PageHeader, StatCard, DashboardGrid,
  Card, CardHeader, CardTitle, CardContent, Button,
} from '@/shared/components'
import { StatusBadge, PriorityBadge } from '@/shared/components/badge'
import { Avatar } from '@/shared/components/avatar'
import { Spinner } from '@/shared/components/spinner'
import { PRIORITY_NAME_MAP } from '@/shared/types/domain'
import type { DailyStats } from '@/shared/types/domain'
import Link from 'next/link'

const DEMO_BRANCH_ID = '00000000-0000-0000-0000-000000000001'

export default function DashboardPage() {
  const { tickets, waiting, called, serving, loading: queueLoading, refresh } = useRealtimeQueue(DEMO_BRANCH_ID)
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase.rpc('get_daily_stats', {
      p_branch_id: DEMO_BRANCH_ID,
      p_date: today,
    })

    if (data?.[0]) {
      setStats(data[0] as DailyStats)
    }
    setStatsLoading(false)
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const avgWaitMin = stats?.avg_wait_time_seconds
    ? (stats.avg_wait_time_seconds / 60).toFixed(1)
    : '0'

  const statCards = [
    {
      title: 'Turnos Hoy',
      value: stats?.total_tickets ?? 0,
      change: { value: stats?.completed_tickets ?? 0, label: 'completados', positive: true },
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      title: 'En Espera',
      value: waiting.length,
      change: { value: called.length, label: 'llamados', positive: false },
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Tiempo Promedio',
      value: `${avgWaitMin} min`,
      change: { value: serving.length, label: 'atendiendo', positive: true },
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: 'No Presentados',
      value: stats?.no_show_tickets ?? 0,
      change: { value: stats?.cancelled_tickets ?? 0, label: 'cancelados', positive: false },
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
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
        title="Dashboard"
        description="Resumen del dia - Datos en tiempo real"
        actions={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => { refresh(); fetchStats() }}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </Button>
            <Link href="/kiosk" target="_blank">
              <Button variant="primary">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nuevo Turno
              </Button>
            </Link>
          </div>
        }
      />

      <DashboardGrid columns={4} className="mb-6">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </DashboardGrid>

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
                <p className="text-gray-400">No hay turnos activos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.slice(0, 8).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 bg-neu-bg shadow-neu-sm rounded-neu-sm hover:shadow-neu-xs transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-lg text-coopnama-primary">{ticket.ticket_number}</span>
                      <div>
                        <p className="font-medium text-gray-800">{ticket.customer_name || 'Sin nombre'}</p>
                        <p className="text-sm text-gray-500">{ticket.service?.name}</p>
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
            <Link href="/queue" className="block w-full mt-4 py-2 text-center text-coopnama-primary font-medium rounded-neu-sm hover:bg-coopnama-primary/5 transition-colors">
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
                { label: 'Estacion del Agente', href: '/agents', icon: '&#128227;', color: 'text-coopnama-accent' },
                { label: 'Pantalla TV', href: '/tv', icon: '&#128250;', color: 'text-coopnama-primary' },
                { label: 'Modo Kiosko', href: '/kiosk', icon: '&#128421;', color: 'text-coopnama-secondary' },
                { label: 'Gestion de Miembros', href: '/members', icon: '&#128100;', color: 'text-gray-500' },
              ].map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  target={action.href === '/tv' || action.href === '/kiosk' ? '_blank' : undefined}
                  className="flex items-center gap-3 p-4 bg-neu-bg shadow-neu-sm rounded-neu-sm hover:shadow-neu-xs active:shadow-neu-inset-xs transition-all"
                >
                  <span className="text-2xl" dangerouslySetInnerHTML={{ __html: action.icon }} />
                  <span className="font-medium text-gray-700">{action.label}</span>
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
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <span className="text-sm text-gray-500">{item.value} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
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
              <div className="p-4 bg-coopnama-primary/5 rounded-neu-sm">
                <p className="text-sm text-gray-500">Tiempo promedio de espera</p>
                <p className="text-2xl font-bold text-coopnama-primary">{avgWaitMin} min</p>
              </div>
              <div className="p-4 bg-coopnama-secondary/5 rounded-neu-sm">
                <p className="text-sm text-gray-500">Tiempo promedio de atencion</p>
                <p className="text-2xl font-bold text-coopnama-secondary">
                  {stats?.avg_service_time_seconds
                    ? (stats.avg_service_time_seconds / 60).toFixed(1)
                    : '0'} min
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-neu-sm">
                <p className="text-sm text-gray-500">Total completados hoy</p>
                <p className="text-2xl font-bold text-gray-700">{stats?.completed_tickets ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

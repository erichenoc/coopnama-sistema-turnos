'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { AgentPerformanceTable } from '@/features/reports/components/agent-performance-table'
import { ServiceHeatmap } from '@/features/reports/components/service-heatmap'
import { PdfExportButton } from '@/features/reports/components/pdf-export-button'
import { format, subDays, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import type { PieLabelRenderProps, PieLabel } from 'recharts'
import { useOrg } from '@/shared/providers/org-provider'

const COLORS = ['#10b981', '#009e59', '#f59e0b', '#6b7280', '#ef4444']

type ReportTab = 'general' | 'agentes' | 'csat' | 'demanda'

interface Ticket {
  id: string
  created_at: string
  status: string
  service_id: string
  wait_time_seconds: number | null
  service_time_seconds: number | null
  rating: number | null
  feedback_sentiment: string | null
}

interface ServiceData {
  name: string
  count: number
}

type DateRange = 'today' | '7days' | '30days'

export default function ReportsPage() {
  const { organizationId, branchId } = useOrg()
  const [activeTab, setActiveTab] = useState<ReportTab>('general')
  const [dateRange, setDateRange] = useState<DateRange>('7days')
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [services, setServices] = useState<{ id: string; name: string }[]>([])
  const [orgName, setOrgName] = useState('COOPNAMA')

  // Data for sub-tabs
  const [agentData, setAgentData] = useState<Array<{
    user_id: string; agent_name: string; tickets_served: number;
    avg_service_minutes: number | null; avg_wait_minutes: number | null;
    avg_rating: number | null; rated_count: number; satisfied_count: number;
  }>>([])
  const [heatmapData, setHeatmapData] = useState<Array<{
    day_of_week: number; hour_of_day: number; ticket_count: number; avg_wait_minutes: number | null;
  }>>([])

  const fetchData = async (range: DateRange) => {
    setLoading(true)
    const supabase = createClient()

    const now = new Date()
    let startDate: Date

    switch (range) {
      case 'today':
        startDate = startOfDay(now)
        break
      case '7days':
        startDate = subDays(startOfDay(now), 6)
        break
      case '30days':
        startDate = subDays(startOfDay(now), 29)
        break
    }

    const [ticketsRes, servicesRes, orgRes] = await Promise.all([
      supabase
        .from('tickets')
        .select('id, created_at, status, service_id, wait_time_seconds, service_time_seconds, rating, feedback_sentiment')
        .eq('branch_id', branchId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true }),
      supabase.from('services').select('id, name').eq('organization_id', organizationId),
      supabase.from('organizations').select('name').eq('id', organizationId).single(),
    ])

    setTickets(ticketsRes.data || [])
    setServices(servicesRes.data || [])
    if (orgRes.data) setOrgName(orgRes.data.name || 'COOPNAMA')

    // Fetch advanced data
    const [agentRes, heatmapRes] = await Promise.all([
      fetch(`/api/reports/data?type=agent_performance&branch_id=${branchId}&organization_id=${organizationId}`).then(r => r.json()).catch(() => []),
      fetch(`/api/reports/data?type=heatmap&branch_id=${branchId}&organization_id=${organizationId}`).then(r => r.json()).catch(() => []),
    ])

    setAgentData(Array.isArray(agentRes) ? agentRes : [])
    setHeatmapData(Array.isArray(heatmapRes) ? heatmapRes : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData(dateRange)
  }, [dateRange])

  // Calculate summary stats
  const completedTickets = tickets.filter(t => t.status === 'completed')
  const totalTickets = tickets.length
  const avgWaitTime = completedTickets.length > 0
    ? completedTickets.reduce((acc, t) => acc + (t.wait_time_seconds || 0), 0) / completedTickets.length
    : 0
  const avgServiceTime = completedTickets.length > 0
    ? completedTickets.reduce((acc, t) => acc + (t.service_time_seconds || 0), 0) / completedTickets.length
    : 0
  const completionRate = totalTickets > 0
    ? (completedTickets.length / totalTickets) * 100
    : 0

  // Turnos por Hora (8am - 6pm)
  const ticketsByHour = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8
    const count = tickets.filter(t => new Date(t.created_at).getHours() === hour).length
    return { hour: `${hour}:00`, turnos: count }
  })

  // Distribucion por Servicio
  const ticketsByService: ServiceData[] = services.map(service => ({
    name: service.name,
    count: tickets.filter(t => t.service_id === service.id).length
  })).filter(s => s.count > 0)

  // Tendencia Semanal
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dayTickets = tickets.filter(t =>
      startOfDay(new Date(t.created_at)).getTime() === startOfDay(date).getTime()
    ).length
    return { day: format(date, 'EEE', { locale: es }), date: format(date, 'dd/MM'), turnos: dayTickets }
  })

  // Estado
  const ticketsByStatus = [
    { estado: 'Completados', cantidad: tickets.filter(t => t.status === 'completed').length, color: '#10b981' },
    { estado: 'Cancelados', cantidad: tickets.filter(t => t.status === 'cancelled').length, color: '#ef4444' },
    { estado: 'No Show', cantidad: tickets.filter(t => t.status === 'no_show').length, color: '#6b7280' },
  ]

  // CSAT data
  const ratedTickets = tickets.filter(t => t.rating !== null && t.rating > 0)
  const avgRating = ratedTickets.length > 0 ? ratedTickets.reduce((s, t) => s + (t.rating || 0), 0) / ratedTickets.length : 0
  const csatScore = ratedTickets.length > 0 ? (ratedTickets.filter(t => (t.rating || 0) >= 4).length / ratedTickets.length) * 100 : 0
  const sentimentData = [
    { name: 'Positivo', value: ratedTickets.filter(t => t.feedback_sentiment === 'positive').length, color: '#10b981' },
    { name: 'Neutral', value: ratedTickets.filter(t => t.feedback_sentiment === 'neutral' || !t.feedback_sentiment).length, color: '#6b7280' },
    { name: 'Negativo', value: ratedTickets.filter(t => t.feedback_sentiment === 'negative').length, color: '#ef4444' },
  ].filter(s => s.value > 0)
  const ratingDist = [1, 2, 3, 4, 5].map(r => ({ rating: `${r}`, count: ratedTickets.filter(t => t.rating === r).length }))

  const exportCSV = () => {
    if (tickets.length === 0) return
    const serviceMap = Object.fromEntries(services.map(s => [s.id, s.name]))
    const headers = ['Numero', 'Servicio', 'Estado', 'Creado', 'Espera (min)', 'Atencion (min)']
    const rows = tickets.map(t => [
      t.id.slice(0, 8),
      serviceMap[t.service_id] || t.service_id,
      t.status,
      new Date(t.created_at).toLocaleString('es-DO'),
      t.wait_time_seconds ? (t.wait_time_seconds / 60).toFixed(1) : '',
      t.service_time_seconds ? (t.service_time_seconds / 60).toFixed(1) : '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-turnos-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reportTabs: { id: ReportTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'agentes', label: 'Agentes' },
    { id: 'csat', label: 'CSAT' },
    { id: 'demanda', label: 'Demanda' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Reportes y Analiticas</h1>
          <p className="text-gray-400 mt-1">Visualiza el rendimiento del sistema de turnos</p>
        </div>

        <div className="flex items-center gap-3">
          <PdfExportButton
            orgName={orgName}
            dateRange={dateRange}
            totalTickets={totalTickets}
            completedTickets={completedTickets.length}
            avgWaitMinutes={avgWaitTime / 60}
            avgServiceMinutes={avgServiceTime / 60}
            completionRate={completionRate}
            agentData={agentData}
          />
          <Button variant="secondary" onClick={exportCSV} disabled={tickets.length === 0}>
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </Button>

          {/* Date Range Selector */}
          <div className="flex gap-2 bg-white/[0.06] border border-white/[0.08] p-1 rounded-lg">
            {[
              { label: 'Hoy', value: 'today' as DateRange },
              { label: '7 dias', value: '7days' as DateRange },
              { label: '30 dias', value: '30days' as DateRange }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-4 py-2 rounded-neu-xs font-medium transition-all ${
                  dateRange === option.value
                    ? 'bg-coopnama-primary text-white shadow-neu-xs'
                    : 'text-gray-600 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-neu-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white/[0.08] border border-coopnama-primary/30 text-emerald-400'
                : 'bg-white/[0.06] border border-white/[0.08] text-gray-300 hover:text-emerald-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Stats (visible on all tabs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Turnos</p>
                <p className="text-3xl font-bold text-white">{totalTickets}</p>
                <p className="text-xs text-gray-400 mt-1">{completedTickets.length} completados</p>
              </div>
              <div className="p-3 bg-coopnama-primary/10 rounded-full">
                <svg className="w-6 h-6 text-coopnama-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Tiempo Espera</p>
                <p className="text-3xl font-bold text-white">{(avgWaitTime / 60).toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-1">minutos promedio</p>
              </div>
              <div className="p-3 bg-coopnama-secondary/10 rounded-full">
                <svg className="w-6 h-6 text-coopnama-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Tiempo Atencion</p>
                <p className="text-3xl font-bold text-white">{(avgServiceTime / 60).toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-1">minutos promedio</p>
              </div>
              <div className="p-3 bg-coopnama-accent/10 rounded-full">
                <svg className="w-6 h-6 text-coopnama-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Tasa Completacion</p>
                <p className="text-3xl font-bold text-white">{completionRate.toFixed(0)}%</p>
                <p className="text-xs text-gray-400 mt-1">turnos completados</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Turnos por Hora</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ticketsByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="turnos" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Distribucion por Servicio</CardTitle></CardHeader>
            <CardContent>
              {ticketsByService.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ticketsByService}
                      cx="50%" cy="50%"
                      labelLine={false}
                      label={((props: PieLabelRenderProps) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`) as PieLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {ticketsByService.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-400">No hay datos para mostrar</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tendencia Semanal</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#f9fafb', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(value, payload) => {
                      if (payload && payload[0]) return `${payload[0].payload.day} - ${payload[0].payload.date}`
                      return value
                    }}
                  />
                  <Line type="monotone" dataKey="turnos" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Rendimiento por Estado</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ticketsByStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis type="category" dataKey="estado" stroke="#6b7280" fontSize={12} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                    {ticketsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'agentes' && (
        <AgentPerformanceTable data={agentData} />
      )}

      {activeTab === 'csat' && (
        <div className="space-y-6">
          {ratedTickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-400 mb-2">Score CSAT</p>
                  <p className={`text-5xl font-black ${csatScore >= 80 ? 'text-green-500' : csatScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                    {csatScore.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-400 mt-1">{ratedTickets.length} evaluaciones</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <svg key={star} className={`w-5 h-5 ${star <= Math.round(avgRating) ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{avgRating.toFixed(1)} promedio</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Sentimiento</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                        {sentimentData.map((entry, index) => (
                          <Cell key={`csat-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4">
                    {sentimentData.map(s => (
                      <div key={s.name} className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-gray-400">{s.name} ({s.value})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Distribucion de Ratings</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={ratingDist}>
                      <XAxis dataKey="rating" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-400 text-lg">No hay evaluaciones de clientes en este periodo</p>
                <p className="text-gray-300 text-sm mt-1">Las evaluaciones se recopilan cuando los agentes completan turnos</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'demanda' && (
        <ServiceHeatmap data={heatmapData} />
      )}
    </div>
  )
}

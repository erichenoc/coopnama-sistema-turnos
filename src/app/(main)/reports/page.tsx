'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { format, subDays, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import type { PieLabelRenderProps, PieLabel } from 'recharts'

const DEMO_BRANCH_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001'

const COLORS = ['#1e40af', '#10b981', '#f59e0b', '#6b7280', '#ef4444']

interface Ticket {
  id: string
  created_at: string
  status: string
  service_id: string
  wait_time_seconds: number | null
  service_time_seconds: number | null
}

interface ServiceData {
  name: string
  count: number
}

type DateRange = 'today' | '7days' | '30days'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('today')
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [services, setServices] = useState<{ id: string; name: string }[]>([])

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

    // Fetch tickets
    const { data: ticketsData } = await supabase
      .from('tickets')
      .select('id, created_at, status, service_id, wait_time_seconds, service_time_seconds')
      .eq('branch_id', DEMO_BRANCH_ID)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Fetch services
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name')
      .eq('organization_id', DEMO_ORG_ID)

    setTickets(ticketsData || [])
    setServices(servicesData || [])
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
    const count = tickets.filter(t => {
      const ticketHour = new Date(t.created_at).getHours()
      return ticketHour === hour
    }).length
    return {
      hour: `${hour}:00`,
      turnos: count
    }
  })

  // Distribucion por Servicio
  const ticketsByService: ServiceData[] = services.map(service => ({
    name: service.name,
    count: tickets.filter(t => t.service_id === service.id).length
  })).filter(s => s.count > 0)

  // Tendencia Semanal (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dayTickets = tickets.filter(t => {
      const ticketDate = startOfDay(new Date(t.created_at))
      return ticketDate.getTime() === startOfDay(date).getTime()
    }).length

    return {
      day: format(date, 'EEE', { locale: es }),
      date: format(date, 'dd/MM'),
      turnos: dayTickets
    }
  })

  // Rendimiento por Estado
  const ticketsByStatus = [
    {
      estado: 'Completados',
      cantidad: tickets.filter(t => t.status === 'completed').length,
      color: '#10b981'
    },
    {
      estado: 'Cancelados',
      cantidad: tickets.filter(t => t.status === 'cancelled').length,
      color: '#ef4444'
    },
    {
      estado: 'No Show',
      cantidad: tickets.filter(t => t.status === 'no_show').length,
      color: '#6b7280'
    }
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
          <h1 className="text-3xl font-bold text-gray-800">Reportes y Analiticas</h1>
          <p className="text-gray-500 mt-1">Visualiza el rendimiento del sistema de turnos</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2 bg-neu-bg p-1 rounded-neu-sm shadow-neu-sm">
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
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Turnos</p>
                <p className="text-3xl font-bold text-gray-800">{totalTickets}</p>
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
                <p className="text-sm text-gray-500 mb-1">Tiempo Espera</p>
                <p className="text-3xl font-bold text-gray-800">{(avgWaitTime / 60).toFixed(1)}</p>
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
                <p className="text-sm text-gray-500 mb-1">Tiempo Atencion</p>
                <p className="text-3xl font-bold text-gray-800">{(avgServiceTime / 60).toFixed(1)}</p>
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
                <p className="text-sm text-gray-500 mb-1">Tasa Completacion</p>
                <p className="text-3xl font-bold text-gray-800">{completionRate.toFixed(0)}%</p>
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turnos por Hora */}
        <Card>
          <CardHeader>
            <CardTitle>Turnos por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketsByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="turnos" fill="#1e40af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribucion por Servicio */}
        <Card>
          <CardHeader>
            <CardTitle>Distribucion por Servicio</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketsByService.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ticketsByService}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={((props: PieLabelRenderProps) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`) as PieLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {ticketsByService.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#f9fafb', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tendencia Semanal */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      return `${payload[0].payload.day} - ${payload[0].payload.date}`
                    }
                    return value
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="turnos"
                  stroke="#1e40af"
                  strokeWidth={2}
                  dot={{ fill: '#1e40af', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rendimiento por Estado */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketsByStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis type="category" dataKey="estado" stroke="#6b7280" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
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
    </div>
  )
}

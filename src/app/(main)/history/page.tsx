'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/components'
import { StatusBadge, PriorityBadge } from '@/shared/components/badge'
import { Spinner } from '@/shared/components/spinner'
import { format, subDays, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { PRIORITY_NAME_MAP } from '@/shared/types/domain'

const DEMO_BRANCH_ID = '00000000-0000-0000-0000-000000000001'

interface TicketRecord {
  id: string
  ticket_number: string
  customer_name: string | null
  customer_cedula: string | null
  customer_phone: string | null
  status: string
  priority: number
  source: string
  notes: string | null
  created_at: string
  called_at: string | null
  started_at: string | null
  completed_at: string | null
  wait_time_seconds: number | null
  service_time_seconds: number | null
  recall_count: number
  rating: number | null
  feedback_comment: string | null
  service: { id: string; name: string; code: string } | null
  station: { id: string; name: string; station_number: number } | null
  agent: { id: string; full_name: string } | null
}

type DateRange = 'today' | '7days' | '30days' | 'all'
type StatusFilter = 'all' | 'completed' | 'cancelled' | 'no_show'

export default function HistoryPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('today')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)
  const [services, setServices] = useState<{ id: string; name: string }[]>([])
  const [serviceFilter, setServiceFilter] = useState<string>('all')

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const now = new Date()
    let startDate: Date | null = null

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now)
        break
      case '7days':
        startDate = subDays(startOfDay(now), 6)
        break
      case '30days':
        startDate = subDays(startOfDay(now), 29)
        break
      case 'all':
        startDate = null
        break
    }

    let query = supabase
      .from('tickets')
      .select('*, service:services!tickets_service_id_fkey(id, name, code), station:stations(id, name, station_number), agent:users(id, full_name)')
      .eq('branch_id', DEMO_BRANCH_ID)
      .in('status', ['completed', 'cancelled', 'no_show'])
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (serviceFilter !== 'all') {
      query = query.eq('service_id', serviceFilter)
    }

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('Error fetching history:', error)
    } else {
      setTickets((data || []) as TicketRecord[])
    }
    setLoading(false)
  }, [dateRange, statusFilter, serviceFilter])

  // Fetch services for filter
  useEffect(() => {
    const fetchServices = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('services')
        .select('id, name')
        .eq('organization_id', '00000000-0000-0000-0000-000000000001')
        .eq('is_active', true)
        .order('name')
      setServices(data || [])
    }
    fetchServices()
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Client-side search filter
  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      t.ticket_number.toLowerCase().includes(q) ||
      (t.customer_name || '').toLowerCase().includes(q) ||
      (t.customer_cedula || '').toLowerCase().includes(q) ||
      (t.customer_phone || '').toLowerCase().includes(q)
    )
  })

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}s`
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`
  }

  const statusLabel: Record<string, string> = {
    completed: 'Completado',
    cancelled: 'Cancelado',
    no_show: 'No se presento',
  }

  // Summary stats
  const completed = tickets.filter(t => t.status === 'completed').length
  const cancelled = tickets.filter(t => t.status === 'cancelled').length
  const noShow = tickets.filter(t => t.status === 'no_show').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Historial de Atenciones</h1>
          <p className="text-gray-500">Registro completo de todos los turnos procesados</p>
        </div>
        <Button variant="ghost" onClick={fetchTickets}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 rounded-neu-sm shadow-neu-xs text-center">
          <p className="text-3xl font-bold text-green-600">{completed}</p>
          <p className="text-sm text-gray-600">Completados</p>
        </div>
        <div className="p-4 bg-red-50 rounded-neu-sm shadow-neu-xs text-center">
          <p className="text-3xl font-bold text-red-500">{cancelled}</p>
          <p className="text-sm text-gray-600">Cancelados</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-neu-sm shadow-neu-xs text-center">
          <p className="text-3xl font-bold text-gray-500">{noShow}</p>
          <p className="text-sm text-gray-600">No se presentaron</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Periodo</label>
              <div className="flex gap-1 bg-neu-bg p-1 rounded-neu-xs shadow-neu-xs">
                {[
                  { label: 'Hoy', value: 'today' as DateRange },
                  { label: '7 dias', value: '7days' as DateRange },
                  { label: '30 dias', value: '30days' as DateRange },
                  { label: 'Todo', value: 'all' as DateRange },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setDateRange(option.value)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      dateRange === option.value
                        ? 'bg-coopnama-primary text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2 bg-neu-bg shadow-neu-xs rounded-neu-xs text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
              >
                <option value="all">Todos</option>
                <option value="completed">Completados</option>
                <option value="cancelled">Cancelados</option>
                <option value="no_show">No se presentaron</option>
              </select>
            </div>

            {/* Service Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Servicio</label>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-3 py-2 bg-neu-bg shadow-neu-xs rounded-neu-xs text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
              >
                <option value="all">Todos</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre, cedula o numero de turno..."
                className="w-full px-3 py-2 bg-neu-bg shadow-neu-inset-xs rounded-neu-xs text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {filteredTickets.length} {filteredTickets.length === 1 ? 'registro' : 'registros'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl block mb-4">&#128203;</span>
              <p className="text-gray-500 text-lg">No hay registros para los filtros seleccionados</p>
              <p className="text-gray-400 text-sm mt-1">Prueba cambiando el periodo o los filtros</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id}>
                  {/* Ticket Row */}
                  <button
                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                    className="w-full flex items-center gap-4 p-4 bg-neu-bg shadow-neu-xs rounded-neu-sm hover:shadow-neu-sm transition-shadow text-left"
                  >
                    {/* Ticket Number */}
                    <span className="font-mono font-bold text-lg text-coopnama-primary min-w-[70px]">
                      {ticket.ticket_number}
                    </span>

                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {ticket.customer_name || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {ticket.service?.name || '-'}
                        {ticket.station ? ` · ${ticket.station.name}` : ''}
                      </p>
                    </div>

                    {/* Agent */}
                    <div className="hidden sm:block text-right min-w-[120px]">
                      <p className="text-sm text-gray-600 truncate">{ticket.agent?.full_name || '-'}</p>
                      <p className="text-xs text-gray-400">Agente</p>
                    </div>

                    {/* Times */}
                    <div className="hidden md:block text-right min-w-[80px]">
                      <p className="text-sm text-gray-600">{formatDuration(ticket.wait_time_seconds)}</p>
                      <p className="text-xs text-gray-400">Espera</p>
                    </div>
                    <div className="hidden md:block text-right min-w-[80px]">
                      <p className="text-sm text-gray-600">{formatDuration(ticket.service_time_seconds)}</p>
                      <p className="text-xs text-gray-400">Atencion</p>
                    </div>

                    {/* Status & Date */}
                    <div className="text-right min-w-[100px]">
                      <StatusBadge status={ticket.status as 'completed' | 'cancelled' | 'no_show'} />
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(ticket.completed_at || ticket.created_at), 'dd/MM HH:mm', { locale: es })}
                      </p>
                    </div>

                    {/* Expand Icon */}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedTicket === ticket.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded Details */}
                  {expandedTicket === ticket.id && (
                    <div className="mx-4 mb-2 p-4 bg-white border border-gray-100 rounded-b-lg shadow-inner">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Cliente</p>
                          <p className="font-medium">{ticket.customer_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Cedula</p>
                          <p className="font-medium">{ticket.customer_cedula || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Telefono</p>
                          <p className="font-medium">{ticket.customer_phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Prioridad</p>
                          <PriorityBadge priority={PRIORITY_NAME_MAP[ticket.priority as 0 | 1 | 2 | 3]} />
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Origen</p>
                          <p className="font-medium capitalize">{ticket.source}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Creado</p>
                          <p className="font-medium">{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Llamado</p>
                          <p className="font-medium">{ticket.called_at ? format(new Date(ticket.called_at), 'HH:mm:ss') : '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Finalizado</p>
                          <p className="font-medium">{ticket.completed_at ? format(new Date(ticket.completed_at), 'HH:mm:ss') : '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Tiempo Espera</p>
                          <p className="font-medium">{formatDuration(ticket.wait_time_seconds)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Tiempo Atencion</p>
                          <p className="font-medium">{formatDuration(ticket.service_time_seconds)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Rellamadas</p>
                          <p className="font-medium">{ticket.recall_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Calificacion</p>
                          <p className="font-medium">
                            {ticket.rating ? '★'.repeat(ticket.rating) + '☆'.repeat(5 - ticket.rating) : '-'}
                          </p>
                        </div>
                      </div>
                      {ticket.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-400 text-xs mb-1">Notas</p>
                          <p className="text-sm text-gray-700">{ticket.notes}</p>
                        </div>
                      )}
                      {ticket.feedback_comment && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                          <p className="text-gray-400 text-xs mb-1">Comentario del cliente</p>
                          <p className="text-sm text-gray-700">{ticket.feedback_comment}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Spinner,
  EmptyState,
} from '@/shared/components'
import { StatusBadge } from '@/shared/components/badge'
import type { TicketStatus, TicketHistory } from '@/shared/types/domain'
import { useOrg } from '@/shared/providers/org-provider'
import { ArrowRight, Search, Calendar, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ============================================
// TYPES
// ============================================

interface HistoryEntry extends TicketHistory {
  ticket?: {
    id: string
    ticket_number: string
    branch_id: string
  } | null
  user?: {
    id: string
    full_name: string
  } | null
  station?: {
    id: string
    name: string
  } | null
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AuditPage() {
  const { branchId } = useOrg()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  })
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // FETCH HISTORY
  // ============================================

  async function fetchHistory(offset = 0) {
    try {
      const supabase = createClient()

      // Get ticket IDs for current branch
      const { data: branchTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id')
        .eq('branch_id', branchId)

      if (ticketsError) throw ticketsError

      const ticketIds = branchTickets?.map((t) => t.id) || []

      if (ticketIds.length === 0) {
        setHistory([])
        setHasMore(false)
        setLoading(false)
        return
      }

      // Fetch history for these tickets
      const { data, error: historyError } = await supabase
        .from('ticket_history')
        .select(
          `
          *,
          ticket:tickets(id, ticket_number, branch_id),
          user:users(id, full_name),
          station:stations(id, name)
        `
        )
        .in('ticket_id', ticketIds)
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)
        .order('created_at', { ascending: false })
        .range(offset, offset + 49)

      if (historyError) throw historyError

      const newHistory = (data as HistoryEntry[]) || []

      if (offset === 0) {
        setHistory(newHistory)
      } else {
        setHistory((prev) => [...prev, ...newHistory])
      }

      setHasMore(newHistory.length === 50)
      setError(null)
    } catch (err) {
      console.error('Error fetching history:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar historial')
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (branchId) {
      setLoading(true)
      fetchHistory(0)
    }
  }, [branchId, dateRange])

  // ============================================
  // HANDLERS
  // ============================================

  function handleLoadMore() {
    setLoadingMore(true)
    fetchHistory(history.length)
  }

  function handleDateChange(field: 'start' | 'end', value: string) {
    setDateRange((prev) => ({ ...prev, [field]: value }))
  }

  // ============================================
  // FILTERING
  // ============================================

  const filteredHistory = history.filter((entry) => {
    if (!searchQuery) return true
    const ticketNumber = entry.ticket?.ticket_number || ''
    return ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // ============================================
  // RENDER HELPERS
  // ============================================

  function formatDateTime(dateString: string) {
    return format(new Date(dateString), "d MMM yyyy 'a las' HH:mm", { locale: es })
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neu-bg p-4 md:p-6">
      {/* Header */}
      <PageHeader
        title="Auditoría de Cambios"
        description="Historial completo de cambios de estado de turnos"
      />

      {/* Filters */}
      <Card className="mb-6 shadow-neu">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por número de turno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Start Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="pl-10"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card className="shadow-neu">
        <CardHeader>
          <CardTitle>
            Cambios de Estado ({filteredHistory.length} registro
            {filteredHistory.length !== 1 ? 's' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title="No hay registros"
              description="No se encontraron cambios de estado en el rango seleccionado"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Fecha/Hora
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Turno
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Cambio
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Usuario
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Ventanilla
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {/* Date/Time */}
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDateTime(entry.created_at)}
                      </td>

                      {/* Ticket Number */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-sm">
                          {entry.ticket?.ticket_number || 'N/A'}
                        </span>
                      </td>

                      {/* Status Change */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {entry.previous_status && (
                            <>
                              <StatusBadge
                                status={entry.previous_status as TicketStatus}
                                size="sm"
                              />
                              <ArrowRight className="h-3 w-3 text-gray-400" />
                            </>
                          )}
                          <StatusBadge
                            status={entry.new_status as TicketStatus}
                            size="sm"
                          />
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {entry.user?.full_name || (
                          <span className="text-gray-400 italic">Sistema</span>
                        )}
                      </td>

                      {/* Station */}
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {entry.station?.name || (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {entry.notes ? (
                          <span className="max-w-xs truncate block" title={entry.notes}>
                            {entry.notes}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More */}
          {hasMore && filteredHistory.length > 0 && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                variant="secondary"
                className="shadow-neu-sm"
              >
                {loadingMore ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Cargando...
                  </>
                ) : (
                  'Cargar más'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

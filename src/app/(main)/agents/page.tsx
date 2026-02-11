'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/components'
import { StatusBadge, PriorityBadge } from '@/shared/components/badge'
import { Spinner } from '@/shared/components/spinner'
import { createClient } from '@/lib/supabase/client'
import { callNextTicketAction, startServingAction, completeTicketAction, markNoShowAction } from '@/lib/actions/tickets'
import { useRealtimeQueue } from '@/shared/hooks/use-realtime-queue'
import { useTicketAnnouncer } from '@/shared/hooks/use-ticket-announcer'
import { PRIORITY_NAME_MAP } from '@/shared/types/domain'
import type { TicketWithRelations, Station, Service, Priority } from '@/shared/types/domain'
import { useOrg } from '@/shared/providers/org-provider'
import { FeedbackModal } from '@/features/feedback/components/feedback-modal'
import { CopilotPanel } from '@/features/agent-copilot/components/copilot-panel'

export default function AgentWorkstationPage() {
  const { organizationId, branchId, agentId: orgAgentId } = useOrg()
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [currentTicket, setCurrentTicket] = useState<TicketWithRelations | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [serviceTimer, setServiceTimer] = useState(0)
  const [notes, setNotes] = useState('')
  const [agentId, setAgentId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const { waiting, called, refresh } = useRealtimeQueue(branchId)
  const { announce } = useTicketAnnouncer()
  const [services, setServices] = useState<Service[]>([])
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferServiceId, setTransferServiceId] = useState<string>('')
  const [transferReason, setTransferReason] = useState('')
  const [feedbackTicket, setFeedbackTicket] = useState<{ id: string; number: string } | null>(null)

  // Get current authenticated user ID
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setAgentId(user.id)
    }
    getUser()
  }, [])

  // Fetch stations and services
  useEffect(() => {
    const supabase = createClient()
    const fetchStations = async () => {
      const { data } = await supabase
        .from('stations')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('station_number')
      setStations((data || []) as Station[])
      if (data && data.length > 0 && !selectedStation) {
        setSelectedStation(data[0].id)
      }
    }
    const fetchServices = async () => {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      setServices((data || []) as Service[])
    }
    fetchStations()
    fetchServices()
  }, [branchId, selectedStation])

  // Service timer
  useEffect(() => {
    if (!currentTicket || currentTicket.status !== 'serving') return
    const interval = setInterval(() => setServiceTimer(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [currentTicket])

  // Fetch current ticket for station
  const fetchCurrentTicket = useCallback(async () => {
    if (!selectedStation) return
    const supabase = createClient()
    const { data } = await supabase
      .from('tickets')
      .select('*, service:services!tickets_service_id_fkey(*), station:stations(*), agent:users(*)')
      .eq('station_id', selectedStation)
      .in('status', ['called', 'serving'])
      .order('called_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setCurrentTicket(data as TicketWithRelations | null)
    if (data?.status === 'serving' && data.started_at) {
      setServiceTimer(Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000))
    }
  }, [selectedStation])

  useEffect(() => { fetchCurrentTicket() }, [fetchCurrentTicket])

  const handleCallNext = async () => {
    if (!agentId) {
      setActionError('No se pudo identificar al agente. Recarga la pagina.')
      return
    }
    if (!selectedStation) {
      setActionError('No hay ventanilla seleccionada. Configura una ventanilla primero.')
      return
    }
    setActionLoading('call')
    setActionError(null)
    const result = await callNextTicketAction(selectedStation, agentId)
    if (result.error) {
      setActionError(result.error)
    } else if (result.data) {
      const ticket = result.data as TicketWithRelations
      setCurrentTicket(ticket)

      // Announce the ticket call via Inworld TTS
      const station = stations.find(s => s.id === selectedStation)
      const stationName = station?.name || `Ventanilla ${station?.station_number}`
      announce({
        ticketNumber: ticket.ticket_number,
        stationName,
        customerName: ticket.customer_name,
      })
    }
    refresh()
    setActionLoading(null)
  }

  const handleStartServing = async () => {
    if (!currentTicket || !agentId) return
    setActionLoading('start')
    setActionError(null)
    const result = await startServingAction(currentTicket.id, agentId)
    if (result.error) {
      setActionError(result.error)
    } else if (result.data) {
      setCurrentTicket(result.data as TicketWithRelations)
      setServiceTimer(0)
    }
    setActionLoading(null)
  }

  const handleComplete = async () => {
    if (!currentTicket || !agentId) return
    setActionLoading('complete')
    setActionError(null)
    const result = await completeTicketAction(currentTicket.id, agentId, notes || undefined)
    if (result.error) {
      setActionError(result.error)
    } else {
      // Show feedback modal before clearing ticket
      setFeedbackTicket({ id: currentTicket.id, number: currentTicket.ticket_number })
      setCurrentTicket(null)
      setServiceTimer(0)
      setNotes('')
    }
    refresh()
    setActionLoading(null)
  }

  const handleNoShow = async () => {
    if (!currentTicket || !agentId) return
    setActionLoading('noshow')
    setActionError(null)
    const result = await markNoShowAction(currentTicket.id, agentId)
    if (result.error) {
      setActionError(result.error)
    } else {
      setCurrentTicket(null)
      setServiceTimer(0)
    }
    refresh()
    setActionLoading(null)
  }

  const handleRecall = () => {
    if (!currentTicket || !selectedStation) return
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || `Ventanilla ${station?.station_number}`
    announce({
      ticketNumber: currentTicket.ticket_number,
      stationName,
      customerName: currentTicket.customer_name,
    })
  }

  const handleTransfer = async () => {
    if (!currentTicket || !agentId || !transferServiceId) return
    setActionLoading('transfer')
    setActionError(null)

    try {
      const response = await fetch('/api/tickets/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: currentTicket.id,
          newServiceId: transferServiceId,
          reason: transferReason || undefined,
          agentId,
        }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        setActionError(error || 'Error al transferir')
      } else {
        setCurrentTicket(null)
        setServiceTimer(0)
        setNotes('')
        setShowTransfer(false)
        setTransferServiceId('')
        setTransferReason('')
      }
    } catch {
      setActionError('Error de conexion al transferir')
    }

    refresh()
    setActionLoading(null)
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Estacion del Agente</h1>
          <p className="text-gray-400">Atiende los turnos desde tu ventanilla</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-300">Ventanilla:</label>
          <select
            value={selectedStation || ''}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="px-4 py-2 bg-white/[0.06] shadow-neu-xs rounded-neu-sm text-gray-200 focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name} (#{s.station_number})</option>
            ))}
          </select>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-300 ml-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Panel - Current Ticket */}
        <div className="lg:col-span-2 space-y-6">
          {/* Call Next Button */}
          {!currentTicket && (
            <div className="text-center py-12">
              {stations.length === 0 ? (
                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <svg className="w-12 h-12 text-amber-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-amber-300 font-medium">No hay ventanillas configuradas para esta sucursal</p>
                  <p className="text-amber-300 text-sm mt-1">Configura ventanillas desde el panel de administracion</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading === 'call' || waiting.length === 0 || !agentId || !selectedStation}
                    className={`
                      inline-flex items-center justify-center gap-3
                      px-12 py-6
                      bg-coopnama-primary text-white
                      text-2xl font-bold
                      rounded-neu-lg shadow-neu-lg
                      hover:bg-[#008a4e] active:shadow-neu-inset
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {actionLoading === 'call' ? (
                      <Spinner size="md" />
                    ) : (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    )}
                    Llamar Siguiente
                  </button>
                  <p className="mt-4 text-gray-500">{waiting.length} turnos en espera</p>
                </>
              )}
            </div>
          )}

          {/* Current Ticket Display */}
          {currentTicket && (
            <Card className="border-2 border-coopnama-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Turno Actual</CardTitle>
                  {currentTicket.status === 'serving' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-status-serving/10 rounded-full">
                      <span className="w-2 h-2 bg-status-serving rounded-full animate-pulse" />
                      <span className="font-mono font-bold text-status-serving text-lg">{formatTimer(serviceTimer)}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <span className="font-mono font-bold text-6xl text-coopnama-primary block mb-2">
                    {currentTicket.ticket_number}
                  </span>
                  <p className="text-xl text-gray-200">{currentTicket.customer_name || 'Sin nombre'}</p>
                  <p className="text-gray-400">{currentTicket.service?.name}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <StatusBadge status={currentTicket.status} />
                    <PriorityBadge priority={PRIORITY_NAME_MAP[currentTicket.priority]} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 justify-center">
                  {currentTicket.status === 'called' && (
                    <>
                      <Button variant="primary" size="lg" isLoading={actionLoading === 'start'} onClick={handleStartServing}>
                        Iniciar Atencion
                      </Button>
                      <Button variant="secondary" onClick={handleRecall}>
                        Re-llamar
                      </Button>
                    </>
                  )}
                  {currentTicket.status === 'serving' && (
                    <>
                      <Button variant="primary" size="lg" isLoading={actionLoading === 'complete'} onClick={handleComplete}>
                        Completar
                      </Button>
                      <Button variant="secondary" onClick={() => setShowTransfer(!showTransfer)}>
                        Transferir
                      </Button>
                    </>
                  )}
                  <Button variant="danger" isLoading={actionLoading === 'noshow'} onClick={handleNoShow}>
                    No se Presento
                  </Button>
                </div>

                {/* Transfer Panel */}
                {showTransfer && currentTicket.status === 'serving' && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-3">
                    <p className="text-sm font-medium text-amber-300">Transferir a otro servicio</p>
                    <select
                      value={transferServiceId}
                      onChange={(e) => setTransferServiceId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900/95 border border-amber-500/20 rounded text-sm"
                    >
                      <option value="">Seleccionar servicio...</option>
                      {services
                        .filter(s => s.id !== currentTicket.service_id)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))
                      }
                    </select>
                    <input
                      type="text"
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      placeholder="Razon de transferencia (opcional)"
                      className="w-full px-3 py-2 bg-slate-900/95 border border-amber-500/20 rounded text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={actionLoading === 'transfer'}
                        onClick={handleTransfer}
                        disabled={!transferServiceId}
                      >
                        Confirmar Transferencia
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setShowTransfer(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {currentTicket.status === 'serving' && (
                  <div className="mt-4">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas del servicio..."
                      rows={2}
                      className="w-full px-4 py-3 bg-white/[0.06] shadow-neu-inset-xs rounded-neu-sm text-gray-200 text-sm focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 placeholder:text-gray-500"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Panel - Queue Preview */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Proximos en Cola ({waiting.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {waiting.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Cola vacia</p>
              ) : (
                <div className="space-y-2">
                  {waiting.slice(0, 8).map((ticket, i) => (
                    <div key={ticket.id} className="flex items-center gap-3 p-3 rounded-neu-sm hover:bg-white/[0.06] transition-colors">
                      <span className="text-sm text-gray-400 w-5">{i + 1}</span>
                      <span className="font-mono font-bold text-coopnama-primary">{ticket.ticket_number}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{ticket.customer_name || '-'}</p>
                        <p className="text-xs text-gray-400">{ticket.service?.name}</p>
                      </div>
                      <PriorityBadge priority={PRIORITY_NAME_MAP[ticket.priority]} />
                    </div>
                  ))}
                  {waiting.length > 8 && (
                    <p className="text-center text-sm text-gray-400 pt-2">+{waiting.length - 8} mas</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Copilot Panel */}
          <div className="mt-6">
            <CopilotPanel
              ticket={currentTicket}
              notes={notes}
              callbacks={{
                onAppendToNotes: (text: string) =>
                  setNotes((prev) => (prev ? `${prev}\n${text}` : text)),
                onReplaceNotes: (text: string) => setNotes(text),
                onTriggerTransfer: (serviceId: string, reason: string) => {
                  setTransferServiceId(serviceId)
                  setTransferReason(reason)
                  setShowTransfer(true)
                },
                onTriggerComplete: (summary: string) => {
                  setNotes(summary)
                  handleComplete()
                },
                onEscalatePriority: async (newPriority: Priority) => {
                  if (!currentTicket) return
                  const supabase = createClient()
                  await supabase
                    .from('tickets')
                    .update({ priority: newPriority })
                    .eq('id', currentTicket.id)
                  setCurrentTicket((prev) =>
                    prev ? { ...prev, priority: newPriority } : null
                  )
                },
              }}
              context={{
                organizationId,
                branchId,
                agentId: agentId || orgAgentId,
                waitingCount: waiting.length,
                serviceTimerSeconds: serviceTimer,
                services,
              }}
            />
          </div>
        </div>
      </div>

      {/* Feedback Modal - shown after completing a ticket */}
      {feedbackTicket && (
        <FeedbackModal
          isOpen={!!feedbackTicket}
          onClose={() => setFeedbackTicket(null)}
          ticketId={feedbackTicket.id}
          ticketNumber={feedbackTicket.number}
        />
      )}
    </>
  )
}

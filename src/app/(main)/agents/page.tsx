'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/components'
import { StatusBadge, PriorityBadge } from '@/shared/components/badge'
import { Spinner } from '@/shared/components/spinner'
import { createClient } from '@/lib/supabase/client'
import { callNextTicketAction, startServingAction, completeTicketAction, markNoShowAction } from '@/lib/actions/tickets'
import { useRealtimeQueue } from '@/shared/hooks/use-realtime-queue'
import { PRIORITY_NAME_MAP } from '@/shared/types/domain'
import type { TicketWithRelations, Station } from '@/shared/types/domain'

const DEMO_BRANCH_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_AGENT_ID = '00000000-0000-0000-0000-000000000001'

export default function AgentWorkstationPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [currentTicket, setCurrentTicket] = useState<TicketWithRelations | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [serviceTimer, setServiceTimer] = useState(0)
  const [notes, setNotes] = useState('')
  const { waiting, called, refresh } = useRealtimeQueue(DEMO_BRANCH_ID)

  // Fetch stations
  useEffect(() => {
    const fetchStations = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('stations')
        .select('*')
        .eq('branch_id', DEMO_BRANCH_ID)
        .eq('is_active', true)
        .order('station_number')
      setStations((data || []) as Station[])
      if (data && data.length > 0 && !selectedStation) {
        setSelectedStation(data[0].id)
      }
    }
    fetchStations()
  }, [selectedStation])

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
      .select('*, service:services(*), station:stations(*), agent:users(*)')
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
    if (!selectedStation) return
    setActionLoading('call')
    const result = await callNextTicketAction(selectedStation, DEMO_AGENT_ID)
    if (result.data) {
      setCurrentTicket(result.data as TicketWithRelations)
    }
    refresh()
    setActionLoading(null)
  }

  const handleStartServing = async () => {
    if (!currentTicket) return
    setActionLoading('start')
    const result = await startServingAction(currentTicket.id, DEMO_AGENT_ID)
    if (result.data) {
      setCurrentTicket(result.data as TicketWithRelations)
      setServiceTimer(0)
    }
    setActionLoading(null)
  }

  const handleComplete = async () => {
    if (!currentTicket) return
    setActionLoading('complete')
    await completeTicketAction(currentTicket.id, DEMO_AGENT_ID, notes || undefined)
    setCurrentTicket(null)
    setServiceTimer(0)
    setNotes('')
    refresh()
    setActionLoading(null)
  }

  const handleNoShow = async () => {
    if (!currentTicket) return
    setActionLoading('noshow')
    await markNoShowAction(currentTicket.id, DEMO_AGENT_ID)
    setCurrentTicket(null)
    setServiceTimer(0)
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
          <h1 className="text-2xl font-bold text-gray-800">Estacion del Agente</h1>
          <p className="text-gray-500">Atiende los turnos desde tu ventanilla</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Ventanilla:</label>
          <select
            value={selectedStation || ''}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="px-4 py-2 bg-neu-bg shadow-neu-xs rounded-neu-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name} (#{s.station_number})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Panel - Current Ticket */}
        <div className="lg:col-span-2 space-y-6">
          {/* Call Next Button */}
          {!currentTicket && (
            <div className="text-center py-12">
              <button
                onClick={handleCallNext}
                disabled={actionLoading === 'call' || waiting.length === 0}
                className={`
                  inline-flex items-center justify-center gap-3
                  px-12 py-6
                  bg-coopnama-primary text-white
                  text-2xl font-bold
                  rounded-neu-lg shadow-neu-lg
                  hover:bg-blue-700 active:shadow-neu-inset
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
                  <p className="text-xl text-gray-700">{currentTicket.customer_name || 'Sin nombre'}</p>
                  <p className="text-gray-500">{currentTicket.service?.name}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <StatusBadge status={currentTicket.status} />
                    <PriorityBadge priority={PRIORITY_NAME_MAP[currentTicket.priority]} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 justify-center">
                  {currentTicket.status === 'called' && (
                    <Button variant="primary" size="lg" isLoading={actionLoading === 'start'} onClick={handleStartServing}>
                      Iniciar Atencion
                    </Button>
                  )}
                  {currentTicket.status === 'serving' && (
                    <>
                      <Button variant="primary" size="lg" isLoading={actionLoading === 'complete'} onClick={handleComplete}>
                        Completar
                      </Button>
                    </>
                  )}
                  <Button variant="danger" isLoading={actionLoading === 'noshow'} onClick={handleNoShow}>
                    No se Presento
                  </Button>
                </div>

                {/* Notes */}
                {currentTicket.status === 'serving' && (
                  <div className="mt-4">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas del servicio..."
                      rows={2}
                      className="w-full px-4 py-3 bg-neu-bg shadow-neu-inset-xs rounded-neu-sm text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
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
                    <div key={ticket.id} className="flex items-center gap-3 p-3 rounded-neu-sm hover:bg-gray-50 transition-colors">
                      <span className="text-sm text-gray-400 w-5">{i + 1}</span>
                      <span className="font-mono font-bold text-coopnama-primary">{ticket.ticket_number}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{ticket.customer_name || '-'}</p>
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
        </div>
      </div>
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@/shared/components'
import { StatusBadge } from '@/shared/components/badge'
import { Spinner } from '@/shared/components/spinner'
import { STATUS_LABELS } from '@/shared/types/domain'
import type { TicketWithRelations, TicketStatus } from '@/shared/types/domain'
import Link from 'next/link'

export default function MiTurnoPage() {
  const [ticketNumber, setTicketNumber] = useState('')
  const [ticket, setTicket] = useState<TicketWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<number | null>(null)

  const searchTicket = async () => {
    if (!ticketNumber.trim()) return
    setLoading(true)
    setError(null)
    setTicket(null)

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error: fetchError } = await supabase
      .from('tickets')
      .select('*, service:services(*), station:stations(*)')
      .ilike('ticket_number', ticketNumber.trim().toUpperCase())
      .gte('created_at', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError || !data) {
      setError('No se encontro un turno con ese numero para hoy')
      setLoading(false)
      return
    }

    setTicket(data as TicketWithRelations)

    // Calculate position if waiting
    if (data.status === 'waiting') {
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', data.branch_id)
        .eq('status', 'waiting')
        .gte('created_at', today)
        .lt('created_at', data.created_at)

      setPosition((count || 0) + 1)
    } else {
      setPosition(null)
    }

    setLoading(false)
  }

  // Real-time updates
  useEffect(() => {
    if (!ticket) return

    const supabase = createClient()
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticket.id}`,
        },
        (payload) => {
          setTicket(prev => prev ? { ...prev, ...payload.new } as TicketWithRelations : null)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ticket?.id])

  const getStatusMessage = (status: TicketStatus): string => {
    const messages: Record<TicketStatus, string> = {
      waiting: 'Su turno esta en espera. Por favor permanezca atento.',
      called: 'Su turno ha sido llamado! Dirijase a la ventanilla indicada.',
      serving: 'Esta siendo atendido actualmente.',
      on_hold: 'Su turno esta en pausa momentaneamente.',
      transferred: 'Su turno ha sido transferido a otro servicio.',
      completed: 'Su atencion ha sido completada. Gracias por su visita!',
      cancelled: 'Este turno ha sido cancelado.',
      no_show: 'No se presento cuando fue llamado.',
    }
    return messages[status]
  }

  return (
    <div className="min-h-screen bg-neu-bg">
      {/* Header */}
      <header className="bg-coopnama-primary text-white py-6 px-8">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <span className="font-bold text-xl">COOPNAMA</span>
          </div>
          <Link href="/" className="text-blue-200 hover:text-white text-sm transition-colors">
            Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">Consultar Mi Turno</h1>
        <p className="text-gray-500 text-center mb-8">Ingrese su numero de turno para ver el estado</p>

        {/* Search Form */}
        <div className="flex gap-3 mb-8">
          <Input
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
            placeholder="Ej: A-001"
            className="font-mono text-lg"
            onKeyDown={(e) => e.key === 'Enter' && searchTicket()}
          />
          <Button variant="primary" onClick={searchTicket} isLoading={loading}>
            Buscar
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-coopnama-danger/10 border border-coopnama-danger/20 rounded-neu-sm text-center mb-6">
            <p className="text-coopnama-danger">{error}</p>
          </div>
        )}

        {/* Ticket Info */}
        {ticket && (
          <div className="bg-neu-bg shadow-neu-lg rounded-neu-lg overflow-hidden">
            {/* Status Header */}
            <div className={`p-6 text-center ${
              ticket.status === 'called' ? 'bg-status-called/20' :
              ticket.status === 'serving' ? 'bg-status-serving/20' :
              ticket.status === 'waiting' ? 'bg-status-waiting/20' :
              'bg-gray-100'
            }`}>
              <span className="font-mono font-black text-5xl text-coopnama-primary block mb-3">
                {ticket.ticket_number}
              </span>
              <StatusBadge status={ticket.status} />
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <p className="text-center text-gray-600 text-lg">{getStatusMessage(ticket.status)}</p>

              {ticket.status === 'waiting' && position !== null && (
                <div className="text-center p-4 bg-coopnama-primary/5 rounded-neu-sm">
                  <p className="text-sm text-gray-500">Posicion en la cola</p>
                  <p className="text-4xl font-bold text-coopnama-primary">{position}</p>
                </div>
              )}

              {(ticket.status === 'called' || ticket.status === 'serving') && ticket.station && (
                <div className="text-center p-4 bg-status-called/10 rounded-neu-sm">
                  <p className="text-sm text-gray-500">Dirijase a</p>
                  <p className="text-2xl font-bold text-status-called">{ticket.station.name}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-400">Servicio</p>
                  <p className="font-medium text-gray-700">{ticket.service?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Creado</p>
                  <p className="font-medium text-gray-700">
                    {new Date(ticket.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {ticket.status === 'called' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-neu-sm animate-pulse-slow">
                  <p className="text-center text-amber-800 font-semibold">
                    Es su turno! Dirijase a la ventanilla.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

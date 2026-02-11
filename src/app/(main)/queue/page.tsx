'use client'

import { useState } from 'react'
import { useRealtimeQueue } from '@/shared/hooks/use-realtime-queue'
import { cancelTicketAction } from '@/lib/actions/tickets'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/components'
import { StatusBadge, PriorityBadge } from '@/shared/components/badge'
import { Spinner } from '@/shared/components/spinner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { PRIORITY_NAME_MAP } from '@/shared/types/domain'
import { useOrg } from '@/shared/providers/org-provider'

export default function QueuePage() {
  const { branchId } = useOrg()
  const { tickets, waiting, called, serving, loading, refresh } = useRealtimeQueue(branchId)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const handleCancel = async (ticketId: string) => {
    setCancelling(ticketId)
    await cancelTicketAction(ticketId, 'Cancelado por administrador')
    refresh()
    setCancelling(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestion de Turnos</h1>
          <p className="text-gray-300">Cola en tiempo real - {tickets.length} turnos activos</p>
        </div>
        <Button variant="ghost" onClick={refresh}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-status-waiting/10 rounded-neu-sm shadow-neu-xs text-center">
          <p className="text-3xl font-bold text-status-waiting">{waiting.length}</p>
          <p className="text-sm text-gray-300">En Espera</p>
        </div>
        <div className="p-4 bg-status-called/10 rounded-neu-sm shadow-neu-xs text-center">
          <p className="text-3xl font-bold text-status-called">{called.length}</p>
          <p className="text-sm text-gray-300">Llamados</p>
        </div>
        <div className="p-4 bg-status-serving/10 rounded-neu-sm shadow-neu-xs text-center">
          <p className="text-3xl font-bold text-status-serving">{serving.length}</p>
          <p className="text-sm text-gray-300">Atendiendo</p>
        </div>
      </div>

      {/* Currently Serving */}
      {serving.length > 0 && (
        <Card className="mb-6 border-l-4 border-l-status-serving">
          <CardHeader>
            <CardTitle>Atendiendo Ahora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {serving.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-4 bg-status-serving/5 rounded-neu-sm">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-2xl text-status-serving">{ticket.ticket_number}</span>
                    <div>
                      <p className="font-medium">{ticket.customer_name || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-400">{ticket.service?.name} - {ticket.station?.name || 'Sin ventanilla'}</p>
                    </div>
                  </div>
                  <StatusBadge status="serving" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Called */}
      {called.length > 0 && (
        <Card className="mb-6 border-l-4 border-l-status-called">
          <CardHeader>
            <CardTitle>Llamados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {called.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-4 bg-status-called/5 rounded-neu-sm animate-pulse-slow">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-2xl text-status-called">{ticket.ticket_number}</span>
                    <div>
                      <p className="font-medium">{ticket.customer_name || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-400">{ticket.service?.name} - {ticket.station?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={PRIORITY_NAME_MAP[ticket.priority]} />
                    <StatusBadge status="called" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waiting Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cola de Espera ({waiting.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {waiting.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl mb-4 block">&#128522;</span>
              <p className="text-gray-300 text-lg">No hay turnos en espera</p>
              <p className="text-gray-400 text-sm mt-1">Los nuevos turnos apareceran aqui automaticamente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {waiting.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 bg-white/[0.06] shadow-neu-xs rounded-neu-sm hover:shadow-neu-sm transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 flex items-center justify-center bg-white/[0.06] rounded-full text-sm font-medium text-gray-400">
                      {index + 1}
                    </span>
                    <span className="font-mono font-bold text-xl text-[#009e59]">{ticket.ticket_number}</span>
                    <div>
                      <p className="font-medium text-white">{ticket.customer_name || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-300">{ticket.service?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(ticket.created_at), { locale: es, addSuffix: true })}
                    </span>
                    <PriorityBadge priority={PRIORITY_NAME_MAP[ticket.priority]} />
                    <button
                      onClick={() => handleCancel(ticket.id)}
                      disabled={cancelling === ticket.id}
                      className="p-2 text-gray-500 hover:text-coopnama-danger rounded-lg hover:bg-coopnama-danger/10 transition-colors"
                      title="Cancelar turno"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

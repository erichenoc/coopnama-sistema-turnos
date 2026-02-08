'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import type {
  TicketWithRelations,
  CopilotCallbacks,
  CopilotContext,
  TransferRecommendation as TRec,
} from '../types'

interface TransferRecommendationProps {
  ticket: TicketWithRelations | null
  notes: string
  callbacks: CopilotCallbacks
  context: CopilotContext
}

export function TransferRecommendation({
  ticket,
  notes,
  callbacks,
  context,
}: TransferRecommendationProps) {
  const [recommendation, setRecommendation] = useState<TRec | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchRecommendation = async () => {
    if (!ticket) return

    setLoading(true)
    try {
      const response = await fetch('/api/ai/copilot/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          serviceName: ticket.service?.name || 'N/A',
          agentNotes: notes,
          availableServices: context.services
            .filter((s) => s.id !== ticket.service_id)
            .map((s) => ({ id: s.id, name: s.name })),
        }),
      })
      const data = await response.json()
      setRecommendation(data.recommendation || null)
      setFetched(true)
    } catch (error) {
      console.error('Error fetching transfer recommendation:', error)
      setRecommendation(null)
      setFetched(true)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch when ticket is serving
  useEffect(() => {
    if (ticket?.status === 'serving' && !fetched) {
      fetchRecommendation()
    }
  }, [ticket?.id, ticket?.status])

  if (!ticket || ticket.status !== 'serving') {
    return (
      <div className="text-center text-gray-500 py-4 text-sm">
        Disponible al atender un turno
      </div>
    )
  }

  const confidenceColors = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-600',
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
        Recomendacion de Transferencia
      </h4>

      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : recommendation ? (
        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-neu-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-indigo-800 text-sm">
              {recommendation.serviceName}
            </p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                confidenceColors[recommendation.confidence]
              }`}
            >
              {recommendation.confidence === 'high'
                ? 'Alta'
                : recommendation.confidence === 'medium'
                  ? 'Media'
                  : 'Baja'}{' '}
              confianza
            </span>
          </div>
          <p className="text-xs text-indigo-600 mb-3">{recommendation.reason}</p>
          <Button
            onClick={() =>
              callbacks.onTriggerTransfer(
                recommendation.serviceId,
                recommendation.reason
              )
            }
            variant="primary"
            className="w-full text-xs"
          >
            Transferir a {recommendation.serviceName}
          </Button>
        </div>
      ) : fetched ? (
        <div className="text-center text-gray-400 py-4 text-sm">
          <p>No se sugiere transferencia para este caso</p>
          <Button
            onClick={fetchRecommendation}
            variant="secondary"
            className="mt-2 text-xs"
          >
            Analizar de nuevo
          </Button>
        </div>
      ) : null}
    </div>
  )
}

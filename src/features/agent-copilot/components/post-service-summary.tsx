'use client'

import { useState } from 'react'
import { Button } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import type { TicketWithRelations, CopilotCallbacks, CopilotContext } from '../types'

interface PostServiceSummaryProps {
  ticket: TicketWithRelations | null
  notes: string
  callbacks: CopilotCallbacks
  context: CopilotContext
}

export function PostServiceSummary({
  ticket,
  notes,
  callbacks,
  context,
}: PostServiceSummaryProps) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generateSummary = async () => {
    if (!ticket) return

    setLoading(true)
    try {
      const response = await fetch('/api/ai/copilot/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          serviceName: ticket.service?.name || 'N/A',
          customerName: ticket.customer_name,
          agentNotes: notes,
          serviceTimeSeconds: context.serviceTimerSeconds,
        }),
      })
      const data = await response.json()
      setSummary(data.summary || notes || 'Sin notas')
      setGenerated(true)
    } catch (error) {
      console.error('Error generating summary:', error)
      // Fallback to formatted notes
      const fallback = `Servicio: ${ticket.service?.name || 'N/A'}\nCliente: ${ticket.customer_name || 'N/A'}\nDuracion: ${Math.floor(context.serviceTimerSeconds / 60)}min\nNotas: ${notes || 'Sin notas'}`
      setSummary(fallback)
      setGenerated(true)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyAndComplete = () => {
    callbacks.onTriggerComplete(summary)
  }

  const handleCopyToNotes = () => {
    callbacks.onReplaceNotes(summary)
  }

  if (!ticket || ticket.status !== 'serving') {
    return (
      <div className="text-center text-gray-500 py-4 text-sm">
        Disponible al atender un turno
      </div>
    )
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
        Resumen Post-Servicio
      </h4>

      {!generated ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-3">
            Genera un resumen automatico de esta atencion
          </p>
          <Button onClick={generateSummary} variant="primary" disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Generar Resumen'}
          </Button>
        </div>
      ) : (
        <div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-neu-sm shadow-neu-inset text-sm focus:outline-none focus:ring-2 focus:ring-coopnama-primary mb-3"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCopyToNotes}
              variant="secondary"
              className="flex-1 text-xs"
            >
              Copiar a notas
            </Button>
            <Button
              onClick={handleApplyAndComplete}
              variant="primary"
              className="flex-1 text-xs"
            >
              Completar con resumen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Spinner } from '@/shared/components/spinner'
import type { TicketWithRelations, CrossSellSuggestion, CopilotContext } from '../types'

interface CrossSellSuggestionsProps {
  ticket: TicketWithRelations | null
  context: CopilotContext
}

export function CrossSellSuggestions({ ticket, context }: CrossSellSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<CrossSellSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ticket?.service?.name || ticket.status !== 'serving') return

    const fetchSuggestions = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/ai/copilot/crosssell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentServiceName: ticket.service?.name,
            memberHistory: null,
            availableServices: context.services.map((s) => s.name),
          }),
        })
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      } catch (error) {
        console.error('Error fetching cross-sell:', error)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [ticket?.id, ticket?.status])

  if (loading) {
    return (
      <div className="flex justify-center py-2">
        <Spinner size="sm" />
      </div>
    )
  }

  if (suggestions.length === 0) return null

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
        Servicios Sugeridos
      </h4>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className="bg-green-50 border border-green-200 p-2 rounded-neu-sm"
          >
            <p className="text-sm font-medium text-green-800">{s.serviceName}</p>
            <p className="text-xs text-green-600">{s.reason}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

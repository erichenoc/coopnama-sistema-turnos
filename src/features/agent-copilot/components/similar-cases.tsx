'use client'

import { useState, useEffect } from 'react'
import { Spinner } from '@/shared/components/spinner'
import type { TicketWithRelations, SimilarCase } from '../types'

interface SimilarCasesProps {
  ticket: TicketWithRelations | null
  organizationId: string
}

export function SimilarCases({ ticket, organizationId }: SimilarCasesProps) {
  const [cases, setCases] = useState<SimilarCase[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ticket?.service_id || ticket.status !== 'serving') return

    const fetchSimilar = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/ai/copilot/similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceId: ticket.service_id,
            customerName: ticket.customer_name,
            notes: ticket.notes,
            organizationId,
            limit: 5,
          }),
        })
        const data = await response.json()
        setCases(data.cases || [])
      } catch (error) {
        console.error('Error fetching similar cases:', error)
        setCases([])
      } finally {
        setLoading(false)
      }
    }

    fetchSimilar()
  }, [ticket?.id, ticket?.service_id, ticket?.status, organizationId])

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    )
  }

  if (cases.length === 0) return null

  const formatTime = (s: number | null) =>
    s ? `${Math.floor(s / 60)}m ${s % 60}s` : '-'

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
        Casos Similares Resueltos
      </h4>
      <div className="space-y-2">
        {cases.map((c) => (
          <div key={c.ticketNumber} className="bg-white/[0.06] p-2 rounded-neu-sm shadow-neu-xs">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-white">{c.serviceName}</p>
                <p className="text-xs text-gray-400">{c.date}</p>
              </div>
              <div className="text-right">
                {c.rating && (
                  <span className="text-yellow-500 text-xs">
                    {'★'.repeat(c.rating)}
                  </span>
                )}
                <p className="text-xs text-gray-400">
                  {formatTime(c.serviceTimeSeconds)}
                </p>
              </div>
            </div>
            {c.resolution && (
              <p className="text-xs text-gray-300 mt-1 italic truncate">
                {c.resolution}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

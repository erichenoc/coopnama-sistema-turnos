'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/shared/components/spinner'
import type { TicketWithRelations, MemberProfile, MemberVisit, SentimentTrend } from '../types'

interface Member360CardProps {
  ticket: TicketWithRelations | null
}

export function Member360Card({ ticket }: Member360CardProps) {
  const [member, setMember] = useState<MemberProfile | null>(null)
  const [visits, setVisits] = useState<MemberVisit[]>([])
  const [sentimentTrend, setSentimentTrend] = useState<SentimentTrend>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ticket?.member_id) {
      setMember(null)
      setVisits([])
      setSentimentTrend(null)
      return
    }

    const fetchMemberData = async () => {
      setLoading(true)
      try {
        const supabase = createClient()

        // Fetch member profile
        const { data: memberData } = await supabase
          .from('members')
          .select('id, full_name, cedula, phone, email, member_number, priority_level, priority_reason, date_of_birth, total_visits, last_visit_at, notes, created_at')
          .eq('id', ticket.member_id!)
          .single()

        if (memberData) setMember(memberData as MemberProfile)

        // Fetch visit history
        const { data: visitData } = await supabase
          .from('tickets')
          .select('ticket_number, created_at, rating, feedback_comment, feedback_sentiment, wait_time_seconds, service_time_seconds, service:service_id(name)')
          .eq('member_id', ticket.member_id!)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10)

        const typedVisits = (visitData || []) as unknown as MemberVisit[]
        setVisits(typedVisits)

        // Calculate sentiment trend from recent ratings
        const recentRatings = typedVisits
          .filter((v) => v.rating !== null)
          .slice(0, 5)
          .map((v) => v.rating!)

        if (recentRatings.length >= 2) {
          const recent = recentRatings.slice(0, Math.ceil(recentRatings.length / 2))
          const older = recentRatings.slice(Math.ceil(recentRatings.length / 2))
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
          if (recentAvg > olderAvg + 0.3) setSentimentTrend('improving')
          else if (recentAvg < olderAvg - 0.3) setSentimentTrend('declining')
          else setSentimentTrend('stable')
        }
      } catch (error) {
        console.error('Error fetching member data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMemberData()
  }, [ticket?.member_id])

  if (!ticket?.member_id) {
    return (
      <div className="text-center text-gray-300 py-8">
        No hay miembro asociado a este turno
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="md" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="text-center text-gray-300 py-8">
        No se encontro informacion del miembro
      </div>
    )
  }

  const priorityLabels: Record<number, string> = { 0: 'Normal', 1: 'Preferencial', 2: 'VIP' }
  const priorityColors: Record<number, string> = {
    0: 'bg-white/[0.06] text-gray-200',
    1: 'bg-yellow-500/10 text-yellow-300',
    2: 'bg-purple-500/10 text-purple-300',
  }

  const sentimentEmoji: Record<string, string> = {
    improving: '📈',
    stable: '➡️',
    declining: '📉',
  }

  const avgRating =
    visits.filter((v) => v.rating).length > 0
      ? Math.round(
          (visits.filter((v) => v.rating).reduce((s, v) => s + (v.rating || 0), 0) /
            visits.filter((v) => v.rating).length) *
            10
        ) / 10
      : null

  const formatTime = (s: number | null) =>
    s ? `${Math.floor(s / 60)}m ${s % 60}s` : '-'

  const renderStars = (r: number | null) =>
    r ? (
      <span className="text-yellow-500">
        {'★'.repeat(r)}
        {'☆'.repeat(5 - r)}
      </span>
    ) : (
      <span className="text-gray-300 text-xs">Sin calif.</span>
    )

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="bg-[#009e59]/10 p-4 rounded-neu-sm shadow-neu-xs">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-white">{member.full_name}</h3>
            {member.cedula && (
              <p className="text-xs text-gray-300">Cedula: {member.cedula}</p>
            )}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              priorityColors[member.priority_level] || priorityColors[0]
            }`}
          >
            {priorityLabels[member.priority_level] || 'Normal'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mt-3">
          {member.phone && (
            <div>
              <span className="text-gray-300">Tel:</span> {member.phone}
            </div>
          )}
          {member.email && (
            <div>
              <span className="text-gray-300">Email:</span> {member.email}
            </div>
          )}
          {member.member_number && (
            <div>
              <span className="text-gray-300">No.:</span> {member.member_number}
            </div>
          )}
          <div>
            <span className="text-gray-300">Visitas:</span>{' '}
            <span className="font-medium">{member.total_visits}</span>
          </div>
        </div>

        {/* Sentiment + Rating row */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#009e59]/20">
          {avgRating !== null && (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-yellow-500">★</span>
              <span className="font-medium">{avgRating}</span>
              <span className="text-xs text-gray-300">prom</span>
            </div>
          )}
          {sentimentTrend && (
            <div className="flex items-center gap-1 text-xs text-gray-300">
              <span>{sentimentEmoji[sentimentTrend]}</span>
              <span>
                {sentimentTrend === 'improving'
                  ? 'Mejorando'
                  : sentimentTrend === 'declining'
                    ? 'Declinando'
                    : 'Estable'}
              </span>
            </div>
          )}
        </div>

        {member.notes && (
          <div className="mt-2 pt-2 border-t border-[#009e59]/20">
            <p className="text-xs text-gray-300 italic">{member.notes}</p>
          </div>
        )}
      </div>

      {/* Visit History */}
      <div>
        <h4 className="text-xs font-semibold text-gray-300 uppercase mb-2">
          Historial Reciente
        </h4>
        {visits.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-4">
            No hay historial disponible
          </p>
        ) : (
          <div className="space-y-2">
            {visits.slice(0, 5).map((visit) => (
              <div
                key={visit.ticket_number}
                className="bg-white/[0.06] p-3 rounded-neu-sm shadow-neu-xs"
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="font-medium text-white text-sm">
                      {visit.service?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-300">
                      {new Date(visit.created_at).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right text-xs">{renderStars(visit.rating)}</div>
                </div>
                <div className="flex gap-4 text-xs text-gray-300">
                  <span>Espera: {formatTime(visit.wait_time_seconds)}</span>
                  <span>Servicio: {formatTime(visit.service_time_seconds)}</span>
                </div>
                {visit.feedback_comment && (
                  <p className="text-xs text-gray-300 italic mt-1">
                    &quot;{visit.feedback_comment}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

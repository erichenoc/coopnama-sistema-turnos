'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'

interface CopilotPanelProps {
  ticket: {
    id: string
    ticket_number: string
    customer_name: string | null
    status: string
    priority: number
    service_id: string
    notes?: string | null
    member_id?: string | null
    service?: { name: string } | null
  } | null
  notes: string
}

type TabType = 'suggestion' | 'history' | 'info'

interface MemberHistory {
  ticket_number: string
  service: { name: string } | null
  created_at: string
  rating: number | null
  wait_time_seconds: number | null
  service_time_seconds: number | null
}

interface KnowledgeBaseEntry {
  id: string
  title: string
  content: string
  category: string
}

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-neu-sm text-sm font-medium transition-colors ${active ? 'bg-coopnama-primary text-white shadow-neu-sm' : 'text-gray-600 hover:text-coopnama-primary'}`}>{children}</button>
)

const EmptyState = ({ text }: { text: string }) => <div className="text-center text-gray-500 py-8">{text}</div>

const LoadingState = () => <div className="flex justify-center items-center py-8"><Spinner size="md" /></div>

export function CopilotPanel({ ticket, notes }: CopilotPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('suggestion')
  const [suggestion, setSuggestion] = useState<string>('')
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)
  const [memberHistory, setMemberHistory] = useState<MemberHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeBaseEntry[]>([])
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)

  // Auto-fetch suggestion when ticket is serving
  useEffect(() => {
    if (ticket?.status === 'serving' && activeTab === 'suggestion') {
      fetchSuggestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, ticket?.status])

  // Fetch member history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && ticket?.member_id) {
      fetchMemberHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ticket?.member_id])

  const fetchSuggestion = async () => {
    if (!ticket) return

    setIsLoadingSuggestion(true)
    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: ticket.service?.name || 'Servicio no especificado',
          customerName: ticket.customer_name,
          ticketNotes: notes || ticket.notes,
          memberId: ticket.member_id
        })
      })

      const data = await response.json()
      setSuggestion(data.suggestion || 'No se pudo generar sugerencia.')
    } catch (error) {
      console.error('Error fetching suggestion:', error)
      setSuggestion('Error al obtener sugerencia. Intente nuevamente.')
    } finally {
      setIsLoadingSuggestion(false)
    }
  }

  const fetchMemberHistory = async () => {
    if (!ticket?.member_id) return

    setIsLoadingHistory(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          ticket_number,
          created_at,
          rating,
          wait_time_seconds,
          service_time_seconds,
          service:service_id(name)
        `)
        .eq('member_id', ticket.member_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setMemberHistory((data || []) as unknown as MemberHistory[])
    } catch (error) {
      console.error('Error fetching member history:', error)
      setMemberHistory([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const searchKnowledgeBase = async () => {
    if (!searchTerm.trim()) {
      setKnowledgeEntries([])
      return
    }

    setIsLoadingKnowledge(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('id, title, content, category')
        .eq('is_active', true)
        .ilike('title', `%${searchTerm}%`)
        .limit(5)

      if (error) throw error
      setKnowledgeEntries(data || [])
    } catch (error) {
      console.error('Error searching knowledge base:', error)
      setKnowledgeEntries([])
    } finally {
      setIsLoadingKnowledge(false)
    }
  }

  const formatTime = (s: number | null) => s ? `${Math.floor(s / 60)}m ${s % 60}s` : 'N/A'

  const renderStars = (r: number | null) => r ? (
    <span className="text-yellow-500">{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>
  ) : <span className="text-gray-400">Sin calificación</span>

  return (
    <Card className="bg-neu-bg shadow-neu-sm rounded-neu-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Copiloto IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tab Buttons */}
        <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2">
          <TabButton active={activeTab === 'suggestion'} onClick={() => setActiveTab('suggestion')}>Sugerencia</TabButton>
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>Historial</TabButton>
          <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')}>Info</TabButton>
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {/* Tab 1: Suggestion */}
          {activeTab === 'suggestion' && (
            <div>
              {!ticket || ticket.status !== 'serving' ? <EmptyState text="Llame un turno para recibir sugerencias" /> : isLoadingSuggestion ? <LoadingState /> : (
                <div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-neu-sm shadow-neu-inset mb-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{suggestion || 'Generando sugerencia...'}</p>
                  </div>
                  <Button onClick={fetchSuggestion} variant="secondary" className="w-full">Regenerar</Button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: History */}
          {activeTab === 'history' && (
            <div>
              {!ticket?.member_id ? <EmptyState text="No hay miembro asociado a este turno" /> : isLoadingHistory ? <LoadingState /> : memberHistory.length === 0 ? <EmptyState text="No hay historial disponible" /> : (
                <div className="space-y-3">
                  {memberHistory.map((visit) => (
                    <div
                      key={visit.ticket_number}
                      className="bg-gray-50 p-3 rounded-neu-sm shadow-neu-xs"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-800">
                            {visit.service?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(visit.created_at).toLocaleDateString('es-DO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          {renderStars(visit.rating)}
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span>Espera: {formatTime(visit.wait_time_seconds)}</span>
                        <span>Servicio: {formatTime(visit.service_time_seconds)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Knowledge Base */}
          {activeTab === 'info' && (
            <div>
              <div className="mb-4">
                <div className="flex gap-2">
                  <input type="text" placeholder="Buscar en base de conocimiento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchKnowledgeBase()} className="flex-1 px-3 py-2 rounded-neu-sm shadow-neu-inset text-sm focus:outline-none focus:ring-2 focus:ring-coopnama-primary" />
                  <Button onClick={searchKnowledgeBase} variant="primary" disabled={isLoadingKnowledge}>{isLoadingKnowledge ? <Spinner size="sm" /> : 'Buscar'}</Button>
                </div>
              </div>

              {knowledgeEntries.length === 0 && !isLoadingKnowledge ? <EmptyState text={searchTerm ? 'No se encontraron resultados' : 'Busca en la base de conocimiento'} /> : (
                <div className="space-y-2">
                  {knowledgeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-gray-50 rounded-neu-sm shadow-neu-xs overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedEntryId(
                            expandedEntryId === entry.id ? null : entry.id
                          )
                        }
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">
                              {entry.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {entry.category}
                            </p>
                          </div>
                          <span className="text-gray-400">
                            {expandedEntryId === entry.id ? '▼' : '▶'}
                          </span>
                        </div>
                      </button>
                      {expandedEntryId === entry.id && (
                        <div className="px-3 py-2 bg-white border-t border-gray-200">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {entry.content}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

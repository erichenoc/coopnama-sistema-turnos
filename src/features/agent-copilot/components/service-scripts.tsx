'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import type { TicketWithRelations, CopilotContext, KnowledgeEntry } from '../types'

interface ServiceScriptsProps {
  ticket: TicketWithRelations | null
  context: CopilotContext
}

export function ServiceScripts({ ticket, context }: ServiceScriptsProps) {
  const [procedures, setProcedures] = useState<KnowledgeEntry[]>([])
  const [searchResults, setSearchResults] = useState<KnowledgeEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false)
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Auto-fetch procedures for current service
  useEffect(() => {
    if (!ticket?.service_id || !context.organizationId) return

    const fetchProcedures = async () => {
      setIsLoadingProcedures(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('knowledge_base')
          .select('id, title, content, category, entry_type, service_id')
          .eq('organization_id', context.organizationId)
          .eq('is_active', true)
          .or(`service_id.eq.${ticket.service_id},service_id.is.null`)
          .order('entry_type', { ascending: true })
          .limit(10)

        if (error) throw error
        setProcedures((data || []) as KnowledgeEntry[])
      } catch (error) {
        console.error('Error fetching procedures:', error)
        setProcedures([])
      } finally {
        setIsLoadingProcedures(false)
      }
    }

    fetchProcedures()
  }, [ticket?.service_id, context.organizationId])

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    setIsLoadingSearch(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('id, title, content, category, entry_type, service_id')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true)
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .limit(5)

      if (error) throw error
      setSearchResults((data || []) as KnowledgeEntry[])
    } catch (error) {
      console.error('Error searching KB:', error)
      setSearchResults([])
    } finally {
      setIsLoadingSearch(false)
    }
  }

  const renderEntry = (entry: KnowledgeEntry) => (
    <div key={entry.id} className="bg-gray-50 rounded-neu-sm shadow-neu-xs overflow-hidden">
      <button
        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
        className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              {entry.entry_type === 'procedure' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  Procedimiento
                </span>
              )}
              {entry.entry_type === 'faq' && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  FAQ
                </span>
              )}
              <p className="font-medium text-gray-800 text-sm">{entry.title}</p>
            </div>
            <p className="text-xs text-gray-500">{entry.category}</p>
          </div>
          <span className="text-gray-400 text-xs">
            {expandedId === entry.id ? '▼' : '▶'}
          </span>
        </div>
      </button>
      {expandedId === entry.id && (
        <div className="px-3 py-2 bg-white border-t border-gray-200">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
        </div>
      )}
    </div>
  )

  const entryTypePriority = (e: KnowledgeEntry) => {
    if (e.entry_type === 'procedure') return 0
    if (e.entry_type === 'script') return 1
    if (e.service_id === ticket?.service_id) return 2
    return 3
  }

  const sortedProcedures = [...procedures].sort(
    (a, b) => entryTypePriority(a) - entryTypePriority(b)
  )

  return (
    <div className="space-y-4">
      {/* Auto-loaded procedures for current service */}
      {ticket?.status === 'serving' && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Guias para {ticket.service?.name || 'este servicio'}
          </h4>
          {isLoadingProcedures ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : sortedProcedures.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No hay guias para este servicio
            </p>
          ) : (
            <div className="space-y-2">{sortedProcedures.map(renderEntry)}</div>
          )}
        </div>
      )}

      {/* Manual search */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Buscar en Base de Conocimiento
        </h4>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 rounded-neu-sm shadow-neu-inset text-sm focus:outline-none focus:ring-2 focus:ring-coopnama-primary"
          />
          <Button
            onClick={handleSearch}
            variant="primary"
            disabled={isLoadingSearch}
            className="text-xs px-3"
          >
            {isLoadingSearch ? <Spinner size="sm" /> : 'Buscar'}
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-2">{searchResults.map(renderEntry)}</div>
        )}
        {searchTerm && !isLoadingSearch && searchResults.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No se encontraron resultados
          </p>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { Spinner } from '@/shared/components/spinner'
import type { TicketWithRelations, CopilotCallbacks } from '../types'
import { useCopilotStore } from '../store/copilot-store'

interface CopilotChatProps {
  ticket: TicketWithRelations | null
  notes: string
  callbacks: CopilotCallbacks
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function CopilotChat({ ticket, notes, callbacks }: CopilotChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { setLastCopySuggestion } = useCopilotStore()
  const hasFetchedRef = useRef<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-fetch initial suggestion when ticket starts serving
  useEffect(() => {
    if (
      ticket?.status === 'serving' &&
      ticket.id !== hasFetchedRef.current
    ) {
      hasFetchedRef.current = ticket.id
      fetchSuggestion(
        `El cliente ${ticket.customer_name || 'anonimo'} necesita: ${ticket.service?.name || 'servicio'}. ${notes || ticket.notes ? `Notas: ${notes || ticket.notes}` : ''} Dame una sugerencia breve para atenderlo.`
      )
    }
  }, [ticket?.id, ticket?.status])

  const fetchSuggestion = async (userMessage: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context: {
            ticketId: ticket?.id,
            serviceName: ticket?.service?.name || 'N/A',
            customerName: ticket?.customer_name,
            ticketNotes: notes || ticket?.notes,
            memberId: ticket?.member_id,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let assistantContent = ''
      const assistantId = (Date.now() + 1).toString()

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        assistantContent += chunk

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          )
        )
      }

      setLastCopySuggestion(assistantContent)
    } catch (error) {
      console.error('Error in copilot chat:', error)
      const fallbackId = (Date.now() + 1).toString()
      const fallbackText = `Bienvenido${ticket?.customer_name ? ` ${ticket.customer_name}` : ''}. Servicio: ${ticket?.service?.name || 'N/A'}. Atienda con cortesia y profesionalismo.`
      setMessages((prev) => [
        ...prev,
        { id: fallbackId, role: 'assistant', content: fallbackText },
      ])
      setLastCopySuggestion(fallbackText)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    const msg = input.trim()
    setInput('')
    fetchSuggestion(msg)
  }

  if (!ticket || ticket.status !== 'serving') {
    return (
      <div className="text-center text-gray-400 py-8">
        Llame un turno para iniciar el copiloto
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 max-h-[350px]">
        {messages
          .filter((m) => m.role === 'assistant')
          .map((msg) => (
            <div
              key={msg.id}
              className="bg-[#009e59]/10 p-3 rounded-neu-sm shadow-neu-xs"
            >
              <p className="text-sm text-gray-200 whitespace-pre-wrap">
                {msg.content || (
                  <span className="text-gray-300">Pensando...</span>
                )}
              </p>
            </div>
          ))}
        {isLoading && messages.filter((m) => m.role === 'assistant').every((m) => m.content) && (
          <div className="flex justify-center py-2">
            <Spinner size="sm" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Preguntar al copiloto..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 rounded-neu-sm shadow-neu-inset text-sm focus:outline-none focus:border-[#009e59]/50 focus:ring-2 focus:ring-[#009e59]/20 disabled:opacity-50 bg-white/[0.04] text-white placeholder:text-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-3 py-2 bg-gradient-to-r from-[#009e59] to-[#00c96f] text-white rounded-neu-sm text-sm font-medium hover:brightness-110 disabled:opacity-50 transition-opacity"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}

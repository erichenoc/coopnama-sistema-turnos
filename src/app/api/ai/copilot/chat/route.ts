import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { getModel } from '@/lib/ai/provider'
import { createClient } from '@/lib/supabase/server'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CopilotContext {
  ticketId?: string
  serviceName?: string
  customerName?: string | null
  ticketNotes?: string | null
  memberId?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { messages, context }: { messages: ChatMessage[]; context?: CopilotContext } =
      await request.json()

    const model = getModel(true) // Use fast model for quick responses

    if (!model) {
      return new Response(
        JSON.stringify({
          reply: `Bienvenido${context?.customerName ? ` ${context.customerName}` : ''}. Servicio: ${context?.serviceName || 'N/A'}. Atienda con cortesia y profesionalismo.`,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build enriched system prompt with context
    let systemPrompt = `Eres el co-piloto IA de un agente de servicio al cliente en una cooperativa dominicana (COOPNAMA).
Tu trabajo es asistir al agente con sugerencias breves, practicas y amables en espanol.

REGLAS:
- Responde SIEMPRE en espanol, breve y directo (2-4 oraciones)
- Da sugerencias accionables para el agente, no para el cliente
- Si hay historial del miembro, personaliza la atencion
- Sugiere cross-sell/upsell cuando sea relevante
- No inventes informacion sobre productos financieros`

    if (context?.serviceName) {
      systemPrompt += `\n\nServicio actual: ${context.serviceName}`
    }
    if (context?.customerName) {
      systemPrompt += `\nCliente: ${context.customerName}`
    }
    if (context?.ticketNotes) {
      systemPrompt += `\nNotas: ${context.ticketNotes}`
    }

    // Fetch member history if available
    if (context?.memberId) {
      try {
        const supabase = await createClient()
        const { data: recentVisits } = await supabase
          .from('tickets')
          .select('rating, feedback_comment, created_at, service:service_id(name)')
          .eq('member_id', context.memberId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(3)

        if (recentVisits && recentVisits.length > 0) {
          systemPrompt += `\n\nHistorial reciente del miembro:\n${recentVisits
            .map((v: Record<string, unknown>) => {
              const svc = (v.service as { name: string } | null)?.name || 'N/A'
              const date = new Date(v.created_at as string).toLocaleDateString('es-DO')
              const rating = v.rating ? ` Rating: ${v.rating}/5` : ''
              const comment = v.feedback_comment ? ` "${v.feedback_comment}"` : ''
              return `- ${svc} (${date})${rating}${comment}`
            })
            .join('\n')}`
        }
      } catch {
        // Continue without member context
      }
    }

    // Fetch relevant KB entries
    if (context?.ticketId) {
      try {
        const supabase = await createClient()
        // Get ticket service_id
        const { data: ticket } = await supabase
          .from('tickets')
          .select('service_id')
          .eq('id', context.ticketId)
          .single()

        if (ticket?.service_id) {
          const { data: kbEntries } = await supabase
            .from('knowledge_base')
            .select('title, content')
            .eq('is_active', true)
            .or(`service_id.eq.${ticket.service_id},service_id.is.null`)
            .limit(3)

          if (kbEntries && kbEntries.length > 0) {
            systemPrompt += `\n\nBase de conocimiento relevante:\n${kbEntries
              .map((e) => `- ${e.title}: ${e.content.slice(0, 200)}`)
              .join('\n')}`
          }
        }
      } catch {
        // Continue without KB context
      }
    }

    const result = streamText({
      model,
      maxOutputTokens: 300,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Copilot chat error:', error)
    return new Response(
      JSON.stringify({ reply: 'Error al procesar tu mensaje. Intenta de nuevo.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

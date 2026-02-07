import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { getModel } from '@/lib/ai/provider'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `Eres el asistente virtual de una cooperativa dominicana (sistema de turnos).
Tu trabajo es ayudar al cliente a:
1. Identificar que servicio necesita
2. Recopilar informacion necesaria antes de su turno
3. Dar informacion sobre tiempos de espera y horarios

REGLAS:
- Responde SIEMPRE en español dominicano, breve y amable
- Clasifica la intencion del cliente en una de estas categorias: prestamo, ahorro, pago, consulta, queja, otro
- Si identificas la intencion, confirma con el cliente
- Si el cliente quiere sacar turno, pregunta su nombre y el servicio que necesita
- No inventes informacion sobre productos financieros

Al final de cada respuesta, incluye una linea JSON oculta con metadata:
<!--INTENT:{"intent":"categoria","confidence":"high|medium|low","needs_agent":true|false}-->
`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { messages, context }: { messages: ChatMessage[]; context?: { services?: string[]; branchName?: string } } = await request.json()

    const model = getModel()

    if (!model) {
      // Fallback without AI
      return new Response(
        JSON.stringify({
          reply: 'Gracias por tu mensaje. Para mejor asistencia, visita nuestra sucursal o llama directamente. Un agente estara disponible pronto.',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPT
    if (context?.services) {
      systemPrompt += `\n\nServicios disponibles: ${context.services.join(', ')}`
    }
    if (context?.branchName) {
      systemPrompt += `\nSucursal: ${context.branchName}`
    }

    // Fetch org services for context if not provided
    if (!context?.services) {
      try {
        const supabase = await createClient()
        const { data } = await supabase
          .from('services')
          .select('name')
          .eq('is_active', true)
          .limit(20)

        if (data && data.length > 0) {
          systemPrompt += `\n\nServicios disponibles: ${data.map(s => s.name).join(', ')}`
        }
      } catch {
        // Continue without services context
      }
    }

    const result = streamText({
      model,
      maxOutputTokens: 300,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ reply: 'Error al procesar tu mensaje. Intenta de nuevo.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

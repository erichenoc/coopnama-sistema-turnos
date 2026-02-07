import { generateText } from 'ai'
import { getModel } from './provider'

const SYSTEM_PROMPT = `Eres el asistente virtual de COOPNAMA, una cooperativa dominicana.
Tu rol es ayudar a clientes y empleados con informacion sobre servicios, turnos y citas.

Capacidades:
- Informar sobre servicios disponibles y horarios
- Ayudar a agendar citas
- Dar informacion sobre estado de turnos
- Responder preguntas frecuentes sobre la cooperativa

Reglas:
- Responde siempre en espanol dominicano
- Se amable y profesional
- Si no sabes algo, indica que un agente humano puede ayudar
- No inventes informacion sobre servicios o precios`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  reply: string
  intent?: string
}

const KEYWORD_RESPONSES: Record<string, string> = {
  'horario': 'Nuestro horario es de lunes a viernes, 8:00 AM a 5:00 PM, y sabados de 8:00 AM a 12:00 PM.',
  'turno': 'Puedes sacar un turno desde nuestro kiosko en la sucursal o a traves de nuestra plataforma web. Necesitaras tu cedula o nombre.',
  'cita': 'Para agendar una cita, puedes hacerlo desde la seccion de citas en nuestra plataforma web, o contactar a la sucursal directamente.',
  'servicio': 'Ofrecemos servicios de prestamos, ahorros, certificados financieros, pagos, y atencion general. Visita la sucursal para mas detalles.',
  'espera': 'El tiempo de espera depende de la cantidad de personas en cola. Puedes consultar tu posicion en la pagina "Mi Turno" con tu numero de turno.',
  'contacto': 'Puedes contactarnos llamando a la sucursal principal o visitandonos en persona. Estamos para servirte.',
}

function getKeywordResponse(message: string): string | null {
  const lower = message.toLowerCase()
  for (const [keyword, response] of Object.entries(KEYWORD_RESPONSES)) {
    if (lower.includes(keyword)) return response
  }
  return null
}

export async function chat(
  messages: ChatMessage[],
  context?: { services?: string[]; branchName?: string }
): Promise<ChatResponse> {
  const lastMessage = messages[messages.length - 1]?.content || ''

  const model = getModel()

  // Try keyword fallback first if no AI model available
  if (!model) {
    const keywordReply = getKeywordResponse(lastMessage)
    return {
      reply: keywordReply || 'Gracias por tu mensaje. Un agente estara disponible pronto para ayudarte. Puedes visitar nuestra sucursal o llamarnos para asistencia inmediata.',
      intent: 'fallback',
    }
  }

  try {
    let systemPrompt = SYSTEM_PROMPT
    if (context?.services) {
      systemPrompt += `\n\nServicios disponibles: ${context.services.join(', ')}`
    }
    if (context?.branchName) {
      systemPrompt += `\nSucursal: ${context.branchName}`
    }

    const { text } = await generateText({
      model,
      maxOutputTokens: 500,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    })

    const reply = text || 'Disculpa, no pude procesar tu solicitud. Intenta de nuevo.'

    return { reply, intent: 'ai' }
  } catch {
    // Fallback to keyword-based response
    const keywordReply = getKeywordResponse(lastMessage)
    return {
      reply: keywordReply || 'Estamos experimentando dificultades tecnicas. Por favor, intenta mas tarde o visita nuestra sucursal.',
      intent: 'error_fallback',
    }
  }
}

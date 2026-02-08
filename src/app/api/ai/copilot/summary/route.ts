import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getModel } from '@/lib/ai/provider'

export async function POST(request: NextRequest) {
  try {
    const { serviceName, customerName, agentNotes, serviceTimeSeconds } =
      await request.json()

    const model = getModel(true)

    if (!model) {
      // Fallback without AI
      const minutes = Math.floor((serviceTimeSeconds || 0) / 60)
      return NextResponse.json({
        summary: `Servicio: ${serviceName || 'N/A'}\nCliente: ${customerName || 'N/A'}\nDuracion: ${minutes} min\nNotas: ${agentNotes || 'Sin notas'}`,
        followUpSuggestions: [],
      })
    }

    const { text } = await generateText({
      model,
      maxOutputTokens: 300,
      system:
        'Eres un asistente que genera resumenes de atencion al cliente en una cooperativa dominicana. Responde SOLO en JSON valido.',
      messages: [
        {
          role: 'user',
          content: `Genera un resumen breve de esta atencion y sugiere acciones de seguimiento si aplica.

Servicio: ${serviceName || 'N/A'}
Cliente: ${customerName || 'N/A'}
Duracion: ${Math.floor((serviceTimeSeconds || 0) / 60)} minutos
Notas del agente: ${agentNotes || 'Sin notas'}

Responde en JSON: {"summary": "resumen en 2-3 oraciones", "followUpSuggestions": [{"task": "descripcion", "priority": "low|medium|high"}]}`,
        },
      ],
    })

    try {
      const parsed = JSON.parse(text)
      return NextResponse.json({
        summary: parsed.summary || text,
        followUpSuggestions: parsed.followUpSuggestions || [],
      })
    } catch {
      return NextResponse.json({ summary: text, followUpSuggestions: [] })
    }
  } catch (error) {
    console.error('Summary generation error:', error)
    return NextResponse.json({
      summary: 'Error al generar resumen.',
      followUpSuggestions: [],
    })
  }
}

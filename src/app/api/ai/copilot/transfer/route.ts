import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getModel } from '@/lib/ai/provider'

export async function POST(request: NextRequest) {
  try {
    const { serviceName, agentNotes, availableServices } = await request.json()

    const model = getModel(true)

    if (!model || !availableServices || availableServices.length === 0) {
      return NextResponse.json({ recommendation: null })
    }

    const { text } = await generateText({
      model,
      maxOutputTokens: 200,
      system:
        'Eres un asistente de una cooperativa dominicana. Analiza si un ticket deberia transferirse a otro servicio. Responde SOLO en JSON valido.',
      messages: [
        {
          role: 'user',
          content: `Analiza si este caso necesita transferencia.

Servicio actual: ${serviceName || 'N/A'}
Notas del agente: ${agentNotes || 'Sin notas'}

Servicios disponibles para transferir:
${availableServices.map((s: { id: string; name: string }) => `- ${s.name} (ID: ${s.id})`).join('\n')}

Si NO necesita transferencia, responde: {"recommendation": null}
Si SI necesita, responde: {"recommendation": {"serviceId": "UUID", "serviceName": "nombre", "reason": "razon breve", "confidence": "high|medium|low"}}`,
        },
      ],
    })

    try {
      const parsed = JSON.parse(text)
      return NextResponse.json({
        recommendation: parsed.recommendation || null,
      })
    } catch {
      return NextResponse.json({ recommendation: null })
    }
  } catch (error) {
    console.error('Transfer recommendation error:', error)
    return NextResponse.json({ recommendation: null })
  }
}

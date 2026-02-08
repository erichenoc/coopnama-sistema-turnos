import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getModel } from '@/lib/ai/provider'

export async function POST(request: NextRequest) {
  try {
    const { currentServiceName, memberHistory, availableServices } =
      await request.json()

    const model = getModel(true)

    if (!model || !availableServices || availableServices.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const { text } = await generateText({
      model,
      maxOutputTokens: 200,
      system:
        'Eres un asistente de ventas de una cooperativa dominicana. Sugiere servicios complementarios relevantes. Responde SOLO en JSON valido.',
      messages: [
        {
          role: 'user',
          content: `El cliente esta usando: ${currentServiceName}
${memberHistory ? `Historial: ${memberHistory}` : ''}

Servicios disponibles:
${availableServices.join(', ')}

Sugiere 1-2 servicios complementarios que podrian interesar al cliente.
Responde en JSON: {"suggestions": [{"serviceName": "nombre", "reason": "razon breve"}]}
Si no hay sugerencias relevantes: {"suggestions": []}`,
        },
      ],
    })

    try {
      const parsed = JSON.parse(text)
      return NextResponse.json({
        suggestions: parsed.suggestions || [],
      })
    } catch {
      return NextResponse.json({ suggestions: [] })
    }
  } catch (error) {
    console.error('Cross-sell error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}

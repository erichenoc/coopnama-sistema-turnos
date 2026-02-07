import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getModel } from '@/lib/ai/provider'
import { createClient } from '@/lib/supabase/server'

interface CopilotRequest {
  serviceName: string
  customerName: string | null
  ticketNotes: string | null
  memberId: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { serviceName, customerName, ticketNotes, memberId }: CopilotRequest =
      await request.json()

    // Build member context if memberId is provided
    let memberContext = ''
    if (memberId) {
      const supabase = await createClient()
      const { data: recentVisits } = await supabase
        .from('tickets')
        .select(`
          rating,
          feedback_comment,
          created_at,
          service:service_id(name)
        `)
        .eq('member_id', memberId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(3)

      if (recentVisits && recentVisits.length > 0) {
        memberContext = `\n\nHistorial reciente del miembro:\n${recentVisits
          .map((v: any) => {
            const serviceName = v.service?.name || 'N/A'
            const date = new Date(v.created_at).toLocaleDateString('es-DO')
            const rating = v.rating ? ` Rating: ${v.rating}/5` : ''
            const comment = v.feedback_comment ? ` "${v.feedback_comment}"` : ''
            return `- ${serviceName} (${date})${rating}${comment}`
          })
          .join('\n')}`
      }
    }

    // Get AI model
    const model = getModel(true) // Use fast model for quick suggestions

    if (!model) {
      // Fallback when AI is not available
      return NextResponse.json({
        suggestion: `Bienvenido${customerName ? ` ${customerName}` : ''}. Servicio: ${serviceName}.${
          ticketNotes ? ` Notas: ${ticketNotes}` : ''
        }`
      })
    }

    // Generate AI suggestion
    const { text } = await generateText({
      model,
      maxOutputTokens: 200,
      system:
        'Eres el co-piloto IA de un agente de servicio al cliente en una cooperativa dominicana. Da sugerencias breves, practicas y amables en espanol. Si hay historial del miembro, personaliza la atencion.',
      messages: [
        {
          role: 'user',
          content: `El cliente ${customerName || 'anonimo'} necesita: ${serviceName}.${
            ticketNotes ? ` Notas: ${ticketNotes}` : ''
          }${memberContext}\n\nDa una sugerencia breve (2-3 oraciones) para el agente.`
        }
      ]
    })

    return NextResponse.json({ suggestion: text })
  } catch (error) {
    console.error('Error generating copilot suggestion:', error)

    // Return graceful fallback
    return NextResponse.json({
      suggestion: 'Atienda al cliente con cortesia y profesionalismo.'
    })
  }
}

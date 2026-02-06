import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/ai/chatbot'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/webhooks/whatsapp-ai
 * Webhook for WhatsApp messages processed by AI chatbot.
 * Expected payload: { from: string, message: string, organization_id: string }
 */
export async function POST(req: NextRequest) {
  // Verify webhook secret
  const webhookSecret = req.headers.get('x-webhook-secret')
  if (webhookSecret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { from, message, organization_id } = body

    if (!from || !message || !organization_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
    const sessionId = `whatsapp-${from}`

    // Fetch recent conversation history for context
    const { data: history } = await supabase
      .from('ai_conversations')
      .select('role, content')
      .eq('session_id', sessionId)
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: true })
      .limit(10)

    const messages = [
      ...(history || []).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: message },
    ]

    // Fetch available services for context
    const { data: services } = await supabase
      .from('services')
      .select('name')
      .eq('organization_id', organization_id)
      .eq('is_active', true)

    const response = await chat(messages, {
      services: services?.map(s => s.name),
    })

    // Store both messages in conversation history
    await supabase.from('ai_conversations').insert([
      { organization_id, session_id: sessionId, role: 'user', content: message },
      { organization_id, session_id: sessionId, role: 'assistant', content: response.reply },
    ])

    return NextResponse.json({
      reply: response.reply,
      intent: response.intent,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

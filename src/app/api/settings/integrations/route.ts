import { NextResponse } from 'next/server'

/**
 * GET /api/settings/integrations - Check which integrations are configured
 * Returns boolean status for each integration based on env vars.
 */
export async function GET() {
  return NextResponse.json({
    inworld_tts: Boolean(process.env.INWORLD_TTS_WRITE_KEY),
    whatsapp_n8n: Boolean(process.env.N8N_WHATSAPP_WEBHOOK_URL),
    twilio_sms: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    web_push: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    claude_ai: Boolean(process.env.ANTHROPIC_API_KEY),
    resend_email: Boolean(process.env.RESEND_API_KEY),
  })
}

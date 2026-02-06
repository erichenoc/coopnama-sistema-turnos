import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface IntegrationConfig {
  inworld_tts_key?: string
  whatsapp_webhook_url?: string
  twilio_account_sid?: string
  twilio_auth_token?: string
  anthropic_api_key?: string
  resend_api_key?: string
  vapid_public_key?: string
  vapid_private_key?: string
}

/**
 * GET /api/settings/integrations - Check which integrations are configured
 * Checks both env vars (global) and DB config (per-org).
 */
export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id')

  let dbConfig: IntegrationConfig = {}

  if (orgId) {
    const supabase = await createServerClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('integration_config')
      .eq('id', orgId)
      .single()

    dbConfig = (org?.integration_config as IntegrationConfig) || {}
  }

  return NextResponse.json({
    inworld_tts: Boolean(process.env.INWORLD_TTS_WRITE_KEY || dbConfig.inworld_tts_key),
    whatsapp_n8n: Boolean(process.env.N8N_WHATSAPP_WEBHOOK_URL || dbConfig.whatsapp_webhook_url),
    twilio_sms: Boolean(
      (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
      (dbConfig.twilio_account_sid && dbConfig.twilio_auth_token)
    ),
    web_push: Boolean(
      (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) ||
      (dbConfig.vapid_public_key && dbConfig.vapid_private_key)
    ),
    claude_ai: Boolean(process.env.ANTHROPIC_API_KEY || dbConfig.anthropic_api_key),
    resend_email: Boolean(process.env.RESEND_API_KEY || dbConfig.resend_api_key),
  })
}

'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'

interface IntegrationConfig {
  inworld_tts_key?: string
  whatsapp_webhook_url?: string
  twilio_account_sid?: string
  twilio_auth_token?: string
  twilio_phone_number?: string
  vapid_public_key?: string
  vapid_private_key?: string
  openrouter_api_key?: string
  resend_api_key?: string
}

export async function saveIntegrationConfig(
  organizationId: string,
  config: IntegrationConfig
) {
  const supabase = await createServerClient()

  // Merge with existing config (don't overwrite fields not sent)
  const { data: org } = await supabase
    .from('organizations')
    .select('integration_config')
    .eq('id', organizationId)
    .single()

  const existingConfig = (org?.integration_config as IntegrationConfig) || {}

  // Only update fields that are provided (non-undefined)
  const mergedConfig: IntegrationConfig = { ...existingConfig }
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined) {
      (mergedConfig as Record<string, string>)[key] = value
    }
  }

  const { error } = await supabase
    .from('organizations')
    .update({ integration_config: mergedConfig })
    .eq('id', organizationId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function getIntegrationConfig(organizationId: string) {
  const supabase = await createServerClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('integration_config')
    .eq('id', organizationId)
    .single()

  return (org?.integration_config as IntegrationConfig) || {}
}

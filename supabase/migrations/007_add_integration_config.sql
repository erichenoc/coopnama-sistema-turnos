-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 007: Add integration_config to organizations
-- ============================================

-- Add integration_config column to store per-organization API keys and configs
-- Examples: Inworld TTS, WhatsApp, Twilio, VAPID, Anthropic, Resend, etc.
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS integration_config JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN organizations.integration_config IS
'Per-organization integration API keys and configurations (JSON object).
Examples: inworld_tts_key, whatsapp_webhook_url, twilio_account_sid,
twilio_auth_token, twilio_phone_number, vapid_public_key, vapid_private_key,
anthropic_api_key, resend_api_key, etc.';

-- Optional: Add index for JSONB queries if needed in the future
-- CREATE INDEX IF NOT EXISTS idx_organizations_integration_config
-- ON organizations USING GIN (integration_config);

import type { NotificationType } from '@/shared/types/domain'

const N8N_WEBHOOK_URL = process.env.N8N_WHATSAPP_WEBHOOK_URL || ''

interface WhatsAppPayload {
  to: string
  body: string
  notificationType: NotificationType
  metadata?: Record<string, unknown>
}

interface WhatsAppResult {
  success: boolean
  externalId?: string
  error?: string
}

export function isWhatsAppEnabled(): boolean {
  return Boolean(N8N_WEBHOOK_URL)
}

/**
 * Send WhatsApp message via n8n webhook.
 * n8n handles the actual WhatsApp Business API integration.
 *
 * The webhook expects:
 * - to: phone number in E.164 format
 * - message: text to send
 * - type: notification type for template selection in n8n
 * - metadata: additional context for dynamic templates
 */
export async function sendWhatsApp(
  payload: WhatsAppPayload
): Promise<WhatsAppResult> {
  if (!isWhatsAppEnabled()) {
    return { success: false, error: 'WhatsApp webhook not configured (N8N_WHATSAPP_WEBHOOK_URL missing)' }
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: payload.to,
        message: payload.body,
        type: payload.notificationType,
        metadata: payload.metadata || {},
        source: 'coopnama-turnos',
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `n8n webhook error: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json().catch(() => ({}))

    return {
      success: true,
      externalId: data.executionId || data.id || `n8n-${Date.now()}`,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'WhatsApp send failed',
    }
  }
}

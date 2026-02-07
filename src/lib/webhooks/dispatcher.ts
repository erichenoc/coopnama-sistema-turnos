import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

interface WebhookPayload {
  event: string
  timestamp: string
  data: Record<string, unknown>
}

interface WebhookSubscription {
  id: string
  url: string
  secret: string
  events: string[]
}

export async function dispatchWebhooks(
  organizationId: string,
  event: string,
  data: Record<string, unknown>
) {
  try {
    const supabase = await createClient()

    const { data: subs } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, secret, events')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .lt('failure_count', 5)

    if (!subs || subs.length === 0) return

    const matching = subs.filter((s: WebhookSubscription) => s.events.includes(event) || s.events.includes('*'))

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    }

    const body = JSON.stringify(payload)

    await Promise.allSettled(
      matching.map(async (sub: WebhookSubscription) => {
        const signature = crypto
          .createHmac('sha256', sub.secret)
          .update(body)
          .digest('hex')

        try {
          const res = await fetch(sub.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Event': event,
            },
            body,
            signal: AbortSignal.timeout(10000),
          })

          if (!res.ok) throw new Error(`HTTP ${res.status}`)

          // Update last triggered
          await supabase
            .from('webhook_subscriptions')
            .update({ last_triggered_at: new Date().toISOString(), failure_count: 0 })
            .eq('id', sub.id)
        } catch {
          // Increment failure count
          await supabase
            .from('webhook_subscriptions')
            .update({ failure_count: (sub as unknown as { failure_count: number }).failure_count + 1 })
            .eq('id', sub.id)
        }
      })
    )
  } catch (error) {
    console.error('Webhook dispatch error:', error)
  }
}

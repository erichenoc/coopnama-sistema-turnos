import webpush from 'web-push'
import { createClient as createServerClient } from '@/lib/supabase/server'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@coopnama.do'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

interface PushPayload {
  title: string
  body: string
  metadata?: Record<string, unknown>
  organizationId: string
  memberId?: string
}

interface PushResult {
  success: boolean
  externalId?: string
  error?: string
}

export function isPushEnabled(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}

/**
 * Send Web Push notification to all active subscriptions
 * for a member or all users in an organization.
 */
export async function sendPushNotification(
  payload: PushPayload
): Promise<PushResult> {
  if (!isPushEnabled()) {
    return { success: false, error: 'Web Push not configured (VAPID keys missing)' }
  }

  const supabase = await createServerClient()

  // Find target subscriptions
  let query = supabase
    .from('push_subscriptions')
    .select('*')
    .eq('organization_id', payload.organizationId)
    .eq('is_active', true)

  if (payload.memberId) {
    query = query.eq('member_id', payload.memberId)
  }

  const { data: subscriptions, error } = await query

  if (error || !subscriptions?.length) {
    return {
      success: !error,
      error: error?.message || 'No active subscriptions found',
    }
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: payload.metadata || {},
    tag: `coopnama-${Date.now()}`,
  })

  let sentCount = 0
  const failedEndpoints: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        )
        sentCount++
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? (err as { statusCode: number }).statusCode
            : 0

        // 410 Gone or 404 = subscription expired, deactivate it
        if (statusCode === 410 || statusCode === 404) {
          failedEndpoints.push(sub.id)
        }
      }
    })
  )

  // Deactivate expired subscriptions
  if (failedEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .in('id', failedEndpoints)
  }

  return {
    success: sentCount > 0,
    externalId: `push-${sentCount}/${subscriptions.length}`,
  }
}

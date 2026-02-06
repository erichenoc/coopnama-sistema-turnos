import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/push/subscribe - Register a Web Push subscription
 * Body: { endpoint, p256dh, auth, organizationId, memberId?, userId?, deviceType? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const {
      endpoint,
      p256dh,
      auth,
      organizationId,
      memberId,
      userId,
      deviceType,
    } = await request.json()

    if (!endpoint || !p256dh || !auth || !organizationId) {
      return NextResponse.json(
        { error: 'endpoint, p256dh, auth, and organizationId are required' },
        { status: 400 }
      )
    }

    const userAgent = request.headers.get('user-agent') || null

    // Upsert subscription (update if endpoint already exists)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint,
          p256dh,
          auth,
          organization_id: organizationId,
          member_id: memberId || null,
          user_id: userId || null,
          device_type: deviceType || 'unknown',
          user_agent: userAgent,
          is_active: true,
        },
        { onConflict: 'endpoint' }
      )
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id, subscribed: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

/**
 * DELETE /api/push/subscribe - Unsubscribe from push notifications
 * Body: { endpoint }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint is required' }, { status: 400 })
    }

    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('endpoint', endpoint)

    return NextResponse.json({ unsubscribed: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

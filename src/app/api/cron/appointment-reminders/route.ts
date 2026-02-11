import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyMultiChannel, buildTicketNotificationText } from '@/lib/notifications/service'
import { timingSafeEqual } from 'crypto'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Verify cron secret using timing-safe comparison
 */
function verifyCronSecret(authHeader: string | null, expected: string | undefined): boolean {
  if (!expected) return false // Secret not configured = reject all
  if (!authHeader) return false

  // Extract Bearer token
  const match = authHeader.match(/^Bearer (.+)$/)
  if (!match) return false

  const provided = match[1]
  try {
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  // Validate cron secret is configured
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: 'Cron job not configured' },
      { status: 503 }
    )
  }

  // Verify cron secret with timing-safe comparison
  const authHeader = request.headers.get('authorization')
  if (!verifyCronSecret(authHeader, CRON_SECRET)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in1h = new Date(now.getTime() + 60 * 60 * 1000)

  let sent24h = 0
  let sent1h = 0

  // 24-hour reminders: appointments between 23-25 hours from now
  const { data: appointments24h } = await supabase
    .from('appointments')
    .select('*, member:members(*), service:services(*)')
    .eq('status', 'confirmed')
    .eq('reminder_24h_sent', false)
    .gte('appointment_date', now.toISOString().split('T')[0])
    .lte('appointment_date', in24h.toISOString().split('T')[0])

  for (const appt of appointments24h || []) {
    const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`)
    const hoursUntil = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntil > 23 && hoursUntil <= 25) {
      const channels: ('email' | 'sms' | 'whatsapp')[] = []
      if (appt.member?.email) channels.push('email')
      if (appt.member?.phone) channels.push('sms')

      if (channels.length > 0) {
        const serviceName = appt.service?.name || ''
        const timeStr = appt.appointment_time?.slice(0, 5) || ''

        await notifyMultiChannel(channels, {
          organization_id: appt.organization_id,
          member_id: appt.member_id,
          recipient_email: appt.member?.email || undefined,
          recipient_phone: appt.member?.phone || undefined,
          notification_type: 'appointment_reminder',
          title: 'Recordatorio de Cita - Manana',
          body: `Recordatorio: Tiene una cita para ${serviceName} manana a las ${timeStr}. Codigo: ${appt.confirmation_code}`,
        })

        await supabase
          .from('appointments')
          .update({ reminder_24h_sent: true })
          .eq('id', appt.id)

        sent24h++
      }
    }
  }

  // 1-hour reminders: appointments between 30min-90min from now
  const { data: appointments1h } = await supabase
    .from('appointments')
    .select('*, member:members(*), service:services(*)')
    .eq('status', 'confirmed')
    .eq('reminder_1h_sent', false)
    .eq('appointment_date', now.toISOString().split('T')[0])

  for (const appt of appointments1h || []) {
    const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`)
    const minutesUntil = (apptDateTime.getTime() - now.getTime()) / (1000 * 60)

    if (minutesUntil > 30 && minutesUntil <= 90) {
      const channels: ('email' | 'sms' | 'whatsapp')[] = []
      if (appt.member?.email) channels.push('email')
      if (appt.member?.phone) channels.push('sms')

      if (channels.length > 0) {
        const serviceName = appt.service?.name || ''
        const timeStr = appt.appointment_time?.slice(0, 5) || ''

        await notifyMultiChannel(channels, {
          organization_id: appt.organization_id,
          member_id: appt.member_id,
          recipient_email: appt.member?.email || undefined,
          recipient_phone: appt.member?.phone || undefined,
          notification_type: 'appointment_reminder',
          title: 'Su Cita es Pronto',
          body: `Recordatorio: Su cita para ${serviceName} es a las ${timeStr} (en aproximadamente 1 hora). Codigo: ${appt.confirmation_code}`,
        })

        await supabase
          .from('appointments')
          .update({ reminder_1h_sent: true })
          .eq('id', appt.id)

        sent1h++
      }
    }
  }

  return NextResponse.json({
    success: true,
    sent24h,
    sent1h,
    timestamp: now.toISOString(),
  })
}

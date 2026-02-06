import { createClient as createServerClient } from '@/lib/supabase/server'
import type {
  NotificationChannel,
  NotificationType,
  SendNotificationInput,
} from '@/shared/types/domain'
import { sendPushNotification } from './channels/push'
import { sendSMS } from './channels/sms'
import { sendWhatsApp } from './channels/whatsapp'

interface NotificationResult {
  success: boolean
  notificationId?: string
  externalId?: string
  error?: string
}

/**
 * Unified notification service.
 * Routes to the appropriate channel and logs every attempt.
 */
export async function sendNotification(
  input: SendNotificationInput
): Promise<NotificationResult> {
  const supabase = await createServerClient()

  // Insert pending notification record
  const { data: notification, error: insertError } = await supabase
    .from('notifications')
    .insert({
      organization_id: input.organization_id,
      ticket_id: input.ticket_id || null,
      member_id: input.member_id || null,
      recipient_phone: input.recipient_phone || null,
      recipient_email: input.recipient_email || null,
      channel: input.channel,
      notification_type: input.notification_type,
      title: input.title || null,
      body: input.body,
      metadata: input.metadata || {},
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !notification) {
    console.error('Failed to create notification record:', insertError)
    return { success: false, error: insertError?.message || 'Insert failed' }
  }

  const notificationId = notification.id

  try {
    const result = await dispatchToChannel(input)

    // Update notification as sent
    await supabase
      .from('notifications')
      .update({
        status: result.success ? 'sent' : 'failed',
        external_id: result.externalId || null,
        error_message: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
      })
      .eq('id', notificationId)

    return { ...result, notificationId }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'

    await supabase
      .from('notifications')
      .update({
        status: 'failed',
        error_message: errorMsg,
      })
      .eq('id', notificationId)

    return { success: false, notificationId, error: errorMsg }
  }
}

async function dispatchToChannel(
  input: SendNotificationInput
): Promise<NotificationResult> {
  switch (input.channel) {
    case 'push':
      return sendPushNotification({
        title: input.title || 'COOPNAMA Turnos',
        body: input.body,
        metadata: input.metadata,
        organizationId: input.organization_id,
        memberId: input.member_id,
      })

    case 'sms':
      if (!input.recipient_phone) {
        return { success: false, error: 'Phone number required for SMS' }
      }
      return sendSMS({
        to: input.recipient_phone,
        body: input.body,
      })

    case 'whatsapp':
      if (!input.recipient_phone) {
        return { success: false, error: 'Phone required for WhatsApp' }
      }
      return sendWhatsApp({
        to: input.recipient_phone,
        body: input.body,
        notificationType: input.notification_type,
        metadata: input.metadata,
      })

    case 'in_app':
      // In-app notifications are stored in the DB - already done above
      return { success: true }

    case 'email':
      // Email channel placeholder - can integrate with Resend/SendGrid later
      return { success: false, error: 'Email channel not yet configured' }

    default:
      return { success: false, error: `Unknown channel: ${input.channel}` }
  }
}

/**
 * Send notifications to multiple channels for a single event.
 */
export async function notifyMultiChannel(
  channels: NotificationChannel[],
  input: Omit<SendNotificationInput, 'channel'>
): Promise<NotificationResult[]> {
  const results = await Promise.allSettled(
    channels.map((channel) =>
      sendNotification({ ...input, channel })
    )
  )

  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { success: false, error: r.reason?.message || 'Unknown error' }
  )
}

/**
 * Build notification text for ticket events.
 */
export function buildTicketNotificationText(
  type: NotificationType,
  ticketNumber: string,
  serviceName?: string,
  stationName?: string
): { title: string; body: string } {
  switch (type) {
    case 'ticket_created':
      return {
        title: 'Turno Creado',
        body: `Su turno ${ticketNumber} ha sido creado${serviceName ? ` para ${serviceName}` : ''}. Le notificaremos cuando sea llamado.`,
      }

    case 'ticket_called':
      return {
        title: 'Es Su Turno!',
        body: `Turno ${ticketNumber}: Pase a ${stationName || 'la ventanilla'}. Le estamos esperando.`,
      }

    case 'ticket_reminder':
      return {
        title: 'Recordatorio de Turno',
        body: `Su turno ${ticketNumber} esta proximo. Por favor este atento.`,
      }

    case 'ticket_completed':
      return {
        title: 'Servicio Completado',
        body: `Turno ${ticketNumber}: Su servicio ha sido completado. Gracias por visitarnos.`,
      }

    default:
      return {
        title: 'COOPNAMA Turnos',
        body: `Notificacion sobre turno ${ticketNumber}`,
      }
  }
}

'use server'

import { sendNotification, buildTicketNotificationText, notifyMultiChannel } from '@/lib/notifications/service'
import type { NotificationChannel, Ticket } from '@/shared/types/domain'

/**
 * Notify customer when their ticket is created.
 */
export async function notifyTicketCreated(
  ticket: Ticket,
  serviceName: string,
  channels: NotificationChannel[] = ['in_app']
) {
  const { title, body } = buildTicketNotificationText(
    'ticket_created',
    ticket.ticket_number,
    serviceName
  )

  const channelsToUse = [...channels]

  // Auto-add WhatsApp if customer has phone and came from WhatsApp
  if (ticket.customer_phone && ticket.source === 'whatsapp' && !channelsToUse.includes('whatsapp')) {
    channelsToUse.push('whatsapp')
  }

  return notifyMultiChannel(channelsToUse, {
    organization_id: ticket.organization_id,
    notification_type: 'ticket_created',
    title,
    body,
    ticket_id: ticket.id,
    member_id: ticket.member_id || undefined,
    recipient_phone: ticket.customer_phone || undefined,
  })
}

/**
 * Notify customer when their ticket is called.
 */
export async function notifyTicketCalled(
  ticket: Ticket,
  stationName: string,
  channels: NotificationChannel[] = ['in_app', 'push']
) {
  const { title, body } = buildTicketNotificationText(
    'ticket_called',
    ticket.ticket_number,
    undefined,
    stationName
  )

  const channelsToUse = [...channels]

  if (ticket.customer_phone && !channelsToUse.includes('sms')) {
    channelsToUse.push('sms')
  }

  return notifyMultiChannel(channelsToUse, {
    organization_id: ticket.organization_id,
    notification_type: 'ticket_called',
    title,
    body,
    ticket_id: ticket.id,
    member_id: ticket.member_id || undefined,
    recipient_phone: ticket.customer_phone || undefined,
    metadata: { stationName, ticketNumber: ticket.ticket_number },
  })
}

/**
 * Notify customer when their service is completed.
 */
export async function notifyTicketCompleted(
  ticket: Ticket,
  channels: NotificationChannel[] = ['in_app']
) {
  const { title, body } = buildTicketNotificationText(
    'ticket_completed',
    ticket.ticket_number
  )

  return notifyMultiChannel(channels, {
    organization_id: ticket.organization_id,
    notification_type: 'ticket_completed',
    title,
    body,
    ticket_id: ticket.id,
    member_id: ticket.member_id || undefined,
    recipient_phone: ticket.customer_phone || undefined,
  })
}

/**
 * Send a custom notification.
 */
export async function sendCustomNotification(
  organizationId: string,
  channel: NotificationChannel,
  title: string,
  body: string,
  recipientPhone?: string,
  recipientEmail?: string
) {
  return sendNotification({
    organization_id: organizationId,
    channel,
    notification_type: 'custom',
    title,
    body,
    recipient_phone: recipientPhone,
    recipient_email: recipientEmail,
  })
}

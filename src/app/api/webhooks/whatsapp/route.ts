import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { timingSafeEqual } from 'crypto'

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

/**
 * Verify webhook secret using timing-safe comparison
 */
function verifySecret(provided: string | undefined, expected: string | undefined): boolean {
  if (!expected) return false // Secret not configured = reject all
  if (!provided) return false
  try {
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * POST /api/webhooks/whatsapp - Receive incoming WhatsApp messages from n8n
 *
 * n8n sends incoming customer WhatsApp messages here. The system can:
 * 1. Create tickets from WhatsApp messages
 * 2. Look up ticket status by confirmation code
 * 3. Cancel appointments via WhatsApp
 *
 * Expected body from n8n:
 * {
 *   from: "+18095551234",
 *   body: "turno" | "estado ABC123" | "cancelar ABC123",
 *   name: "Juan Perez",
 *   secret: "webhook_secret_token"
 * }
 */
export async function POST(request: NextRequest) {
  // Validate webhook secret is configured
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 }
    )
  }

  try {
    const payload = await request.json()

    // Verify webhook secret with timing-safe comparison
    if (!verifySecret(payload.secret, WEBHOOK_SECRET)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { from, body, name } = payload

    if (!from || !body) {
      return NextResponse.json(
        { error: 'from and body are required' },
        { status: 400 }
      )
    }

    const message = body.trim().toLowerCase()
    const supabase = await createClient()

    // Command: Create ticket
    if (message === 'turno' || message === 'ticket') {
      return handleCreateTicket(supabase, from, name)
    }

    // Command: Check status
    if (message.startsWith('estado ') || message.startsWith('status ')) {
      const code = message.split(' ')[1]?.toUpperCase()
      return handleCheckStatus(supabase, code)
    }

    // Command: Cancel appointment
    if (message.startsWith('cancelar ') || message.startsWith('cancel ')) {
      const code = message.split(' ')[1]?.toUpperCase()
      return handleCancelAppointment(supabase, code)
    }

    // Default response with available commands
    return NextResponse.json({
      reply: [
        'COOPNAMA - Sistema de Turnos',
        '',
        'Comandos disponibles:',
        'TURNO - Crear un nuevo turno',
        'ESTADO [codigo] - Consultar estado de su turno',
        'CANCELAR [codigo] - Cancelar una cita',
      ].join('\n'),
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

async function handleCreateTicket(
  supabase: Awaited<ReturnType<typeof createClient>>,
  phone: string,
  name?: string
) {
  // Get default org and branch
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .limit(1)
    .single()

  if (!org) {
    return NextResponse.json({
      reply: 'Lo sentimos, el sistema no esta disponible en este momento.',
    })
  }

  const { data: branch } = await supabase
    .from('branches')
    .select('id')
    .eq('organization_id', org.id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!branch) {
    return NextResponse.json({
      reply: 'No hay sucursales disponibles en este momento.',
    })
  }

  // Get the first active service (General)
  const { data: service } = await supabase
    .from('services')
    .select('id, name')
    .eq('organization_id', org.id)
    .eq('is_active', true)
    .order('sort_order')
    .limit(1)
    .single()

  if (!service) {
    return NextResponse.json({
      reply: 'No hay servicios disponibles en este momento.',
    })
  }

  const { data: ticket, error } = await supabase.rpc('create_ticket', {
    p_organization_id: org.id,
    p_branch_id: branch.id,
    p_service_id: service.id,
    p_customer_name: name || null,
    p_customer_phone: phone,
    p_customer_cedula: null,
    p_priority: 0,
    p_priority_reason: null,
    p_source: 'whatsapp',
    p_member_id: null,
  })

  if (error) {
    return NextResponse.json({
      reply: 'Error al crear su turno. Intente de nuevo mas tarde.',
    })
  }

  return NextResponse.json({
    reply: [
      `Su turno ha sido creado!`,
      ``,
      `Numero: ${ticket.ticket_number}`,
      `Servicio: ${service.name}`,
      ``,
      `Le notificaremos cuando sea su turno.`,
      `Envie "ESTADO ${ticket.ticket_number}" para consultar.`,
    ].join('\n'),
  })
}

async function handleCheckStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code?: string
) {
  if (!code) {
    return NextResponse.json({
      reply: 'Envie: ESTADO [numero de turno] para consultar.',
    })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: ticket } = await supabase
    .from('tickets')
    .select('ticket_number, status, created_at')
    .eq('ticket_number', code)
    .gte('created_at', today)
    .single()

  if (!ticket) {
    return NextResponse.json({
      reply: `No se encontro el turno ${code} para hoy.`,
    })
  }

  const statusLabels: Record<string, string> = {
    waiting: 'En Espera',
    called: 'LLAMADO - Pase a la ventanilla!',
    serving: 'Siendo Atendido',
    completed: 'Completado',
    cancelled: 'Cancelado',
    no_show: 'No se presento',
    transferred: 'Transferido',
  }

  return NextResponse.json({
    reply: [
      `Turno: ${ticket.ticket_number}`,
      `Estado: ${statusLabels[ticket.status] || ticket.status}`,
      `Hora: ${new Date(ticket.created_at).toLocaleTimeString('es-DO')}`,
    ].join('\n'),
  })
}

async function handleCancelAppointment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code?: string
) {
  if (!code) {
    return NextResponse.json({
      reply: 'Envie: CANCELAR [codigo de cita] para cancelar.',
    })
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .select('id, confirmation_code, status')
    .eq('confirmation_code', code)
    .in('status', ['pending', 'confirmed'])
    .single()

  if (error || !appointment) {
    return NextResponse.json({
      reply: `No se encontro una cita activa con codigo ${code}.`,
    })
  }

  await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: 'Cancelado via WhatsApp',
    })
    .eq('id', appointment.id)

  return NextResponse.json({
    reply: `Su cita con codigo ${code} ha sido cancelada.`,
  })
}

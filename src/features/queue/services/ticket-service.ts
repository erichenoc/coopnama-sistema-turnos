/**
 * COOPNAMA Sistema de Turnos
 * Ticket Service - Operaciones CRUD para tickets
 */

import { createClient } from '@/lib/supabase/client'
import type {
  Ticket,
  TicketWithRelations,
  CreateTicketInput,
  UpdateTicketInput,
  TicketStatus,
  DailyStats,
  Service,
  Station,
  QueueTicket,
  PRIORITY_NAME_MAP,
} from '@/shared/types/domain'

// ============================================
// CREAR TICKET
// ============================================

/**
 * Crea un nuevo ticket usando la función de base de datos
 */
export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('create_ticket', {
    p_organization_id: input.organization_id,
    p_branch_id: input.branch_id,
    p_service_id: input.service_id,
    p_customer_name: input.customer_name || null,
    p_customer_cedula: input.customer_cedula || null,
    p_customer_phone: input.customer_phone || null,
    p_priority: input.priority || 0,
    p_priority_reason: input.priority_reason || null,
    p_source: input.source || 'kiosk',
    p_member_id: input.member_id || null,
  })

  if (error) {
    console.error('Error creating ticket:', error)
    throw new Error(`Error al crear ticket: ${error.message}`)
  }

  return data as Ticket
}

// ============================================
// OBTENER COLA ACTIVA
// ============================================

/**
 * Obtiene la cola de tickets activos (waiting, called, serving)
 */
export async function getActiveQueue(branchId: string): Promise<TicketWithRelations[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      service:services!tickets_service_id_fkey(*),
      station:stations(*),
      agent:users(*)
    `)
    .eq('branch_id', branchId)
    .in('status', ['waiting', 'called', 'serving'])
    .gte('created_at', new Date().toISOString().split('T')[0]) // Solo del día actual
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching active queue:', error)
    throw new Error(`Error al obtener cola: ${error.message}`)
  }

  return (data || []) as TicketWithRelations[]
}

/**
 * Obtiene la cola usando la función de base de datos
 */
export async function getActiveQueueRPC(branchId: string): Promise<Ticket[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_active_queue', {
    p_branch_id: branchId,
  })

  if (error) {
    console.error('Error fetching active queue:', error)
    throw new Error(`Error al obtener cola: ${error.message}`)
  }

  return (data || []) as Ticket[]
}

// ============================================
// OPERACIONES DE AGENTE
// ============================================

/**
 * Llama al siguiente ticket en la cola
 */
export async function callNextTicket(
  stationId: string,
  agentId: string
): Promise<Ticket | null> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('call_next_ticket', {
    p_station_id: stationId,
    p_agent_id: agentId,
  })

  if (error) {
    console.error('Error calling next ticket:', error)
    throw new Error(`Error al llamar siguiente turno: ${error.message}`)
  }

  return data as Ticket | null
}

/**
 * Inicia la atención de un ticket
 */
export async function startServingTicket(
  ticketId: string,
  agentId: string
): Promise<Ticket> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('start_serving_ticket', {
    p_ticket_id: ticketId,
    p_agent_id: agentId,
  })

  if (error) {
    console.error('Error starting service:', error)
    throw new Error(`Error al iniciar atención: ${error.message}`)
  }

  return data as Ticket
}

/**
 * Completa la atención de un ticket
 */
export async function completeTicket(
  ticketId: string,
  agentId: string,
  notes?: string
): Promise<Ticket> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('complete_ticket', {
    p_ticket_id: ticketId,
    p_agent_id: agentId,
    p_notes: notes || null,
  })

  if (error) {
    console.error('Error completing ticket:', error)
    throw new Error(`Error al completar atención: ${error.message}`)
  }

  return data as Ticket
}

/**
 * Marca un ticket como no-show
 */
export async function markTicketNoShow(
  ticketId: string,
  agentId: string
): Promise<Ticket> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('mark_ticket_no_show', {
    p_ticket_id: ticketId,
    p_agent_id: agentId,
  })

  if (error) {
    console.error('Error marking no-show:', error)
    throw new Error(`Error al marcar no-show: ${error.message}`)
  }

  return data as Ticket
}

/**
 * Cancela un ticket
 */
export async function cancelTicket(
  ticketId: string,
  agentId?: string,
  notes?: string
): Promise<Ticket> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tickets')
    .update({
      status: 'cancelled' as TicketStatus,
      completed_at: new Date().toISOString(),
      notes: notes || 'Cancelado',
    })
    .eq('id', ticketId)
    .select()
    .single()

  if (error) {
    console.error('Error cancelling ticket:', error)
    throw new Error(`Error al cancelar ticket: ${error.message}`)
  }

  // Registrar en historial
  await supabase.from('ticket_history').insert({
    ticket_id: ticketId,
    previous_status: data.status,
    new_status: 'cancelled',
    changed_by: agentId || null,
    notes: notes || 'Ticket cancelado',
  })

  return data as Ticket
}

/**
 * Actualiza el estado de un ticket
 */
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  agentId?: string
): Promise<Ticket> {
  const supabase = createClient()

  const updates: Partial<Ticket> = { status }

  // Agregar timestamps según el estado
  if (status === 'called') {
    updates.called_at = new Date().toISOString()
  } else if (status === 'serving') {
    updates.started_at = new Date().toISOString()
  } else if (status === 'completed' || status === 'no_show' || status === 'cancelled') {
    updates.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single()

  if (error) {
    console.error('Error updating ticket status:', error)
    throw new Error(`Error al actualizar estado: ${error.message}`)
  }

  return data as Ticket
}

// ============================================
// CONSULTAS
// ============================================

/**
 * Obtiene un ticket por ID
 */
export async function getTicketById(ticketId: string): Promise<TicketWithRelations | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      service:services!tickets_service_id_fkey(*),
      station:stations(*),
      agent:users(*)
    `)
    .eq('id', ticketId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('Error fetching ticket:', error)
    throw new Error(`Error al obtener ticket: ${error.message}`)
  }

  return data as TicketWithRelations
}

/**
 * Obtiene el ticket actualmente siendo atendido en una estación
 */
export async function getCurrentTicketByStation(stationId: string): Promise<TicketWithRelations | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      service:services!tickets_service_id_fkey(*),
      agent:users(*)
    `)
    .eq('station_id', stationId)
    .in('status', ['called', 'serving'])
    .order('called_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching current ticket:', error)
    throw new Error(`Error al obtener ticket actual: ${error.message}`)
  }

  return data as TicketWithRelations | null
}

/**
 * Obtiene tickets completados del día
 */
export async function getCompletedTicketsToday(branchId: string): Promise<Ticket[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'completed')
    .gte('created_at', new Date().toISOString().split('T')[0])
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Error fetching completed tickets:', error)
    throw new Error(`Error al obtener tickets completados: ${error.message}`)
  }

  return (data || []) as Ticket[]
}

// ============================================
// ESTADÍSTICAS
// ============================================

/**
 * Obtiene estadísticas del día
 */
export async function getDailyStats(
  branchId: string,
  date?: string
): Promise<DailyStats> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_daily_stats', {
    p_branch_id: branchId,
    p_date: date || new Date().toISOString().split('T')[0],
  })

  if (error) {
    console.error('Error fetching daily stats:', error)
    throw new Error(`Error al obtener estadísticas: ${error.message}`)
  }

  return (data?.[0] || {
    total_tickets: 0,
    completed_tickets: 0,
    waiting_tickets: 0,
    serving_tickets: 0,
    no_show_tickets: 0,
    cancelled_tickets: 0,
    avg_wait_time_seconds: null,
    avg_service_time_seconds: null,
  }) as DailyStats
}

/**
 * Obtiene conteo de tickets en espera por servicio
 */
export async function getWaitingCountByService(branchId: string): Promise<Record<string, number>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tickets')
    .select('service_id')
    .eq('branch_id', branchId)
    .eq('status', 'waiting')
    .gte('created_at', new Date().toISOString().split('T')[0])

  if (error) {
    console.error('Error fetching waiting count:', error)
    throw new Error(`Error al obtener conteo: ${error.message}`)
  }

  // Contar por servicio
  const counts: Record<string, number> = {}
  data?.forEach((ticket) => {
    counts[ticket.service_id] = (counts[ticket.service_id] || 0) + 1
  })

  return counts
}

// ============================================
// HELPERS PARA UI
// ============================================

/**
 * Convierte un ticket a formato para mostrar en UI
 */
export function formatTicketForUI(
  ticket: TicketWithRelations,
  priorityNameMap: typeof PRIORITY_NAME_MAP
): QueueTicket {
  const waitTimeMinutes = ticket.wait_time_seconds
    ? Math.round(ticket.wait_time_seconds / 60)
    : Math.round((Date.now() - new Date(ticket.created_at).getTime()) / 60000)

  return {
    id: ticket.id,
    number: ticket.ticket_number,
    service: ticket.service?.name || 'Desconocido',
    serviceCode: ticket.service?.code || '?',
    status: ticket.status,
    priority: priorityNameMap[ticket.priority],
    customerName: ticket.customer_name,
    waitTime: `${waitTimeMinutes} min`,
    createdAt: ticket.created_at,
  }
}

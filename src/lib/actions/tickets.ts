'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getLocalDateString } from '@/shared/utils/date'
import type { Ticket, TicketWithRelations, DailyStats, CreateTicketInput } from '@/shared/types/domain'
import { notifyTicketCreated, notifyTicketCalled, notifyTicketCompleted } from '@/lib/actions/notifications'

export async function createTicketAction(
  input: CreateTicketInput
): Promise<{ data?: Ticket; error?: string }> {
  const supabase = await createClient()

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

  if (error) return { error: `Error al crear ticket: ${error.message}` }

  const ticket = data as Ticket

  // Fire-and-forget notification (don't block ticket creation)
  notifyTicketCreated(ticket, input.service_id).catch(() => {})

  revalidatePath('/dashboard')
  revalidatePath('/queue')
  return { data: ticket }
}

export async function callNextTicketAction(
  stationId: string,
  agentId: string
): Promise<{ data?: Ticket; error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Verify agentId matches authenticated user
  if (agentId !== user.id) {
    return { error: 'No autorizado: agente no coincide' }
  }

  const { data, error } = await supabase.rpc('call_next_ticket', {
    p_station_id: stationId,
    p_agent_id: agentId,
  })

  if (error) return { error: `Error al llamar siguiente turno: ${error.message}` }

  const ticket = data as Ticket

  // Notify customer their ticket was called
  notifyTicketCalled(ticket, stationId).catch(() => {})

  revalidatePath('/dashboard')
  revalidatePath('/queue')
  return { data: ticket }
}

export async function startServingAction(
  ticketId: string,
  agentId: string
): Promise<{ data?: Ticket; error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Verify agentId matches authenticated user
  if (agentId !== user.id) {
    return { error: 'No autorizado: agente no coincide' }
  }

  const { data, error } = await supabase.rpc('start_serving_ticket', {
    p_ticket_id: ticketId,
    p_agent_id: agentId,
  })

  if (error) return { error: `Error al iniciar atencion: ${error.message}` }

  revalidatePath('/dashboard')
  return { data: data as Ticket }
}

export async function completeTicketAction(
  ticketId: string,
  agentId: string,
  notes?: string
): Promise<{ data?: Ticket; error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Verify agentId matches authenticated user
  if (agentId !== user.id) {
    return { error: 'No autorizado: agente no coincide' }
  }

  const { data, error } = await supabase.rpc('complete_ticket', {
    p_ticket_id: ticketId,
    p_agent_id: agentId,
    p_notes: notes || null,
  })

  if (error) return { error: `Error al completar atencion: ${error.message}` }

  const ticket = data as Ticket

  // Notify customer service is complete
  notifyTicketCompleted(ticket).catch(() => {})

  revalidatePath('/dashboard')
  revalidatePath('/queue')
  return { data: ticket }
}

export async function cancelTicketAction(
  ticketId: string,
  reason?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('tickets')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      notes: reason || 'Cancelado',
    })
    .eq('id', ticketId)

  if (error) return { error: `Error al cancelar ticket: ${error.message}` }

  revalidatePath('/dashboard')
  revalidatePath('/queue')
  return {}
}

export async function markNoShowAction(
  ticketId: string,
  agentId: string
): Promise<{ data?: Ticket; error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Verify agentId matches authenticated user
  if (agentId !== user.id) {
    return { error: 'No autorizado: agente no coincide' }
  }

  const { data, error } = await supabase.rpc('mark_ticket_no_show', {
    p_ticket_id: ticketId,
    p_agent_id: agentId,
  })

  if (error) return { error: `Error al marcar no-show: ${error.message}` }

  revalidatePath('/dashboard')
  revalidatePath('/queue')
  return { data: data as Ticket }
}

export async function getActiveQueueAction(
  branchId: string
): Promise<TicketWithRelations[]> {
  const supabase = await createClient()
  const today = getLocalDateString()

  const { data, error } = await supabase
    .from('tickets')
    .select(`*, service:services!tickets_service_id_fkey(*), station:stations(*), agent:users(*)`)
    .eq('branch_id', branchId)
    .in('status', ['waiting', 'called', 'serving'])
    .gte('created_at', today)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching queue:', error)
    return []
  }

  return (data || []) as TicketWithRelations[]
}

export async function getDailyStatsAction(branchId: string): Promise<DailyStats> {
  const supabase = await createClient()
  const today = getLocalDateString()

  const { data, error } = await supabase.rpc('get_daily_stats', {
    p_branch_id: branchId,
    p_date: today,
  })

  const empty: DailyStats = {
    total_tickets: 0, completed_tickets: 0, waiting_tickets: 0,
    serving_tickets: 0, no_show_tickets: 0, cancelled_tickets: 0,
    avg_wait_time_seconds: null, avg_service_time_seconds: null,
  }

  if (error) {
    console.error('Error fetching stats:', error)
    return empty
  }

  return (data?.[0] || empty) as DailyStats
}

export async function getServicesAction(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sort_order')

  if (error) return []
  return data || []
}

export async function getBranchesAction(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')

  if (error) return []
  return data || []
}

export async function getStationsAction(branchId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('station_number')

  if (error) return []
  return data || []
}

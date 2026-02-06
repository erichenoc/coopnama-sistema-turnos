import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/tickets/transfer - Transfer a ticket to another service/station
 * Body: { ticketId, newServiceId, reason, agentId }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { ticketId, newServiceId, reason, agentId } = await request.json()

    if (!ticketId || !newServiceId || !agentId) {
      return NextResponse.json(
        { error: 'ticketId, newServiceId, and agentId are required' },
        { status: 400 }
      )
    }

    // Get current ticket
    const { data: currentTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (fetchError || !currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Update the current ticket as transferred
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'transferred',
        completed_at: new Date().toISOString(),
        transfer_reason: reason || 'Transferido a otro servicio',
      })
      .eq('id', ticketId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create new ticket for the transferred service
    const { data: newTicket, error: createError } = await supabase.rpc('create_ticket', {
      p_organization_id: currentTicket.organization_id,
      p_branch_id: currentTicket.branch_id,
      p_service_id: newServiceId,
      p_customer_name: currentTicket.customer_name,
      p_customer_cedula: currentTicket.customer_cedula,
      p_customer_phone: currentTicket.customer_phone,
      p_priority: currentTicket.priority,
      p_priority_reason: currentTicket.priority_reason,
      p_source: currentTicket.source,
      p_member_id: currentTicket.member_id,
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Update new ticket with transfer reference
    await supabase
      .from('tickets')
      .update({
        transferred_from_ticket_id: ticketId,
        transferred_from_service_id: currentTicket.service_id,
        transfer_reason: reason || null,
      })
      .eq('id', newTicket.id)

    // Record in history
    await supabase.from('ticket_history').insert({
      ticket_id: ticketId,
      previous_status: currentTicket.status,
      new_status: 'transferred',
      changed_by: agentId,
      station_id: currentTicket.station_id,
      notes: `Transferido a servicio ${newServiceId}. ${reason || ''}`.trim(),
    })

    return NextResponse.json({
      originalTicket: { ...currentTicket, status: 'transferred' },
      newTicket,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/appointments/[id] - Get a single appointment
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('appointments')
    .select('*, service:services(*), branch:branches(name)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * PATCH /api/appointments/[id] - Update appointment (cancel, check-in, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.status) {
      updates.status = body.status

      if (body.status === 'cancelled') {
        updates.cancelled_at = new Date().toISOString()
        updates.cancellation_reason = body.cancellation_reason || null

        // Free up the slot if cancelling
        const { data: appointment } = await supabase
          .from('appointments')
          .select('slot_id')
          .eq('id', id)
          .single()

        if (appointment?.slot_id) {
          // Free up the slot
          await supabase
            .from('appointment_slots')
            .update({ is_available: true })
            .eq('id', appointment.slot_id)
        }
      }

      if (body.status === 'checked_in') {
        // Link to a ticket when checking in
        updates.ticket_id = body.ticket_id || null
      }
    }

    if (body.notes !== undefined) updates.notes = body.notes

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

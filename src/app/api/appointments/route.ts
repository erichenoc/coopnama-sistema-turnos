import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/appointments - List appointments with filters
 * Query: ?branchId=...&date=...&status=...&serviceId=...
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  const branchId = searchParams.get('branchId')
  const date = searchParams.get('date')
  const status = searchParams.get('status')
  const serviceId = searchParams.get('serviceId')
  const code = searchParams.get('code')

  // Public: lookup by confirmation code
  if (code) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, service:services(*), branch:branches(name)')
      .eq('confirmation_code', code.toUpperCase())
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  }

  let query = supabase
    .from('appointments')
    .select('*, service:services(*), branch:branches(name)')
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  if (branchId) query = query.eq('branch_id', branchId)
  if (date) query = query.eq('appointment_date', date)
  if (status) query = query.eq('status', status)
  if (serviceId) query = query.eq('service_id', serviceId)

  const { data, error } = await query.limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

/**
 * POST /api/appointments - Create a new appointment
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()

    const {
      organization_id,
      branch_id,
      service_id,
      customer_name,
      customer_phone,
      customer_cedula,
      customer_email,
      appointment_date,
      appointment_time,
      duration_minutes,
      notes,
      slot_id,
      member_id,
      is_recurring,
      recurrence_pattern,
      recurrence_end_date,
    } = body

    if (!organization_id || !branch_id || !service_id || !customer_name || !appointment_date || !appointment_time) {
      return NextResponse.json(
        { error: 'organization_id, branch_id, service_id, customer_name, appointment_date, and appointment_time are required' },
        { status: 400 }
      )
    }

    // If slot_id provided, check availability and increment booked_count
    if (slot_id) {
      const { data: slot, error: slotError } = await supabase
        .from('appointment_slots')
        .select('*')
        .eq('id', slot_id)
        .single()

      if (slotError || !slot) {
        return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
      }

      if (!slot.is_available || slot.booked_count >= slot.max_appointments) {
        return NextResponse.json({ error: 'Slot is no longer available' }, { status: 409 })
      }

      // Increment booked count
      const newCount = slot.booked_count + 1
      await supabase
        .from('appointment_slots')
        .update({
          booked_count: newCount,
          is_available: newCount < slot.max_appointments,
        })
        .eq('id', slot_id)
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        organization_id,
        branch_id,
        service_id,
        customer_name,
        customer_phone: customer_phone || null,
        customer_cedula: customer_cedula || null,
        customer_email: customer_email || null,
        appointment_date,
        appointment_time,
        duration_minutes: duration_minutes || 30,
        notes: notes || null,
        slot_id: slot_id || null,
        member_id: member_id || null,
        status: 'confirmed',
        is_recurring: is_recurring || false,
        recurrence_pattern: recurrence_pattern || null,
        recurrence_end_date: recurrence_end_date || null,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/appointments/slots - Get available appointment slots
 * Query: ?branchId=...&serviceId=...&date=...
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  const branchId = searchParams.get('branchId')
  const serviceId = searchParams.get('serviceId')
  const date = searchParams.get('date')

  if (!branchId || !serviceId || !date) {
    return NextResponse.json(
      { error: 'branchId, serviceId, and date are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('appointment_slots')
    .select('*')
    .eq('branch_id', branchId)
    .eq('service_id', serviceId)
    .eq('slot_date', date)
    .eq('is_available', true)
    .order('start_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

/**
 * POST /api/appointments/slots/generate - Generate slots for a date range
 * Body: { organizationId, branchId, serviceId, startDate, endDate, slotDuration?, maxPerSlot? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()

    const {
      organizationId,
      branchId,
      serviceId,
      startDate,
      endDate,
      slotDuration = 30,
      maxPerSlot = 1,
    } = body

    if (!organizationId || !branchId || !serviceId || !startDate) {
      return NextResponse.json(
        { error: 'organizationId, branchId, serviceId, and startDate are required' },
        { status: 400 }
      )
    }

    const end = endDate || startDate
    const generatedSlots = []
    const current = new Date(startDate)
    const endDt = new Date(end)

    while (current <= endDt) {
      const dateStr = current.toISOString().split('T')[0]

      const { data, error } = await supabase.rpc('generate_appointment_slots', {
        p_organization_id: organizationId,
        p_branch_id: branchId,
        p_service_id: serviceId,
        p_date: dateStr,
        p_slot_duration_minutes: slotDuration,
        p_max_per_slot: maxPerSlot,
      })

      if (!error && data) {
        generatedSlots.push(...data)
      }

      current.setDate(current.getDate() + 1)
    }

    return NextResponse.json({
      generated: generatedSlots.length,
      slots: generatedSlots,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

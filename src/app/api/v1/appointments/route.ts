import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { authenticateAPIKey, checkRateLimit } from '@/lib/api/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/v1/appointments
 * List appointments for the organization.
 * Query params: status, date_from, date_to, limit, offset
 */
export async function GET(req: NextRequest) {
  const keyInfo = await authenticateAPIKey(req)
  if (!keyInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed, remaining } = await checkRateLimit(keyInfo)
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  const params = req.nextUrl.searchParams

  let query = supabase
    .from('appointments')
    .select('id, customer_name, customer_phone, customer_email, appointment_date, appointment_time, duration_minutes, status, notes, service:services(name), is_recurring, recurrence_pattern', { count: 'exact' })
    .eq('organization_id', keyInfo.organizationId)
    .order('appointment_date', { ascending: true })

  if (params.get('status')) query = query.eq('status', params.get('status'))
  if (params.get('date_from')) query = query.gte('appointment_date', params.get('date_from')!)
  if (params.get('date_to')) query = query.lte('appointment_date', params.get('date_to')!)

  const limit = Math.min(parseInt(params.get('limit') || '50'), 100)
  const offset = parseInt(params.get('offset') || '0')
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { data, total: count, limit, offset },
    { headers: { 'X-RateLimit-Remaining': String(remaining) } }
  )
}

/**
 * POST /api/v1/appointments
 * Create a new appointment.
 */
export async function POST(req: NextRequest) {
  const keyInfo = await authenticateAPIKey(req)
  if (!keyInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!keyInfo.scopes.includes('write')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { allowed, remaining } = await checkRateLimit(keyInfo)
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = await req.json()
  const { branch_id, service_id, customer_name, customer_phone, customer_email, appointment_date, appointment_time, duration_minutes, notes } = body

  if (!branch_id || !service_id || !customer_name || !appointment_date || !appointment_time) {
    return NextResponse.json({
      error: 'branch_id, service_id, customer_name, appointment_date, and appointment_time are required',
    }, { status: 400 })
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      organization_id: keyInfo.organizationId,
      branch_id,
      service_id,
      customer_name,
      customer_phone: customer_phone || null,
      customer_email: customer_email || null,
      appointment_date,
      appointment_time,
      duration_minutes: duration_minutes || 30,
      notes: notes || null,
      status: 'confirmed',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { data },
    { status: 201, headers: { 'X-RateLimit-Remaining': String(remaining) } }
  )
}

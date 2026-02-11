import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLocalDateString } from '@/shared/utils/date'

/**
 * GET /api/tickets?branchId=xxx&status=waiting,called,serving&date=2026-02-06
 * List tickets with optional filters
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const branchId = searchParams.get('branchId')
  const status = searchParams.get('status')
  const date = searchParams.get('date') || getLocalDateString()
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  if (!branchId) {
    return NextResponse.json({ error: 'branchId is required' }, { status: 400 })
  }

  let query = supabase
    .from('tickets')
    .select('*, service:services!tickets_service_id_fkey(*), station:stations(*), agent:users(*)', { count: 'exact' })
    .eq('branch_id', branchId)
    .gte('created_at', date)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (status) {
    const statuses = status.split(',')
    query = query.in('status', statuses)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tickets: data, total: count })
}

/**
 * POST /api/tickets - Create a new ticket
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const {
      organization_id, branch_id, service_id,
      customer_name, customer_cedula, customer_phone,
      priority, priority_reason, source, member_id,
    } = body

    if (!organization_id || !branch_id || !service_id) {
      return NextResponse.json(
        { error: 'organization_id, branch_id, and service_id are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('create_ticket', {
      p_organization_id: organization_id,
      p_branch_id: branch_id,
      p_service_id: service_id,
      p_customer_name: customer_name || null,
      p_customer_cedula: customer_cedula || null,
      p_customer_phone: customer_phone || null,
      p_priority: priority || 0,
      p_priority_reason: priority_reason || null,
      p_source: source || 'web',
      p_member_id: member_id || null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ticket: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

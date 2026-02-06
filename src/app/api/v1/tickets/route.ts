import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { authenticateAPIKey, checkRateLimit } from '@/lib/api/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/v1/tickets
 * List tickets for the organization.
 * Query params: status, branch_id, date, limit, offset
 */
export async function GET(req: NextRequest) {
  const keyInfo = await authenticateAPIKey(req)
  if (!keyInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!keyInfo.scopes.includes('read')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { allowed, remaining } = await checkRateLimit(keyInfo)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    )
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  const params = req.nextUrl.searchParams

  let query = supabase
    .from('tickets')
    .select('id, ticket_number, customer_name, customer_phone, status, priority, created_at, called_at, completed_at, wait_time_seconds, service_time_seconds, service:services(name), station:stations(name)')
    .eq('organization_id', keyInfo.organizationId)
    .order('created_at', { ascending: false })

  if (params.get('status')) query = query.eq('status', params.get('status'))
  if (params.get('branch_id')) query = query.eq('branch_id', params.get('branch_id'))
  if (params.get('date')) query = query.gte('created_at', params.get('date')!)

  const limit = Math.min(parseInt(params.get('limit') || '50'), 100)
  const offset = parseInt(params.get('offset') || '0')
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await supabase
    .from('tickets')
    .select('id, ticket_number, customer_name, customer_phone, status, priority, created_at, called_at, completed_at, wait_time_seconds, service_time_seconds, service:services(name), station:stations(name)', { count: 'exact' })
    .eq('organization_id', keyInfo.organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { data, total: count, limit, offset },
    { headers: { 'X-RateLimit-Remaining': String(remaining) } }
  )
}

/**
 * POST /api/v1/tickets
 * Create a new ticket.
 * Body: { branch_id, service_id, customer_name?, customer_phone?, priority? }
 */
export async function POST(req: NextRequest) {
  const keyInfo = await authenticateAPIKey(req)
  if (!keyInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!keyInfo.scopes.includes('write')) {
    return NextResponse.json({ error: 'Insufficient permissions - write scope required' }, { status: 403 })
  }

  const { allowed, remaining } = await checkRateLimit(keyInfo)
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = await req.json()
  const { branch_id, service_id, customer_name, customer_phone, priority } = body

  if (!branch_id || !service_id) {
    return NextResponse.json({ error: 'branch_id and service_id are required' }, { status: 400 })
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase.rpc('generate_ticket', {
    p_organization_id: keyInfo.organizationId,
    p_branch_id: branch_id,
    p_service_id: service_id,
    p_customer_name: customer_name || null,
    p_customer_phone: customer_phone || null,
    p_priority: priority || 0,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { data: data?.[0] || data },
    { status: 201, headers: { 'X-RateLimit-Remaining': String(remaining) } }
  )
}

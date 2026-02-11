import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function validateApiKey(request: NextRequest): boolean {
  const key = request.headers.get('x-api-key')
  const validKey = process.env.API_SECRET_KEY
  if (!key || !validKey) return false
  // Use constant-time comparison to prevent timing attacks
  if (key.length !== validKey.length) return false
  let result = 0
  for (let i = 0; i < key.length; i++) {
    result |= key.charCodeAt(i) ^ validKey.charCodeAt(i)
  }
  return result === 0
}

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branch_id = searchParams.get('branch_id')
  const status = searchParams.get('status')
  const date = searchParams.get('date')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = await createClient()
  let query = supabase
    .from('tickets')
    .select('*, service:services!tickets_service_id_fkey(name, code), station:stations(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (branch_id) query = query.eq('branch_id', branch_id)
  if (status) query = query.eq('status', status)
  if (date) query = query.gte('created_at', `${date}T00:00:00`).lt('created_at', `${date}T23:59:59`)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count, limit, offset })
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { branch_id, service_id, customer_name, member_id, priority, source } = body

  if (!branch_id || !service_id) {
    return NextResponse.json({ error: 'branch_id and service_id are required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('generate_ticket', {
    p_branch_id: branch_id,
    p_service_id: service_id,
    p_customer_name: customer_name || null,
    p_member_id: member_id || null,
    p_priority: priority || 0,
    p_source: source || 'api',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

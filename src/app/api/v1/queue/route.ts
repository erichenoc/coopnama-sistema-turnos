import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { authenticateAPIKey, checkRateLimit } from '@/lib/api/auth'
import { getLocalDateString } from '@/shared/utils/date'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/v1/queue
 * Get current queue status.
 * Query params: branch_id (required)
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

  const branchId = req.nextUrl.searchParams.get('branch_id')
  if (!branchId) {
    return NextResponse.json({ error: 'branch_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  const today = getLocalDateString()

  // Get active tickets
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, ticket_number, customer_name, status, priority, created_at, service:services(name)')
    .eq('organization_id', keyInfo.organizationId)
    .eq('branch_id', branchId)
    .in('status', ['waiting', 'called', 'serving'])
    .gte('created_at', today)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  const waiting = (tickets || []).filter(t => t.status === 'waiting')
  const called = (tickets || []).filter(t => t.status === 'called')
  const serving = (tickets || []).filter(t => t.status === 'serving')

  // Get active agents
  const { count: activeAgents } = await supabase
    .from('agent_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('is_active', true)

  return NextResponse.json({
    data: {
      waiting: { count: waiting.length, tickets: waiting },
      called: { count: called.length, tickets: called },
      serving: { count: serving.length, tickets: serving },
      active_agents: activeAgents || 0,
      total_active: (tickets || []).length,
    },
  }, { headers: { 'X-RateLimit-Remaining': String(remaining) } })
}

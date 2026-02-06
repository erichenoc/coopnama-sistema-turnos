import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/tickets/call-next - Call the next ticket in queue
 * Body: { stationId, agentId }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { stationId, agentId } = await request.json()

    if (!stationId || !agentId) {
      return NextResponse.json(
        { error: 'stationId and agentId are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('call_next_ticket', {
      p_station_id: stationId,
      p_agent_id: agentId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'No tickets in queue' }, { status: 404 })
    }

    return NextResponse.json({ ticket: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  const branchId = searchParams.get('branch_id')
  const organizationId = searchParams.get('organization_id')

  if (!type || !branchId || !organizationId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  try {
    switch (type) {
      case 'agent_performance': {
        const { data, error } = await supabase
          .from('agent_performance')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('branch_id', branchId)
          .order('tickets_served', { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
      }

      case 'heatmap': {
        const { data, error } = await supabase
          .from('service_demand_heatmap')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('branch_id', branchId)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
      }

      case 'csat': {
        const { data, error } = await supabase
          .from('csat_summary')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('branch_id', branchId)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

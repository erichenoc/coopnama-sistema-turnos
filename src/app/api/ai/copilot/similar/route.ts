import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { serviceId, organizationId, limit = 5 } = await request.json()

    if (!serviceId || !organizationId) {
      return NextResponse.json({ cases: [] })
    }

    const supabase = await createClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('tickets')
      .select(
        'ticket_number, notes, rating, service_time_seconds, created_at, service:service_id(name)'
      )
      .eq('organization_id', organizationId)
      .eq('service_id', serviceId)
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Similar cases query error:', error)
      return NextResponse.json({ cases: [] })
    }

    const cases = (data || []).map((t: Record<string, unknown>) => ({
      ticketNumber: t.ticket_number,
      serviceName: (t.service as { name: string } | null)?.name || 'N/A',
      resolution: t.notes || null,
      rating: t.rating || null,
      serviceTimeSeconds: t.service_time_seconds || null,
      date: new Date(t.created_at as string).toLocaleDateString('es-DO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    }))

    return NextResponse.json({ cases })
  } catch (error) {
    console.error('Similar cases error:', error)
    return NextResponse.json({ cases: [] })
  }
}

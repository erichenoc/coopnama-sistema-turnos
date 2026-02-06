import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface AnomalyResult {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  metricValue: number
  thresholdValue: number
  organizationId: string
  branchId?: string
}

const THRESHOLDS = {
  high_wait_time: { medium: 20, high: 35, critical: 50 }, // minutes
  high_no_show: { medium: 15, high: 25, critical: 40 }, // percent
  low_csat: { medium: 70, high: 50, critical: 30 }, // percent (below)
  traffic_spike: { medium: 1.5, high: 2.0, critical: 3.0 }, // multiplier vs avg
}

function getSeverity(value: number, thresholds: { medium: number; high: number; critical: number }, inverse = false): 'low' | 'medium' | 'high' | 'critical' {
  if (inverse) {
    if (value <= thresholds.critical) return 'critical'
    if (value <= thresholds.high) return 'high'
    if (value <= thresholds.medium) return 'medium'
    return 'low'
  }
  if (value >= thresholds.critical) return 'critical'
  if (value >= thresholds.high) return 'high'
  if (value >= thresholds.medium) return 'medium'
  return 'low'
}

export async function detectAnomalies(): Promise<{ detected: number; checked: number }> {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  const anomalies: AnomalyResult[] = []

  // Get all active organizations
  const { data: orgs } = await supabase.from('organizations').select('id').eq('is_active', true)
  if (!orgs) return { detected: 0, checked: 0 }

  for (const org of orgs) {
    // 1. Check high wait times (last 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    const { data: recentTickets } = await supabase
      .from('tickets')
      .select('wait_time_seconds')
      .eq('organization_id', org.id)
      .in('status', ['serving', 'completed'])
      .gte('called_at', fourHoursAgo)
      .not('wait_time_seconds', 'is', null)

    if (recentTickets && recentTickets.length >= 3) {
      const avgWait = recentTickets.reduce((sum, t) => sum + (t.wait_time_seconds || 0), 0) / recentTickets.length / 60
      const severity = getSeverity(avgWait, THRESHOLDS.high_wait_time)
      if (severity !== 'low') {
        anomalies.push({
          type: 'high_wait_time',
          severity,
          title: 'Tiempo de espera elevado',
          description: `Promedio de espera: ${avgWait.toFixed(1)} min en las ultimas 4 horas (${recentTickets.length} turnos)`,
          metricValue: avgWait,
          thresholdValue: THRESHOLDS.high_wait_time.medium,
          organizationId: org.id,
        })
      }
    }

    // 2. Check no-show rate (today)
    const today = new Date().toISOString().split('T')[0]
    const { data: todayTickets } = await supabase
      .from('tickets')
      .select('status')
      .eq('organization_id', org.id)
      .gte('created_at', today)

    if (todayTickets && todayTickets.length >= 5) {
      const noShows = todayTickets.filter(t => t.status === 'no_show').length
      const noShowRate = (noShows / todayTickets.length) * 100
      const severity = getSeverity(noShowRate, THRESHOLDS.high_no_show)
      if (severity !== 'low') {
        anomalies.push({
          type: 'high_no_show',
          severity,
          title: 'Tasa alta de no presentados',
          description: `${noShowRate.toFixed(1)}% no presentados hoy (${noShows}/${todayTickets.length})`,
          metricValue: noShowRate,
          thresholdValue: THRESHOLDS.high_no_show.medium,
          organizationId: org.id,
        })
      }
    }

    // 3. Check low CSAT (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: ratedTickets } = await supabase
      .from('tickets')
      .select('rating')
      .eq('organization_id', org.id)
      .not('rating', 'is', null)
      .gte('completed_at', sevenDaysAgo)

    if (ratedTickets && ratedTickets.length >= 5) {
      const satisfied = ratedTickets.filter(t => (t.rating || 0) >= 4).length
      const csatPct = (satisfied / ratedTickets.length) * 100
      const severity = getSeverity(csatPct, THRESHOLDS.low_csat, true)
      if (severity !== 'low') {
        anomalies.push({
          type: 'low_csat',
          severity,
          title: 'Satisfaccion del cliente baja',
          description: `CSAT: ${csatPct.toFixed(1)}% en los ultimos 7 dias (${ratedTickets.length} calificaciones)`,
          metricValue: csatPct,
          thresholdValue: THRESHOLDS.low_csat.medium,
          organizationId: org.id,
        })
      }
    }

    // 4. Check traffic spike (compare today vs 7-day average)
    if (todayTickets) {
      const todayCount = todayTickets.length
      const { count: weekCount } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .gte('created_at', sevenDaysAgo)

      if (weekCount && weekCount > 0) {
        const dailyAvg = weekCount / 7
        if (dailyAvg > 0) {
          const multiplier = todayCount / dailyAvg
          const severity = getSeverity(multiplier, THRESHOLDS.traffic_spike)
          if (severity !== 'low') {
            anomalies.push({
              type: 'traffic_spike',
              severity,
              title: 'Pico de trafico detectado',
              description: `${todayCount} turnos hoy vs promedio de ${dailyAvg.toFixed(0)}/dia (${multiplier.toFixed(1)}x)`,
              metricValue: multiplier,
              thresholdValue: THRESHOLDS.traffic_spike.medium,
              organizationId: org.id,
            })
          }
        }
      }
    }
  }

  // Insert anomalies that don't already exist (avoid duplicates within 4 hours)
  let inserted = 0
  const dedupeWindow = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  for (const anomaly of anomalies) {
    const { data: existing } = await supabase
      .from('ai_anomalies')
      .select('id')
      .eq('organization_id', anomaly.organizationId)
      .eq('anomaly_type', anomaly.type)
      .eq('is_resolved', false)
      .gte('created_at', dedupeWindow)
      .limit(1)

    if (!existing || existing.length === 0) {
      const { error } = await supabase.from('ai_anomalies').insert({
        organization_id: anomaly.organizationId,
        branch_id: anomaly.branchId || null,
        anomaly_type: anomaly.type,
        severity: anomaly.severity,
        title: anomaly.title,
        description: anomaly.description,
        metric_value: anomaly.metricValue,
        threshold_value: anomaly.thresholdValue,
      })
      if (!error) inserted++
    }
  }

  return { detected: inserted, checked: orgs.length }
}

'use server'

import { createClient } from '@/lib/supabase/server'

export interface HourlyForecast {
  hour: number
  predicted: number
  actual: number | null
}

export interface DailyForecast {
  date: string
  hourly: HourlyForecast[]
  totalPredicted: number
  totalActual: number | null
}

export interface StaffingRecommendation {
  hour: number
  predictedTickets: number
  recommendedAgents: number
  reason: string
}

/**
 * Generate demand forecast for a specific date and branch.
 * Uses 4-week historical patterns weighted by recency.
 */
export async function getForecast(
  organizationId: string,
  branchId: string,
  targetDate: string
): Promise<DailyForecast> {
  const supabase = await createClient()

  // Check cache first
  const { data: cached } = await supabase
    .from('demand_forecasts')
    .select('hour, predicted_count, actual_count')
    .eq('branch_id', branchId)
    .eq('forecast_date', targetDate)
    .order('hour')

  if (cached && cached.length > 0) {
    const hourly = cached.map(c => ({
      hour: c.hour,
      predicted: Math.round(Number(c.predicted_count)),
      actual: c.actual_count,
    }))
    return {
      date: targetDate,
      hourly,
      totalPredicted: hourly.reduce((s, h) => s + h.predicted, 0),
      totalActual: hourly.some(h => h.actual !== null)
        ? hourly.reduce((s, h) => s + (h.actual || 0), 0)
        : null,
    }
  }

  // Generate forecast from historical data
  const targetDay = new Date(targetDate).getDay()
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()

  const { data: historical } = await supabase
    .from('tickets')
    .select('created_at')
    .eq('branch_id', branchId)
    .eq('organization_id', organizationId)
    .gte('created_at', fourWeeksAgo)
    .in('status', ['completed', 'serving', 'waiting', 'called'])

  if (!historical || historical.length === 0) {
    // No data - return empty forecast
    const hourly: HourlyForecast[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      predicted: 0,
      actual: null,
    }))
    return { date: targetDate, hourly, totalPredicted: 0, totalActual: null }
  }

  // Group by week and hour, filtering for same day-of-week
  const weekBuckets: Map<number, Map<number, number>> = new Map()

  for (const ticket of historical) {
    const d = new Date(ticket.created_at)
    if (d.getDay() !== targetDay) continue

    const weekNum = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const hour = d.getHours()

    if (!weekBuckets.has(weekNum)) weekBuckets.set(weekNum, new Map())
    const hourMap = weekBuckets.get(weekNum)!
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
  }

  // Weighted moving average (recent weeks weight more)
  const weights = [0.4, 0.3, 0.2, 0.1] // week 0 = most recent
  const hourly: HourlyForecast[] = Array.from({ length: 24 }, (_, hour) => {
    let weightedSum = 0
    let totalWeight = 0

    for (const [weekNum, hourMap] of weekBuckets) {
      const weight = weights[Math.min(weekNum, 3)] || 0.1
      const count = hourMap.get(hour) || 0
      weightedSum += count * weight
      totalWeight += weight
    }

    const predicted = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
    return { hour, predicted, actual: null }
  })

  // Cache the forecast
  const inserts = hourly
    .filter(h => h.predicted > 0)
    .map(h => ({
      organization_id: organizationId,
      branch_id: branchId,
      forecast_date: targetDate,
      hour: h.hour,
      predicted_count: h.predicted,
    }))

  if (inserts.length > 0) {
    await supabase.from('demand_forecasts').upsert(inserts, {
      onConflict: 'branch_id,forecast_date,hour',
    })
  }

  return {
    date: targetDate,
    hourly,
    totalPredicted: hourly.reduce((s, h) => s + h.predicted, 0),
    totalActual: null,
  }
}

/**
 * Get staffing recommendations based on forecast.
 */
export async function getStaffingRecommendations(
  organizationId: string,
  branchId: string,
  targetDate: string,
  avgServiceMinutes: number = 10,
  slaTargetMinutes: number = 15
): Promise<StaffingRecommendation[]> {
  const forecast = await getForecast(organizationId, branchId, targetDate)

  return forecast.hourly
    .filter(h => h.predicted > 0)
    .map(h => {
      // How many agents needed to serve all tickets within SLA target?
      const ticketsPerAgentPerHour = Math.floor(60 / avgServiceMinutes)
      const recommended = Math.max(1, Math.ceil(h.predicted / ticketsPerAgentPerHour))

      let reason: string
      if (h.predicted <= 5) reason = 'Demanda baja'
      else if (h.predicted <= 15) reason = 'Demanda moderada'
      else if (h.predicted <= 30) reason = 'Demanda alta'
      else reason = 'Demanda muy alta'

      return {
        hour: h.hour,
        predictedTickets: h.predicted,
        recommendedAgents: recommended,
        reason,
      }
    })
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { getModel } from './provider'

interface WaitTimePrediction {
  estimatedMinutes: number
  confidence: 'high' | 'medium' | 'low'
  explanation: string
}

/**
 * Predicts wait time based on historical patterns and current queue state.
 *
 * Uses historical data from the last 4 weeks (same day-of-week, similar hour)
 * to estimate wait times with confidence levels.
 *
 * @param branchId - UUID of the branch
 * @param serviceId - UUID of the service (null for all services)
 * @param currentQueueLength - Number of people currently waiting
 * @param activeAgents - Number of agents currently serving
 * @returns Prediction with estimated minutes, confidence level, and explanation
 */
export async function predictWaitTime(
  branchId: string,
  serviceId: string | null,
  currentQueueLength: number,
  activeAgents: number
): Promise<WaitTimePrediction> {
  const supabase = await createClient()

  // Build SQL query for historical data
  // Get completed tickets from last 4 weeks, same day-of-week, similar hour (+/- 2 hours)
  let query = supabase
    .from('tickets')
    .select('wait_time_seconds, service_time_seconds, created_at')
    .eq('branch_id', branchId)
    .eq('status', 'completed')
    // Filter by time range (last 28 days)
    .gte('created_at', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())

  // Add service filter if specified
  if (serviceId) {
    query = query.eq('service_id', serviceId)
  }

  const { data: historicalTickets, error } = await query

  if (error || !historicalTickets) {
    // Fallback to basic estimation without historical data
    return getFallbackPrediction(currentQueueLength, activeAgents)
  }

  // Filter by day of week and hour (client-side since Supabase doesn't support EXTRACT in queries easily)
  const now = new Date()
  const currentDayOfWeek = now.getDay()
  const currentHour = now.getHours()

  const relevantTickets = historicalTickets.filter(ticket => {
    const ticketDate = new Date(ticket.created_at || '')
    const ticketDayOfWeek = ticketDate.getDay()
    const ticketHour = ticketDate.getHours()

    // Same day of week and within +/- 2 hours
    return (
      ticketDayOfWeek === currentDayOfWeek &&
      Math.abs(ticketHour - currentHour) <= 2 &&
      ticket.wait_time_seconds != null &&
      ticket.service_time_seconds != null
    )
  })

  const sampleSize = relevantTickets.length

  // Determine confidence based on sample size
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (sampleSize >= 10) {
    confidence = 'high'
  } else if (sampleSize >= 3) {
    confidence = 'medium'
  }

  // Calculate averages
  const avgWaitSeconds = sampleSize > 0
    ? relevantTickets.reduce((sum, t) => sum + (t.wait_time_seconds || 0), 0) / sampleSize
    : 180 // Default 3 minutes if no data

  const avgServiceSeconds = sampleSize > 0
    ? relevantTickets.reduce((sum, t) => sum + (t.service_time_seconds || 0), 0) / sampleSize
    : 300 // Default 5 minutes if no data

  // Calculate weighted estimate
  // Formula: (avg_wait * queue_length + avg_service * queue_length) / max(activeAgents, 1)
  const safeActiveAgents = Math.max(activeAgents, 1)
  const totalEstimatedSeconds =
    ((avgWaitSeconds + avgServiceSeconds) * currentQueueLength) / safeActiveAgents

  const estimatedMinutes = Math.ceil(totalEstimatedSeconds / 60)

  // Generate explanation
  let explanation: string

  if (confidence === 'low' && process.env.OPENROUTER_API_KEY) {
    // Use AI for narrative explanation when confidence is low
    const model = getModel(true) // Use fast model
    if (model) {
      try {
        const { text } = await generateText({
          model,
          maxOutputTokens: 100,
          system: 'Eres un asistente que explica estimaciones de tiempo de espera en español de forma breve y amigable.',
          messages: [
            {
              role: 'user',
              content: `Hay ${currentQueueLength} personas en cola, ${activeAgents} agentes activos. Tenemos ${sampleSize} datos históricos. Tiempo estimado: ${estimatedMinutes} minutos. Explica brevemente esta estimación.`
            }
          ]
        })
        explanation = text
      } catch {
        explanation = getSimpleExplanation(estimatedMinutes, sampleSize, confidence)
      }
    } else {
      explanation = getSimpleExplanation(estimatedMinutes, sampleSize, confidence)
    }
  } else {
    explanation = getSimpleExplanation(estimatedMinutes, sampleSize, confidence)
  }

  return {
    estimatedMinutes,
    confidence,
    explanation
  }
}

/**
 * Fallback prediction when no historical data is available
 */
function getFallbackPrediction(
  currentQueueLength: number,
  activeAgents: number
): WaitTimePrediction {
  // Simple estimate: 5 minutes per person / number of agents
  const safeActiveAgents = Math.max(activeAgents, 1)
  const estimatedMinutes = Math.ceil((currentQueueLength * 5) / safeActiveAgents)

  return {
    estimatedMinutes,
    confidence: 'low',
    explanation: `Estimación basada en ${currentQueueLength} personas en cola y ${activeAgents} ${activeAgents === 1 ? 'agente' : 'agentes'} activos. Sin datos históricos suficientes para mayor precisión.`
  }
}

/**
 * Generate a simple Spanish explanation
 */
function getSimpleExplanation(
  estimatedMinutes: number,
  sampleSize: number,
  confidence: 'high' | 'medium' | 'low'
): string {
  const confidenceText = {
    high: 'alta confianza',
    medium: 'confianza moderada',
    low: 'estimación aproximada'
  }

  if (sampleSize === 0) {
    return `Tiempo estimado: ${estimatedMinutes} ${estimatedMinutes === 1 ? 'minuto' : 'minutos'} (${confidenceText[confidence]}, sin datos históricos).`
  }

  return `Tiempo estimado: ${estimatedMinutes} ${estimatedMinutes === 1 ? 'minuto' : 'minutos'} (${confidenceText[confidence]} basada en ${sampleSize} ${sampleSize === 1 ? 'turno similar' : 'turnos similares'}).`
}

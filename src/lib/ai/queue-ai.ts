'use server'

import { generateText } from 'ai'
import { getModel } from './provider'

export async function analyzeWaitTime(
  avgWaitSeconds: number,
  queueLength: number,
  agentsActive: number
): Promise<{ prediction: string; suggestion: string }> {
  const model = getModel()

  if (!model) {
    const estimatedMinutes = Math.ceil((avgWaitSeconds * queueLength) / Math.max(agentsActive, 1) / 60)
    return {
      prediction: `~${estimatedMinutes} minutos estimados de espera`,
      suggestion: queueLength > 10 ? 'Considere abrir mas ventanillas' : 'Flujo normal',
    }
  }

  try {
    const { text } = await generateText({
      model,
      maxOutputTokens: 200,
      prompt: `Eres un asistente de gestion de colas para una cooperativa dominicana.
Datos actuales: ${queueLength} personas en espera, ${agentsActive} agentes activos, tiempo promedio de espera ${Math.round(avgWaitSeconds / 60)} minutos.
Responde SOLO con JSON: {"prediction": "texto corto del tiempo estimado", "suggestion": "una sugerencia breve para mejorar"}`,
    })

    return JSON.parse(text)
  } catch {
    return {
      prediction: `~${Math.ceil(avgWaitSeconds * queueLength / Math.max(agentsActive, 1) / 60)} min`,
      suggestion: 'Flujo normal',
    }
  }
}

export async function generateAgentSuggestion(
  serviceName: string,
  customerName: string | null,
  ticketNotes: string | null
): Promise<string> {
  const model = getModel()

  if (!model) {
    return `Bienvenido${customerName ? ` ${customerName}` : ''}. Servicio: ${serviceName}.`
  }

  try {
    const { text } = await generateText({
      model,
      maxOutputTokens: 150,
      prompt: `Eres un co-piloto para agentes de una cooperativa dominicana. El cliente ${customerName || 'anonimo'} necesita: ${serviceName}. ${ticketNotes ? `Notas: ${ticketNotes}` : ''}.
Dame una sugerencia breve (1-2 oraciones) para el agente sobre como atender mejor a este cliente. Responde SOLO el texto de la sugerencia.`,
    })

    return text || 'Atienda al cliente con cortesia.'
  } catch {
    return 'Atienda al cliente con cortesia.'
  }
}

'use server'

import Anthropic from '@anthropic-ai/sdk'

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

export async function analyzeWaitTime(
  avgWaitSeconds: number,
  queueLength: number,
  agentsActive: number
): Promise<{ prediction: string; suggestion: string }> {
  const client = getClient()

  if (!client) {
    // Fallback when no API key
    const estimatedMinutes = Math.ceil((avgWaitSeconds * queueLength) / Math.max(agentsActive, 1) / 60)
    return {
      prediction: `~${estimatedMinutes} minutos estimados de espera`,
      suggestion: queueLength > 10 ? 'Considere abrir mas ventanillas' : 'Flujo normal',
    }
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Eres un asistente de gestion de colas para una cooperativa dominicana.
Datos actuales: ${queueLength} personas en espera, ${agentsActive} agentes activos, tiempo promedio de espera ${Math.round(avgWaitSeconds/60)} minutos.
Responde SOLO con JSON: {"prediction": "texto corto del tiempo estimado", "suggestion": "una sugerencia breve para mejorar"}`
    }]
  })

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return JSON.parse(text)
  } catch {
    return {
      prediction: `~${Math.ceil(avgWaitSeconds * queueLength / Math.max(agentsActive, 1) / 60)} min`,
      suggestion: 'Flujo normal'
    }
  }
}

export async function generateAgentSuggestion(
  serviceName: string,
  customerName: string | null,
  ticketNotes: string | null
): Promise<string> {
  const client = getClient()

  if (!client) {
    return `Bienvenido${customerName ? ` ${customerName}` : ''}. Servicio: ${serviceName}.`
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Eres un co-piloto para agentes de una cooperativa dominicana. El cliente ${customerName || 'anonimo'} necesita: ${serviceName}. ${ticketNotes ? `Notas: ${ticketNotes}` : ''}.
Dame una sugerencia breve (1-2 oraciones) para el agente sobre como atender mejor a este cliente. Responde SOLO el texto de la sugerencia.`
    }]
  })

  return message.content[0].type === 'text' ? message.content[0].text : 'Atienda al cliente con cortesia.'
}

export async function isAIEnabled(): Promise<boolean> {
  return !!process.env.ANTHROPIC_API_KEY
}

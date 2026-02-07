'use server'

import { generateText } from 'ai'
import { getModel } from './provider'

/**
 * AI-powered sentiment analysis for customer feedback.
 * Uses OpenRouter via Vercel AI SDK if available, falls back to keyword-based analysis.
 */

type Sentiment = 'positive' | 'neutral' | 'negative'

export async function analyzeSentiment(text: string): Promise<Sentiment> {
  const model = getModel(true) // Use fast model for simple classification

  if (!model) {
    return inferBasicSentiment(text)
  }

  try {
    const { text: result } = await generateText({
      model,
      maxOutputTokens: 10,
      prompt: `Clasifica el sentimiento de este comentario de servicio al cliente en exactamente una palabra: "positive", "neutral", o "negative".\n\nComentario: "${text}"`,
    })

    const lower = (result || '').toLowerCase().trim()
    if (lower.includes('positive')) return 'positive'
    if (lower.includes('negative')) return 'negative'
    return 'neutral'
  } catch {
    return inferBasicSentiment(text)
  }
}

/** Simple keyword-based fallback when no AI API key is available */
function inferBasicSentiment(text: string): Sentiment {
  const lower = text.toLowerCase()
  const positiveWords = ['excelente', 'bueno', 'rapido', 'bien', 'genial', 'gracias', 'amable', 'eficiente', 'perfecto', 'satisfecho']
  const negativeWords = ['malo', 'lento', 'horrible', 'pesimo', 'demora', 'mal', 'terrible', 'peor', 'insatisfecho', 'queja']

  const posCount = positiveWords.filter(w => lower.includes(w)).length
  const negCount = negativeWords.filter(w => lower.includes(w)).length

  if (posCount > negCount) return 'positive'
  if (negCount > posCount) return 'negative'
  return 'neutral'
}

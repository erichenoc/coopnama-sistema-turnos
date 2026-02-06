'use server'

/**
 * AI-powered sentiment analysis for customer feedback.
 * Uses Claude API if available, falls back to 'neutral'.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

type Sentiment = 'positive' | 'neutral' | 'negative'

export async function analyzeSentiment(text: string): Promise<Sentiment> {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your_anthropic_api_key') {
    return inferBasicSentiment(text)
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: `Clasifica el sentimiento de este comentario de servicio al cliente en exactamente una palabra: "positive", "neutral", o "negative".\n\nComentario: "${text}"`,
        }],
      }),
    })

    if (!response.ok) return inferBasicSentiment(text)

    const data = await response.json()
    const result = (data.content?.[0]?.text || '').toLowerCase().trim()

    if (result.includes('positive')) return 'positive'
    if (result.includes('negative')) return 'negative'
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

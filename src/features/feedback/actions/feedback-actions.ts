'use server'

import { createClient } from '@/lib/supabase/server'
import { analyzeSentiment } from '@/lib/ai/sentiment'

interface SubmitFeedbackInput {
  ticketId: string
  rating: number // 1-5
  comment?: string
}

export async function submitFeedbackAction(input: SubmitFeedbackInput) {
  try {
    const supabase = await createClient()

    // Analyze sentiment if comment provided
    let sentiment: string | null = null
    if (input.comment && input.comment.trim().length > 0) {
      sentiment = await analyzeSentiment(input.comment)
    }

    const { error } = await supabase
      .from('tickets')
      .update({
        rating: input.rating,
        feedback_comment: input.comment || null,
        feedback_sentiment: sentiment,
      })
      .eq('id', input.ticketId)

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Feedback submission error:', err)
    return { error: 'Error al enviar la evaluacion' }
  }
}

import { createOpenRouter } from '@openrouter/ai-sdk-provider'

/**
 * Central AI provider using OpenRouter.
 * All AI features route through this single configuration point.
 * Supports 300+ models via OpenRouter (Claude, GPT, Gemini, etc.)
 */

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5-20250929'
const DEFAULT_FAST_MODEL = 'anthropic/claude-haiku-4-5-20251001'

function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null
  return createOpenRouter({ apiKey })
}

/**
 * Get the AI model for use with Vercel AI SDK functions (generateText, streamText, etc.)
 * @param fast - Use the fast/cheap model for simple tasks (sentiment, classification)
 */
export function getModel(fast = false) {
  const openrouter = getOpenRouter()
  if (!openrouter) return null

  const modelId = fast
    ? (process.env.OPENROUTER_FAST_MODEL || DEFAULT_FAST_MODEL)
    : (process.env.OPENROUTER_MODEL || DEFAULT_MODEL)

  return openrouter(modelId)
}

/**
 * Check if AI features are enabled (OpenRouter API key is configured)
 */
export async function isAIEnabled(): Promise<boolean> {
  return !!process.env.OPENROUTER_API_KEY
}

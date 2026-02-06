/**
 * Inworld AI TTS Service
 * Servicio de Text-to-Speech para anuncios de turnos en COOPNAMA
 *
 * API Docs: https://docs.inworld.ai/api-reference/ttsAPI/texttospeech/synthesize-speech
 */

const INWORLD_TTS_API = 'https://api.inworld.ai/tts/v1/voice'
const INWORLD_VOICES_API = 'https://api.inworld.ai/tts/v1/voices'

export interface InworldTTSConfig {
  voiceId: string
  modelId: string
  speakingRate?: number
  temperature?: number
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS' | 'FLAC'
  sampleRateHertz?: number
}

export interface SynthesizeResponse {
  audioContent: string // base64-encoded audio
  usage: {
    processedCharactersCount: number
    modelId: string
  }
}

export interface InworldVoice {
  voiceId: string
  name: string
  language: string
  gender: string
}

const DEFAULT_CONFIG: InworldTTSConfig = {
  voiceId: 'Olivia', // fallback, will be overridden by env or Spanish voice
  modelId: process.env.INWORLD_TTS_MODEL || 'inworld-tts-1.5-max',
  speakingRate: 0.9,
  temperature: 1.1,
  audioEncoding: 'MP3',
  sampleRateHertz: 48000,
}

function getWriteKey(): string {
  const key = process.env.INWORLD_TTS_WRITE_KEY
  if (!key) throw new Error('INWORLD_TTS_WRITE_KEY not configured')
  return key
}

function getReadKey(): string {
  const key = process.env.INWORLD_TTS_READ_KEY
  if (!key) throw new Error('INWORLD_TTS_READ_KEY not configured')
  return key
}

/**
 * Synthesize speech from text using Inworld TTS API
 */
export async function synthesizeSpeech(
  text: string,
  config?: Partial<InworldTTSConfig>
): Promise<SynthesizeResponse> {
  const merged = { ...DEFAULT_CONFIG, ...config }

  // Use env voice if set
  if (process.env.INWORLD_TTS_VOICE_ID) {
    merged.voiceId = process.env.INWORLD_TTS_VOICE_ID
  }

  const response = await fetch(INWORLD_TTS_API, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${getWriteKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId: merged.voiceId,
      modelId: merged.modelId,
      temperature: merged.temperature,
      audioConfig: {
        audioEncoding: merged.audioEncoding,
        sampleRateHertz: merged.sampleRateHertz,
        speakingRate: merged.speakingRate,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Inworld TTS error (${response.status}): ${error}`)
  }

  return response.json()
}

/**
 * List available voices, optionally filtered by language
 */
export async function listVoices(language?: string): Promise<InworldVoice[]> {
  const url = new URL(INWORLD_VOICES_API)
  if (language) url.searchParams.set('language', language)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${getReadKey()}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Inworld list voices error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return data.voices || data || []
}

/**
 * Generate announcement text for a ticket call
 */
export function buildAnnouncementText(
  ticketNumber: string,
  stationName: string,
  customerName?: string | null
): string {
  const parts = [`Turno ${ticketNumber}`]

  if (customerName) {
    parts.push(`${customerName}`)
  }

  parts.push(`por favor pasar a ${stationName}`)

  return parts.join(', ')
}

/**
 * Check if Inworld TTS is configured and available
 */
export function isTTSEnabled(): boolean {
  return !!(process.env.INWORLD_TTS_WRITE_KEY)
}

import { NextRequest, NextResponse } from 'next/server'
import { listVoices, isTTSEnabled } from '@/lib/inworld/tts'

export async function GET(request: NextRequest) {
  if (!isTTSEnabled()) {
    return NextResponse.json(
      { error: 'TTS not configured' },
      { status: 503 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language') || undefined

    const voices = await listVoices(language)

    return NextResponse.json({ voices })
  } catch (error) {
    console.error('List voices error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list voices' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { synthesizeSpeech, buildAnnouncementText, isTTSEnabled } from '@/lib/inworld/tts'

export async function POST(request: NextRequest) {
  if (!isTTSEnabled()) {
    return NextResponse.json(
      { error: 'TTS not configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { ticketNumber, stationName, customerName, customText } = body

    if (!customText && (!ticketNumber || !stationName)) {
      return NextResponse.json(
        { error: 'ticketNumber and stationName are required' },
        { status: 400 }
      )
    }

    const text = customText || buildAnnouncementText(ticketNumber, stationName, customerName)

    const result = await synthesizeSpeech(text)

    return NextResponse.json({
      audioContent: result.audioContent,
      text,
      usage: result.usage,
    })
  } catch (error) {
    console.error('TTS generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS generation failed' },
      { status: 500 }
    )
  }
}

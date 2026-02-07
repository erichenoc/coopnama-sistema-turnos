import { NextRequest, NextResponse } from 'next/server'
import { analyzeWaitTime } from '@/lib/ai/queue-ai'

export async function POST(request: NextRequest) {
  try {
    const { avgWaitSeconds, queueLength, agentsActive } = await request.json()
    const result = await analyzeWaitTime(avgWaitSeconds, queueLength, agentsActive)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { prediction: 'No disponible', suggestion: 'Error al analizar' },
      { status: 500 }
    )
  }
}

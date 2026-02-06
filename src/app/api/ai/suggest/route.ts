import { NextRequest, NextResponse } from 'next/server'
import { generateAgentSuggestion } from '@/lib/ai/claude'

export async function POST(request: NextRequest) {
  try {
    const { serviceName, customerName, ticketNotes } = await request.json()
    const suggestion = await generateAgentSuggestion(serviceName, customerName, ticketNotes)
    return NextResponse.json({ suggestion })
  } catch (error) {
    return NextResponse.json(
      { suggestion: 'Atienda al cliente con cortesia.' },
      { status: 500 }
    )
  }
}

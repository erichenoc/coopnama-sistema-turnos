import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/tickets/:id - Get a single ticket with relations
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tickets')
    .select('*, service:services!tickets_service_id_fkey(*), station:stations(*), agent:users(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  return NextResponse.json({ ticket: data })
}

/**
 * PATCH /api/tickets/:id - Update ticket (cancel, add notes, add rating)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const allowedFields = ['notes', 'rating', 'feedback_comment', 'feedback_sentiment']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select('*, service:services!tickets_service_id_fkey(*), station:stations(*), agent:users(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ticket: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

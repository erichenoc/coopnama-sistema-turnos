import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Verify cron secret using timing-safe comparison
 */
function verifyCronSecret(authHeader: string | null, expected: string | undefined): boolean {
  if (!expected) return false // Secret not configured = reject all
  if (!authHeader) return false

  // Extract Bearer token
  const match = authHeader.match(/^Bearer (.+)$/)
  if (!match) return false

  const provided = match[1]
  try {
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * GET /api/cron/recurring-appointments
 * Daily cron to create next occurrences of recurring appointments.
 * Protected with CRON_SECRET bearer token.
 */
export async function GET(req: NextRequest) {
  // Validate cron secret is configured
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: 'Cron job not configured' },
      { status: 503 }
    )
  }

  // Verify cron secret with timing-safe comparison
  const authHeader = req.headers.get('authorization')
  if (!verifyCronSecret(authHeader, CRON_SECRET)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  // Find recurring appointments that need a new occurrence created
  // Look at confirmed recurring appointments where the next date hasn't been generated yet
  const { data: parents, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('is_recurring', true)
    .in('status', ['confirmed', 'completed', 'checked_in'])
    .not('recurrence_pattern', 'is', null)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  let created = 0

  for (const parent of parents || []) {
    // Calculate next occurrence date
    const nextDate = getNextDate(parent.appointment_date, parent.recurrence_pattern!)
    if (!nextDate) continue

    // Check if past end date
    if (parent.recurrence_end_date && nextDate > parent.recurrence_end_date) continue

    // Check if already exists
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('parent_appointment_id', parent.id)
      .eq('appointment_date', nextDate)
      .limit(1)

    if (existing && existing.length > 0) continue

    // Also check if a child appointment already exists with a future date
    const { data: futureChild } = await supabase
      .from('appointments')
      .select('id')
      .eq('parent_appointment_id', parent.id)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .limit(1)

    if (futureChild && futureChild.length > 0) continue

    // Create the next occurrence
    const { error: insertError } = await supabase
      .from('appointments')
      .insert({
        organization_id: parent.organization_id,
        branch_id: parent.branch_id,
        service_id: parent.service_id,
        customer_name: parent.customer_name,
        customer_phone: parent.customer_phone,
        customer_cedula: parent.customer_cedula,
        customer_email: parent.customer_email,
        appointment_date: nextDate,
        appointment_time: parent.appointment_time,
        duration_minutes: parent.duration_minutes,
        notes: parent.notes,
        member_id: parent.member_id,
        status: 'confirmed',
        parent_appointment_id: parent.id,
        is_recurring: false, // children are not recurring themselves
      })

    if (!insertError) created++
  }

  return NextResponse.json({
    message: `Created ${created} recurring appointments`,
    created,
    checked: parents?.length || 0,
  })
}

function getNextDate(currentDate: string, pattern: string): string | null {
  const date = new Date(currentDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (pattern) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    default:
      return null
  }

  // Keep advancing until we reach a future date
  while (date < today) {
    switch (pattern) {
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'biweekly':
        date.setDate(date.getDate() + 14)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
    }
  }

  return date.toISOString().split('T')[0]
}

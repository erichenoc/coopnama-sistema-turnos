import { NextRequest, NextResponse } from 'next/server'
import { detectAnomalies } from '@/lib/ai/anomaly-detection'
import { timingSafeEqual } from 'crypto'

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
 * GET /api/cron/detect-anomalies
 * Runs every 4 hours to detect operational anomalies.
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

  try {
    const result = await detectAnomalies()
    return NextResponse.json({
      message: `Anomaly detection complete: ${result.detected} new anomalies found`,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { detectAnomalies } from '@/lib/ai/anomaly-detection'

/**
 * GET /api/cron/detect-anomalies
 * Runs every 4 hours to detect operational anomalies.
 * Protected with CRON_SECRET bearer token.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

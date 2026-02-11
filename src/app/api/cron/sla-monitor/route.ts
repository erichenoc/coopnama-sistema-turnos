/**
 * COOPNAMA Sistema de Turnos
 * SLA Monitor Cron Job - Endpoint para monitoreo periódico de SLA
 *
 * Este endpoint debe ser llamado cada 1-5 minutos por un servicio de cron
 * (ej: Vercel Cron, GitHub Actions, cron-job.org)
 *
 * Configuración recomendada en vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sla-monitor",
 *     "schedule": "* /5 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  checkSLABreaches,
  resolveCompletedBreaches,
} from '@/features/sla/services/sla-monitor'
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

// ============================================
// TYPES
// ============================================

interface BranchResult {
  branchId: string
  branchName: string
  newBreaches: number
  escalated: number
  error?: string
}

interface MonitorSummary {
  timestamp: string
  totalOrganizations: number
  totalBranches: number
  totalNewBreaches: number
  totalEscalated: number
  totalResolved: number
  results: BranchResult[]
  errors: string[]
}

// ============================================
// CRON HANDLER
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // 1. Verificar autenticación (MANDATORY: usar cron secret)
    // Validate cron secret is configured
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 503 }
      )
    }

    // Verify cron secret with timing-safe comparison
    const authHeader = request.headers.get('authorization')
    if (!verifyCronSecret(authHeader, CRON_SECRET)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // 2. Obtener todas las organizaciones activas
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('is_active', true)

    if (orgError) {
      console.error('Error fetching organizations:', orgError)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        message: 'No active organizations',
        timestamp: new Date().toISOString(),
      })
    }

    const summary: MonitorSummary = {
      timestamp: new Date().toISOString(),
      totalOrganizations: organizations.length,
      totalBranches: 0,
      totalNewBreaches: 0,
      totalEscalated: 0,
      totalResolved: 0,
      results: [],
      errors: [],
    }

    // 3. Procesar cada organización
    for (const org of organizations) {
      try {
        // Obtener sucursales de la organización
        const { data: branches, error: branchError } = await supabase
          .from('branches')
          .select('id, name')
          .eq('organization_id', org.id)
          .eq('is_active', true)

        if (branchError) {
          console.error(`Error fetching branches for org ${org.id}:`, branchError)
          summary.errors.push(`Error fetching branches`)
          continue
        }

        if (!branches || branches.length === 0) {
          continue
        }

        summary.totalBranches += branches.length

        // Procesar cada sucursal
        for (const branch of branches) {
          try {
            // Verificar violaciones de SLA
            const { newBreaches, escalated } = await checkSLABreaches(
              org.id,
              branch.id
            )

            summary.totalNewBreaches += newBreaches
            summary.totalEscalated += escalated

            if (newBreaches > 0 || escalated > 0) {
              summary.results.push({
                branchId: branch.id,
                branchName: branch.name,
                newBreaches,
                escalated,
              })
            }
          } catch (error) {
            console.error(
              `Error checking SLA for branch ${branch.id}:`,
              error
            )
            summary.errors.push(`Error checking SLA`)
          }
        }

        // Resolver violaciones de tickets completados
        try {
          const resolved = await resolveCompletedBreaches(org.id)
          summary.totalResolved += resolved
        } catch (error) {
          console.error(
            `Error resolving breaches for org ${org.id}:`,
            error
          )
          summary.errors.push(`Error resolving breaches`)
        }
      } catch (error) {
        console.error(`Error processing org ${org.id}:`, error)
        summary.errors.push(`Error processing organization`)
      }
    }

    const executionTime = Date.now() - startTime

    // 4. Log del resumen
    console.log('SLA Monitor Summary:', {
      ...summary,
      executionTimeMs: executionTime,
    })

    // 5. Retornar resumen
    return NextResponse.json({
      success: true,
      summary,
      executionTimeMs: executionTime,
    })
  } catch (error) {
    console.error('Fatal error in SLA monitor cron:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Permitir POST también (algunos servicios de cron usan POST)
export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request)
}

/**
 * COOPNAMA Sistema de Turnos
 * SLA Monitor - Monitoreo automático de violaciones de SLA
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { getEffectiveSLA } from './sla-service'
import { getLocalDateString } from '@/shared/utils/date'

// ============================================
// SLA MONITORING
// ============================================

interface MonitorResult {
  newBreaches: number
  escalated: number
}

/**
 * Verifica y registra violaciones de SLA para una sucursal
 * Este método debe ser llamado periódicamente (cada 1-5 minutos)
 */
export async function checkSLABreaches(
  organizationId: string,
  branchId: string
): Promise<MonitorResult> {
  const supabase = await createClient()
  let newBreaches = 0
  let escalated = 0

  try {
    // 1. Obtener todas las configuraciones de SLA activas
    const { data: slaConfigs, error: configError } = await supabase
      .from('sla_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (configError) {
      console.error('Error fetching SLA configs:', configError)
      return { newBreaches: 0, escalated: 0 }
    }

    if (!slaConfigs || slaConfigs.length === 0) {
      // No hay SLAs configurados
      return { newBreaches: 0, escalated: 0 }
    }

    // 2. Obtener todos los tickets en espera de la sucursal
    const { data: waitingTickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, service_id, priority, created_at, ticket_number, customer_name, status')
      .eq('branch_id', branchId)
      .eq('status', 'waiting')
      .gte('created_at', getLocalDateString()) // Solo tickets del día

    if (ticketsError) {
      console.error('Error fetching waiting tickets:', ticketsError)
      return { newBreaches: 0, escalated: 0 }
    }

    if (!waitingTickets || waitingTickets.length === 0) {
      // No hay tickets en espera
      return { newBreaches: 0, escalated: 0 }
    }

    // 3. Procesar cada ticket
    const now = new Date()

    for (const ticket of waitingTickets) {
      const createdAt = new Date(ticket.created_at)
      const waitMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000)

      // Obtener SLA efectivo para este ticket
      const sla = await getEffectiveSLA(organizationId, ticket.service_id)

      if (!sla) {
        // No hay SLA configurado para este servicio
        continue
      }

      // 4. Verificar umbrales y crear violaciones
      const breachesToCreate: Array<{
        type: 'warning' | 'critical' | 'breached'
        threshold: number
      }> = []

      if (waitMinutes >= sla.max_wait_minutes) {
        breachesToCreate.push({
          type: 'breached',
          threshold: sla.max_wait_minutes,
        })
      } else if (waitMinutes >= sla.critical_at_minutes) {
        breachesToCreate.push({
          type: 'critical',
          threshold: sla.critical_at_minutes,
        })
      } else if (waitMinutes >= sla.warning_at_minutes) {
        breachesToCreate.push({
          type: 'warning',
          threshold: sla.warning_at_minutes,
        })
      }

      // 5. Registrar violaciones si no existen ya
      for (const breach of breachesToCreate) {
        const { data: existingBreach } = await supabase
          .from('sla_breaches')
          .select('id')
          .eq('ticket_id', ticket.id)
          .eq('breach_type', breach.type)
          .is('resolved_at', null)
          .maybeSingle()

        if (!existingBreach) {
          // Crear nueva violación
          const { error: insertError } = await supabase
            .from('sla_breaches')
            .insert({
              organization_id: organizationId,
              branch_id: branchId,
              ticket_id: ticket.id,
              sla_config_id: sla.id,
              breach_type: breach.type,
              wait_minutes: waitMinutes,
              threshold_minutes: breach.threshold,
              notified: false,
              created_at: new Date().toISOString(),
            })

          if (!insertError) {
            newBreaches++
          } else {
            console.error('Error creating SLA breach:', insertError)
          }
        }
      }

      // 6. Auto-escalado de prioridad
      if (
        sla.auto_escalate_priority &&
        waitMinutes >= sla.escalate_after_minutes &&
        ticket.priority < sla.escalate_to_priority
      ) {
        const { error: updateError } = await supabase
          .from('tickets')
          .update({
            priority: sla.escalate_to_priority,
            priority_reason: `Auto-escalado por SLA (${waitMinutes} min de espera)`,
          })
          .eq('id', ticket.id)

        if (!updateError) {
          escalated++

          // Registrar en historial
          await supabase.from('ticket_history').insert({
            ticket_id: ticket.id,
            previous_status: ticket.status,
            new_status: ticket.status,
            notes: `Prioridad escalada automáticamente de ${ticket.priority} a ${sla.escalate_to_priority} por violación de SLA`,
            created_at: new Date().toISOString(),
          })
        } else {
          console.error('Error escalating ticket priority:', updateError)
        }
      }

      // 7. TODO: Notificaciones (implementar según notify_supervisor y notify_channels)
      // if (sla.notify_supervisor && breach.type === 'critical') {
      //   await sendSupervisorNotification(...)
      // }
    }

    return { newBreaches, escalated }
  } catch (error) {
    console.error('Unexpected error in SLA monitor:', error)
    return { newBreaches: 0, escalated: 0 }
  }
}

/**
 * Resuelve automáticamente violaciones de tickets que ya no están en espera
 */
export async function resolveCompletedBreaches(
  organizationId: string
): Promise<number> {
  const supabase = await createClient()

  try {
    // Obtener violaciones activas
    const { data: activeBreaches, error: fetchError } = await supabase
      .from('sla_breaches')
      .select('id, ticket_id, ticket:tickets(status)')
      .eq('organization_id', organizationId)
      .is('resolved_at', null)

    if (fetchError || !activeBreaches) {
      return 0
    }

    let resolved = 0

    for (const breach of activeBreaches) {
      const ticketStatus = (breach as { ticket?: { status?: string } }).ticket?.status

      if (ticketStatus && ticketStatus !== 'waiting') {
        const { error: updateError } = await supabase
          .from('sla_breaches')
          .update({ resolved_at: new Date().toISOString() })
          .eq('id', breach.id)

        if (!updateError) {
          resolved++
        }
      }
    }

    return resolved
  } catch (error) {
    console.error('Error resolving completed breaches:', error)
    return 0
  }
}

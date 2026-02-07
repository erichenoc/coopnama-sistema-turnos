/**
 * COOPNAMA Sistema de Turnos
 * SLA Service - Gestión de configuraciones de SLA y violaciones
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface SLAConfig {
  id: string
  organization_id: string
  service_id: string | null
  max_wait_minutes: number
  warning_at_minutes: number
  critical_at_minutes: number
  auto_escalate_priority: boolean
  escalate_after_minutes: number
  escalate_to_priority: number
  notify_supervisor: boolean
  notify_channels: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  service?: { name: string; code: string } | null
}

export interface SLABreach {
  id: string
  organization_id: string
  branch_id: string | null
  ticket_id: string | null
  sla_config_id: string | null
  breach_type: 'warning' | 'critical' | 'breached'
  wait_minutes: number
  threshold_minutes: number
  notified: boolean
  resolved_at: string | null
  created_at: string
  ticket?: {
    ticket_number: string
    customer_name: string
    status: string
    service?: { name: string } | null
  } | null
}

// ============================================
// CRUD SLA CONFIGS
// ============================================

/**
 * Obtiene todas las configuraciones de SLA para una organización
 */
export async function getSLAConfigs(organizationId: string): Promise<SLAConfig[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sla_configs')
    .select(`
      *,
      service:services(name, code)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching SLA configs:', error)
    throw new Error(`Error al obtener configuraciones de SLA: ${error.message}`)
  }

  return (data || []) as SLAConfig[]
}

/**
 * Guarda o actualiza una configuración de SLA
 */
export async function saveSLAConfig(
  config: Partial<SLAConfig> & { organization_id: string }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Validar que los umbrales sean coherentes
    if (
      config.warning_at_minutes &&
      config.critical_at_minutes &&
      config.max_wait_minutes
    ) {
      if (
        config.warning_at_minutes >= config.critical_at_minutes ||
        config.critical_at_minutes >= config.max_wait_minutes
      ) {
        return {
          error:
            'Los umbrales deben ser: warning < critical < max_wait_minutes',
        }
      }
    }

    // Validar prioridad de escalado
    if (config.escalate_to_priority !== undefined) {
      if (config.escalate_to_priority < 0 || config.escalate_to_priority > 3) {
        return { error: 'La prioridad de escalado debe estar entre 0 y 3' }
      }
    }

    if (config.id) {
      // Actualizar existente
      const { error } = await supabase
        .from('sla_configs')
        .update({
          ...config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id)
        .eq('organization_id', config.organization_id)

      if (error) {
        console.error('Error updating SLA config:', error)
        return { error: `Error al actualizar SLA: ${error.message}` }
      }
    } else {
      // Crear nuevo
      const { error } = await supabase.from('sla_configs').insert({
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.error('Error creating SLA config:', error)
        return { error: `Error al crear SLA: ${error.message}` }
      }
    }

    revalidatePath('/dashboard/sla')
    return { success: true }
  } catch (err) {
    console.error('Unexpected error saving SLA config:', err)
    return { error: 'Error inesperado al guardar configuración de SLA' }
  }
}

/**
 * Elimina una configuración de SLA
 */
export async function deleteSLAConfig(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const { error } = await supabase.from('sla_configs').delete().eq('id', id)

    if (error) {
      console.error('Error deleting SLA config:', error)
      return { error: `Error al eliminar SLA: ${error.message}` }
    }

    revalidatePath('/dashboard/sla')
    return { success: true }
  } catch (err) {
    console.error('Unexpected error deleting SLA config:', err)
    return { error: 'Error inesperado al eliminar configuración de SLA' }
  }
}

// ============================================
// SLA EFECTIVO
// ============================================

/**
 * Obtiene el SLA efectivo para un servicio específico
 * Prioridad: SLA específico del servicio > SLA general de la organización
 */
export async function getEffectiveSLA(
  organizationId: string,
  serviceId: string
): Promise<SLAConfig | null> {
  const supabase = await createClient()

  // 1. Buscar SLA específico del servicio
  const { data: serviceSLA, error: serviceError } = await supabase
    .from('sla_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('service_id', serviceId)
    .eq('is_active', true)
    .maybeSingle()

  if (serviceError) {
    console.error('Error fetching service SLA:', serviceError)
  }

  if (serviceSLA) {
    return serviceSLA as SLAConfig
  }

  // 2. Si no hay SLA específico, buscar SLA general (service_id = null)
  const { data: orgSLA, error: orgError } = await supabase
    .from('sla_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .is('service_id', null)
    .eq('is_active', true)
    .maybeSingle()

  if (orgError) {
    console.error('Error fetching org SLA:', orgError)
  }

  return (orgSLA as SLAConfig) || null
}

// ============================================
// SLA BREACHES
// ============================================

/**
 * Obtiene violaciones de SLA para el dashboard
 */
export async function getSLABreaches(
  organizationId: string,
  options?: {
    branchId?: string
    limit?: number
    onlyActive?: boolean
  }
): Promise<SLABreach[]> {
  const supabase = await createClient()

  let query = supabase
    .from('sla_breaches')
    .select(`
      *,
      ticket:tickets(
        ticket_number,
        customer_name,
        status,
        service:services(name)
      )
    `)
    .eq('organization_id', organizationId)

  if (options?.branchId) {
    query = query.eq('branch_id', options.branchId)
  }

  if (options?.onlyActive) {
    query = query.is('resolved_at', null)
  }

  query = query.order('created_at', { ascending: false })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching SLA breaches:', error)
    throw new Error(`Error al obtener violaciones de SLA: ${error.message}`)
  }

  return (data || []) as SLABreach[]
}

/**
 * Marca una violación de SLA como resuelta
 */
export async function resolveSLABreach(breachId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sla_breaches')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', breachId)

  if (error) {
    console.error('Error resolving SLA breach:', error)
    throw new Error(`Error al resolver violación de SLA: ${error.message}`)
  }

  revalidatePath('/dashboard/sla')
}

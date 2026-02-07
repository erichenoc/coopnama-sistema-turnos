/**
 * COOPNAMA Sistema de Turnos
 * Priority Service - Gestión de reglas de prioridad
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface PriorityRule {
  id: string
  organization_id: string
  name: string
  description: string | null
  condition_type:
    | 'age'
    | 'member_type'
    | 'disability'
    | 'pregnancy'
    | 'vip'
    | 'time_of_day'
    | 'service'
    | 'custom'
  condition_value: Record<string, unknown>
  priority_boost: number
  is_active: boolean
  sort_order: number
  created_at: string
}

// ============================================
// CRUD PRIORITY RULES
// ============================================

/**
 * Obtiene todas las reglas de prioridad para una organización
 */
export async function getPriorityRules(
  organizationId: string
): Promise<PriorityRule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('priority_rules')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching priority rules:', error)
    throw new Error(`Error al obtener reglas de prioridad: ${error.message}`)
  }

  return (data || []) as PriorityRule[]
}

/**
 * Guarda o actualiza una regla de prioridad
 */
export async function savePriorityRule(
  rule: Partial<PriorityRule> & { organization_id: string }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Validar boost de prioridad
    if (rule.priority_boost !== undefined) {
      if (rule.priority_boost < 0 || rule.priority_boost > 3) {
        return { error: 'El boost de prioridad debe estar entre 0 y 3' }
      }
    }

    if (rule.id) {
      // Actualizar existente
      const { error } = await supabase
        .from('priority_rules')
        .update(rule)
        .eq('id', rule.id)
        .eq('organization_id', rule.organization_id)

      if (error) {
        console.error('Error updating priority rule:', error)
        return { error: `Error al actualizar regla: ${error.message}` }
      }
    } else {
      // Crear nueva - obtener último sort_order
      const { data: lastRule } = await supabase
        .from('priority_rules')
        .select('sort_order')
        .eq('organization_id', rule.organization_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextSortOrder = lastRule ? lastRule.sort_order + 1 : 0

      const { error } = await supabase.from('priority_rules').insert({
        ...rule,
        sort_order: nextSortOrder,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error('Error creating priority rule:', error)
        return { error: `Error al crear regla: ${error.message}` }
      }
    }

    revalidatePath('/dashboard/priority-rules')
    return { success: true }
  } catch (err) {
    console.error('Unexpected error saving priority rule:', err)
    return { error: 'Error inesperado al guardar regla de prioridad' }
  }
}

/**
 * Elimina una regla de prioridad
 */
export async function deletePriorityRule(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('priority_rules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting priority rule:', error)
      return { error: `Error al eliminar regla: ${error.message}` }
    }

    revalidatePath('/dashboard/priority-rules')
    return { success: true }
  } catch (err) {
    console.error('Unexpected error deleting priority rule:', err)
    return { error: 'Error inesperado al eliminar regla de prioridad' }
  }
}

/**
 * Reordena las reglas de prioridad
 */
export async function reorderPriorityRules(ids: string[]): Promise<void> {
  const supabase = await createClient()

  try {
    // Actualizar sort_order de cada regla según su posición en el array
    const updates = ids.map((id, index) =>
      supabase
        .from('priority_rules')
        .update({ sort_order: index })
        .eq('id', id)
    )

    await Promise.all(updates)

    revalidatePath('/dashboard/priority-rules')
  } catch (error) {
    console.error('Error reordering priority rules:', error)
    throw new Error('Error al reordenar reglas de prioridad')
  }
}

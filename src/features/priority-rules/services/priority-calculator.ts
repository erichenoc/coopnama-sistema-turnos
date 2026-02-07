/**
 * COOPNAMA Sistema de Turnos
 * Priority Calculator - Cálculo automático de prioridad basado en reglas
 */

'use server'

import { getPriorityRules } from './priority-service'

// ============================================
// TYPES
// ============================================

export interface TicketContext {
  member_type?: string | null // 'vip', 'socio', 'empleado', 'cliente'
  member_priority_level?: number // 0, 1, 2
  member_priority_reason?: string | null // 'senior', 'pregnant', 'disability', 'vip_member'
  service_id?: string
  customer_cedula?: string | null
}

export interface PriorityResult {
  priority: number
  reason: string
}

// ============================================
// PRIORITY CALCULATION
// ============================================

/**
 * Calcula la prioridad de un ticket basándose en las reglas configuradas
 */
export async function calculatePriority(
  organizationId: string,
  context: TicketContext
): Promise<PriorityResult> {
  try {
    // 1. Obtener reglas activas ordenadas por sort_order
    const rules = await getPriorityRules(organizationId)
    const activeRules = rules.filter((rule) => rule.is_active)

    if (activeRules.length === 0) {
      return {
        priority: 0,
        reason: 'Sin reglas de prioridad configuradas',
      }
    }

    // 2. Evaluar cada regla y acumular boost
    let totalBoost = 0
    const appliedReasons: string[] = []

    for (const rule of activeRules) {
      const matches = evaluateRule(rule, context)

      if (matches) {
        totalBoost += rule.priority_boost
        appliedReasons.push(rule.name)
      }
    }

    // 3. Calcular prioridad final (cap a 3)
    const finalPriority = Math.min(totalBoost, 3)

    // 4. Generar razón descriptiva
    const reason =
      appliedReasons.length > 0
        ? appliedReasons.join(', ')
        : 'Prioridad normal'

    return {
      priority: finalPriority,
      reason,
    }
  } catch (error) {
    console.error('Error calculating priority:', error)
    // En caso de error, retornar prioridad normal
    return {
      priority: 0,
      reason: 'Error al calcular prioridad',
    }
  }
}

/**
 * Evalúa si una regla se aplica al contexto dado
 */
function evaluateRule(
  rule: {
    condition_type: string
    condition_value: Record<string, unknown>
  },
  context: TicketContext
): boolean {
  switch (rule.condition_type) {
    case 'member_type':
      return evaluateMemberType(rule.condition_value, context)

    case 'vip':
      return evaluateVIP(context)

    case 'disability':
      return evaluateDisability(context)

    case 'pregnancy':
      return evaluatePregnancy(context)

    case 'age':
      return evaluateAge(context)

    case 'time_of_day':
      return evaluateTimeOfDay(rule.condition_value)

    case 'service':
      return evaluateService(rule.condition_value, context)

    case 'custom':
      // TODO: Implementar evaluación de reglas custom
      return false

    default:
      return false
  }
}

/**
 * Evalúa si el tipo de miembro coincide
 */
function evaluateMemberType(
  conditionValue: Record<string, unknown>,
  context: TicketContext
): boolean {
  const requiredType = conditionValue.member_type as string | undefined

  if (!requiredType || !context.member_type) {
    return false
  }

  return context.member_type === requiredType
}

/**
 * Evalúa si el miembro es VIP
 */
function evaluateVIP(context: TicketContext): boolean {
  // Considera VIP si:
  // - member_priority_level >= 2
  // - O member_priority_reason === 'vip_member'
  return (
    (context.member_priority_level !== undefined &&
      context.member_priority_level >= 2) ||
    context.member_priority_reason === 'vip_member'
  )
}

/**
 * Evalúa si el miembro tiene discapacidad
 */
function evaluateDisability(context: TicketContext): boolean {
  return context.member_priority_reason === 'disability'
}

/**
 * Evalúa si el miembro está embarazada
 */
function evaluatePregnancy(context: TicketContext): boolean {
  return context.member_priority_reason === 'pregnant'
}

/**
 * Evalúa si el miembro es adulto mayor
 */
function evaluateAge(context: TicketContext): boolean {
  // Usamos member_priority_reason === 'senior' porque la edad exacta
  // no está disponible directamente en el contexto
  return context.member_priority_reason === 'senior'
}

/**
 * Evalúa si la hora actual está dentro del rango especificado
 */
function evaluateTimeOfDay(conditionValue: Record<string, unknown>): boolean {
  const timeStart = conditionValue.time_start as string | undefined
  const timeEnd = conditionValue.time_end as string | undefined

  if (!timeStart || !timeEnd) {
    return false
  }

  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5) // "HH:MM"

  return currentTime >= timeStart && currentTime <= timeEnd
}

/**
 * Evalúa si el servicio coincide
 */
function evaluateService(
  conditionValue: Record<string, unknown>,
  context: TicketContext
): boolean {
  const requiredServiceId = conditionValue.service_id as string | undefined

  if (!requiredServiceId || !context.service_id) {
    return false
  }

  return context.service_id === requiredServiceId
}

/**
 * Obtiene el nombre descriptivo de la prioridad
 */
export function getPriorityName(priority: number): string {
  const names: Record<number, string> = {
    0: 'Normal',
    1: 'Preferencial',
    2: 'VIP',
    3: 'Urgente',
  }

  return names[priority] || 'Normal'
}

/**
 * Obtiene el color de badge para la prioridad
 */
export function getPriorityColor(priority: number): string {
  const colors: Record<number, string> = {
    0: 'gray',
    1: 'blue',
    2: 'purple',
    3: 'red',
  }

  return colors[priority] || 'gray'
}

/**
 * COOPNAMA Sistema de Turnos
 * Realtime Service - Suscripciones en tiempo real
 */

import { createClient } from '@/lib/supabase/client'
import { getLocalDateString } from '@/shared/utils/date'
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'
import type { Ticket, AgentSession } from '@/shared/types/domain'

// Tipo para el payload de cambios
type TicketChangePayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown
}>

type AgentSessionChangePayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown
}>

// ============================================
// SUSCRIPCIÓN A TICKETS
// ============================================

/**
 * Suscribirse a cambios en tickets de una sucursal
 * Ideal para: Dashboard, Panel de Agente
 */
export function subscribeToTickets(
  branchId: string,
  callbacks: {
    onInsert?: (ticket: Ticket) => void
    onUpdate?: (ticket: Ticket) => void
    onDelete?: (ticket: Ticket) => void
    onAny?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', ticket: Ticket) => void
  }
): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`tickets-${branchId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `branch_id=eq.${branchId}`,
      },
      (payload: TicketChangePayload) => {
        const ticket = (payload.new || payload.old) as Ticket
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'

        // Callback específico por tipo
        if (eventType === 'INSERT' && callbacks.onInsert) {
          callbacks.onInsert(ticket)
        } else if (eventType === 'UPDATE' && callbacks.onUpdate) {
          callbacks.onUpdate(ticket)
        } else if (eventType === 'DELETE' && callbacks.onDelete) {
          callbacks.onDelete(payload.old as Ticket)
        }

        // Callback general
        if (callbacks.onAny) {
          callbacks.onAny(eventType, ticket)
        }
      }
    )
    .subscribe()

  return channel
}

/**
 * Suscribirse solo a tickets llamados (status = 'called')
 * Ideal para: TV Display, Anuncios de audio
 */
export function subscribeToCalledTickets(
  branchId: string,
  callback: (ticket: Ticket) => void
): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`called-tickets-${branchId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tickets',
        filter: `branch_id=eq.${branchId}`,
      },
      (payload: TicketChangePayload) => {
        const ticket = payload.new as Ticket
        // Solo notificar cuando el status cambia a 'called'
        if (ticket.status === 'called') {
          callback(ticket)
        }
      }
    )
    .subscribe()

  return channel
}

/**
 * Suscribirse a tickets activos (waiting, called, serving)
 * Ideal para: Cola en tiempo real
 */
export function subscribeToActiveTickets(
  branchId: string,
  callback: (tickets: Ticket[]) => void
): RealtimeChannel {
  const supabase = createClient()

  // Función para recargar toda la cola
  const reloadQueue = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('branch_id', branchId)
      .in('status', ['waiting', 'called', 'serving'])
      .gte('created_at', getLocalDateString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    callback(data || [])
  }

  // Cargar inicial
  reloadQueue()

  // Suscribirse a cambios y recargar
  const channel = supabase
    .channel(`active-queue-${branchId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `branch_id=eq.${branchId}`,
      },
      () => {
        // Recargar toda la cola cuando hay cualquier cambio
        reloadQueue()
      }
    )
    .subscribe()

  return channel
}

// ============================================
// SUSCRIPCIÓN A SESIONES DE AGENTES
// ============================================

/**
 * Suscribirse a cambios en sesiones de agentes
 * Ideal para: Dashboard de supervisores
 */
export function subscribeToAgentSessions(
  branchId: string,
  callbacks: {
    onInsert?: (session: AgentSession) => void
    onUpdate?: (session: AgentSession) => void
    onDelete?: (session: AgentSession) => void
  }
): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`agent-sessions-${branchId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'agent_sessions',
        filter: `branch_id=eq.${branchId}`,
      },
      (payload: AgentSessionChangePayload) => {
        const session = (payload.new || payload.old) as AgentSession
        const eventType = payload.eventType

        if (eventType === 'INSERT' && callbacks.onInsert) {
          callbacks.onInsert(session)
        } else if (eventType === 'UPDATE' && callbacks.onUpdate) {
          callbacks.onUpdate(session)
        } else if (eventType === 'DELETE' && callbacks.onDelete) {
          callbacks.onDelete(payload.old as unknown as AgentSession)
        }
      }
    )
    .subscribe()

  return channel
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Desuscribirse de un canal
 */
export function unsubscribe(channel: RealtimeChannel): void {
  const supabase = createClient()
  supabase.removeChannel(channel)
}

/**
 * Desuscribirse de todos los canales
 */
export function unsubscribeAll(): void {
  const supabase = createClient()
  supabase.removeAllChannels()
}

// ============================================
// HOOKS HELPERS
// ============================================

/**
 * Crea una suscripción que se limpia automáticamente
 * Útil para usar con useEffect
 */
export function createSubscription<T>(
  subscribe: () => RealtimeChannel,
): {
  channel: RealtimeChannel
  cleanup: () => void
} {
  const channel = subscribe()
  return {
    channel,
    cleanup: () => unsubscribe(channel),
  }
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TicketWithRelations, SLATimerState, SLAPhase } from '../types'

interface SLAConfig {
  max_wait_minutes: number
  warning_at_minutes: number
  critical_at_minutes: number
}

export function useSLATimer(
  ticket: TicketWithRelations | null,
  serviceTimerSeconds: number,
  organizationId: string
): SLATimerState {
  const [config, setConfig] = useState<SLAConfig | null>(null)

  const fetchSLAConfig = useCallback(async () => {
    if (!organizationId || !ticket?.service_id) return

    try {
      const supabase = createClient()

      // Try service-specific SLA first
      let { data } = await supabase
        .from('sla_configs')
        .select('max_wait_minutes, warning_at_minutes, critical_at_minutes')
        .eq('organization_id', organizationId)
        .eq('service_id', ticket.service_id)
        .eq('is_active', true)
        .single()

      if (!data) {
        // Fallback to org-wide SLA
        const result = await supabase
          .from('sla_configs')
          .select('max_wait_minutes, warning_at_minutes, critical_at_minutes')
          .eq('organization_id', organizationId)
          .is('service_id', null)
          .eq('is_active', true)
          .single()

        data = result.data
      }

      if (data) setConfig(data)
    } catch {
      // No SLA config found, that's fine
    }
  }, [organizationId, ticket?.service_id])

  useEffect(() => {
    fetchSLAConfig()
  }, [fetchSLAConfig])

  if (!config || !ticket || ticket.status !== 'serving') {
    return {
      phase: 'ok',
      remainingSeconds: null,
      thresholdMinutes: null,
      warningMinutes: null,
      criticalMinutes: null,
    }
  }

  const serviceMinutes = serviceTimerSeconds / 60
  const maxMinutes = config.max_wait_minutes

  let phase: SLAPhase = 'ok'
  if (serviceMinutes >= maxMinutes) {
    phase = 'breached'
  } else if (serviceMinutes >= config.critical_at_minutes) {
    phase = 'critical'
  } else if (serviceMinutes >= config.warning_at_minutes) {
    phase = 'warning'
  }

  const remainingSeconds = Math.max(0, (maxMinutes - serviceMinutes) * 60)

  return {
    phase,
    remainingSeconds: Math.round(remainingSeconds),
    thresholdMinutes: maxMinutes,
    warningMinutes: config.warning_at_minutes,
    criticalMinutes: config.critical_at_minutes,
  }
}

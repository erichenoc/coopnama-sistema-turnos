'use client'

import { useSLATimer } from '../hooks/use-sla-timer'
import type { TicketWithRelations, CopilotContext } from '../types'

interface SLAAlertBannerProps {
  ticket: TicketWithRelations | null
  context: CopilotContext
}

export function SLAAlertBanner({ ticket, context }: SLAAlertBannerProps) {
  const sla = useSLATimer(ticket, context.serviceTimerSeconds, context.organizationId)

  if (sla.phase === 'ok' || !sla.remainingSeconds) return null

  const formatRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const phaseConfig = {
    warning: {
      bg: 'bg-yellow-50 border-yellow-300',
      text: 'text-yellow-800',
      icon: '⚠️',
      label: 'Atencion',
    },
    critical: {
      bg: 'bg-orange-50 border-orange-400',
      text: 'text-orange-800',
      icon: '🔥',
      label: 'Critico',
    },
    breached: {
      bg: 'bg-red-50 border-red-400',
      text: 'text-red-800',
      icon: '🚨',
      label: 'SLA excedido',
    },
  }

  const config = phaseConfig[sla.phase as keyof typeof phaseConfig]
  if (!config) return null

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 border-b ${config.bg} ${
        sla.phase === 'breached' ? 'animate-pulse' : ''
      }`}
    >
      <span>{config.icon}</span>
      <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
      <div className="flex-1" />
      {sla.phase !== 'breached' ? (
        <span className={`text-xs font-mono ${config.text}`}>
          {formatRemaining(sla.remainingSeconds)} restante
        </span>
      ) : (
        <span className={`text-xs font-medium ${config.text}`}>
          Tiempo excedido ({sla.thresholdMinutes}min max)
        </span>
      )}
    </div>
  )
}

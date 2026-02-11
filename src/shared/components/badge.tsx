'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

// Ticket Status Types
export type TicketStatus =
  | 'waiting'
  | 'called'
  | 'serving'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'on_hold'
  | 'transferred'

// Priority Types
export type Priority = 'normal' | 'preferential' | 'vip' | 'urgent'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'status' | 'priority' | 'outline'
  status?: TicketStatus
  priority?: Priority
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      status,
      priority,
      size = 'md',
      pulse = false,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-full
      whitespace-nowrap
    `

    // Size styles
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    }

    // Status colors (for tickets)
    const statusStyles: Record<TicketStatus, string> = {
      waiting: 'bg-status-waiting/10 text-status-waiting border border-status-waiting/30',
      called: 'bg-status-called/10 text-status-called border border-status-called/30',
      serving: 'bg-status-serving/10 text-status-serving border border-status-serving/30',
      completed: 'bg-status-completed/10 text-status-completed border border-status-completed/30',
      cancelled: 'bg-status-cancelled/10 text-status-cancelled border border-status-cancelled/30',
      no_show: 'bg-red-600/10 text-red-400 border border-red-600/30',
      on_hold: 'bg-yellow-600/10 text-yellow-400 border border-yellow-600/30',
      transferred: 'bg-purple-600/10 text-purple-400 border border-purple-600/30',
    }

    // Priority colors
    const priorityStyles: Record<Priority, string> = {
      normal: 'bg-gray-500/10 text-gray-400 border border-gray-400/30',
      preferential: 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/30',
      vip: 'bg-amber-500/10 text-amber-400 border border-amber-400/30',
      urgent: 'bg-red-500/10 text-red-400 border border-red-400/30',
    }

    // Default variant styles
    const variantStyles = {
      default: 'bg-white/[0.08] text-gray-300',
      outline: 'bg-transparent border border-white/[0.15] text-gray-300',
      status: status ? statusStyles[status] : '',
      priority: priority ? priorityStyles[priority] : '',
    }

    // Status labels in Spanish
    const statusLabels: Record<TicketStatus, string> = {
      waiting: 'En espera',
      called: 'Llamado',
      serving: 'Atendiendo',
      completed: 'Completado',
      cancelled: 'Cancelado',
      no_show: 'No presentado',
      on_hold: 'En pausa',
      transferred: 'Transferido',
    }

    // Priority labels in Spanish
    const priorityLabels: Record<Priority, string> = {
      normal: 'Normal',
      preferential: 'Preferencial',
      vip: 'VIP',
      urgent: 'Urgente',
    }

    // Determine content
    const displayContent = () => {
      if (children) return children
      if (variant === 'status' && status) return statusLabels[status]
      if (variant === 'priority' && priority) return priorityLabels[priority]
      return null
    }

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          pulse && 'animate-pulse',
          className
        )}
        {...props}
      >
        {/* Pulse indicator for called status */}
        {status === 'called' && (
          <span className="mr-1.5 relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-called opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-called" />
          </span>
        )}
        {displayContent()}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// Convenience components for common badges
const StatusBadge = forwardRef<
  HTMLSpanElement,
  Omit<BadgeProps, 'variant'> & { status: TicketStatus }
>(({ status, ...props }, ref) => (
  <Badge ref={ref} variant="status" status={status} {...props} />
))

StatusBadge.displayName = 'StatusBadge'

const PriorityBadge = forwardRef<
  HTMLSpanElement,
  Omit<BadgeProps, 'variant'> & { priority: Priority }
>(({ priority, ...props }, ref) => (
  <Badge ref={ref} variant="priority" priority={priority} {...props} />
))

PriorityBadge.displayName = 'PriorityBadge'

export { Badge, StatusBadge, PriorityBadge }

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/shared/providers/org-provider'
import { STATUS_LABELS } from '@/shared/types/domain'

interface Notification {
  id: string
  type: 'ticket_called' | 'ticket_completed' | 'ticket_created' | 'ticket_cancelled'
  title: string
  body: string
  time: string
  read: boolean
}

const STATUS_ICONS: Record<string, string> = {
  ticket_called: '📢',
  ticket_completed: '✅',
  ticket_created: '🎫',
  ticket_cancelled: '❌',
}

export function NotificationDropdown() {
  const { organizationId, branchId } = useOrg()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)

    try {
      const supabase = createClient()
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      let query = supabase
        .from('tickets')
        .select('id, ticket_number, status, customer_name, updated_at, service:services!tickets_service_id_fkey(name)')
        .eq('organization_id', organizationId)
        .gte('updated_at', today)
        .in('status', ['called', 'completed', 'cancelled'])
        .order('updated_at', { ascending: false })
        .limit(20)

      if (branchId && branchId !== 'all') {
        query = query.eq('branch_id', branchId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching notifications:', error)
        setNotifications([])
        return
      }

      const mapped: Notification[] = (data || []).map((t) => {
        const serviceName = Array.isArray(t.service) ? t.service[0]?.name : (t.service as { name: string } | null)?.name
        const statusLabel = STATUS_LABELS[t.status as keyof typeof STATUS_LABELS] || t.status
        const typeMap: Record<string, Notification['type']> = {
          called: 'ticket_called',
          completed: 'ticket_completed',
          cancelled: 'ticket_cancelled',
        }

        return {
          id: t.id,
          type: typeMap[t.status] || 'ticket_created',
          title: `${t.ticket_number} - ${statusLabel}`,
          body: `${serviceName || 'Servicio'}${t.customer_name ? ` - ${t.customer_name}` : ''}`,
          time: new Date(t.updated_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
          read: t.status === 'completed' || t.status === 'cancelled',
        }
      })

      setNotifications(mapped)
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId])

  // Fetch on open
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  // Real-time updates
  useEffect(() => {
    if (!organizationId) return

    const supabase = createClient()
    const channel = supabase
      .channel('notifications-header')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
        },
        () => {
          if (open) {
            fetchNotifications()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [organizationId, open, fetchNotifications])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          relative p-2
          bg-white/[0.06] border border-white/[0.08] rounded-full
          hover:bg-white/[0.10] active:scale-95
          transition-all duration-150 text-gray-300
        `}
        aria-label="Notificaciones"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-coopnama-danger text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl rounded-lg shadow-glass-lg border border-white/[0.10] z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.04]">
            <h3 className="font-semibold text-white text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#009e59] hover:underline"
              >
                Marcar como leidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                Cargando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                Sin notificaciones hoy
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${
                    !notif.read ? 'bg-[#009e59]/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{STATUS_ICONS[notif.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.read ? 'font-semibold text-white' : 'text-gray-200'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{notif.body}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{notif.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-white/[0.06] bg-white/[0.04] text-center">
              <span className="text-xs text-gray-400">
                Mostrando actividad de hoy
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

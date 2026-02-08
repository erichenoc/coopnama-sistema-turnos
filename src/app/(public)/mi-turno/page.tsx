'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { estimateWaitTimeForTicket } from '@/lib/estimations/wait-time'
import { LOGO_URL } from '@/shared/components/coopnama-logo'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/shared/components'
import { StatusBadge } from '@/shared/components/badge'
import { Spinner } from '@/shared/components/spinner'
import { STATUS_LABELS } from '@/shared/types/domain'
import type { TicketWithRelations, TicketStatus } from '@/shared/types/domain'
import Link from 'next/link'
import { Bell, BellOff, Clock, TrendingUp, QrCode, Users } from 'lucide-react'

const STEPS: { status: TicketStatus; label: string }[] = [
  { status: 'waiting', label: 'En Espera' },
  { status: 'called', label: 'Llamado' },
  { status: 'serving', label: 'Atendiendo' },
  { status: 'completed', label: 'Completado' },
]

export default function MiTurnoPage() {
  const searchParams = useSearchParams()
  const [ticketNumber, setTicketNumber] = useState('')
  const [ticket, setTicket] = useState<TicketWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<number | null>(null)
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null)
  const [activeAgents, setActiveAgents] = useState<number | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const prevStatusRef = useRef<TicketStatus | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoSearchedRef = useRef(false)

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // Auto-search from URL parameter (e.g., /mi-turno?ticket=A-001)
  useEffect(() => {
    const ticketParam = searchParams.get('ticket')
    if (ticketParam && !autoSearchedRef.current) {
      autoSearchedRef.current = true
      setTicketNumber(ticketParam.toUpperCase())
    }
  }, [searchParams])

  const calculatePosition = async (ticketData: TicketWithRelations) => {
    if (ticketData.status !== 'waiting') {
      setPosition(null)
      setEstimatedWait(null)
      setActiveAgents(null)
      return
    }

    try {
      const estimate = await estimateWaitTimeForTicket(
        ticketData.branch_id,
        ticketData.service_id,
        ticketData.created_at,
        ticketData.service?.avg_duration_minutes || 5
      )
      setPosition(estimate.position)
      setEstimatedWait(estimate.estimatedMinutes)
      setActiveAgents(estimate.activeAgents)
    } catch {
      // Fallback to simple calculation
      setPosition(null)
      setEstimatedWait(null)
      setActiveAgents(null)
    }
  }

  const searchTicket = useCallback(async (searchValue?: string) => {
    const query = (searchValue || ticketNumber).trim()
    if (!query) return
    setLoading(true)
    setError(null)
    setTicket(null)
    prevStatusRef.current = null

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error: fetchError } = await supabase
      .from('tickets')
      .select('*, service:services!tickets_service_id_fkey(*), station:stations(*)')
      .ilike('ticket_number', query.toUpperCase())
      .gte('created_at', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError || !data) {
      setError('No se encontro un turno con ese numero para hoy')
      setLoading(false)
      return
    }

    setTicket(data as TicketWithRelations)
    prevStatusRef.current = data.status as TicketStatus
    await calculatePosition(data as TicketWithRelations)
    setLoading(false)
  }, [ticketNumber])

  // Trigger auto-search when ticket number is set from URL
  useEffect(() => {
    const ticketParam = searchParams.get('ticket')
    if (ticketParam && autoSearchedRef.current && !ticket && !loading) {
      searchTicket(ticketParam)
    }
  }, [ticketNumber, searchParams, ticket, loading, searchTicket])

  // Request notification permission
  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones')
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)

    if (permission === 'granted') {
      setNotificationsEnabled(true)
      new Notification('Notificaciones activadas', {
        body: 'Te avisaremos cuando tu turno sea llamado',
        icon: '/favicon.ico',
      })
    }
  }

  // Play sound when called
  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/notification.mp3')
      }
      audioRef.current.play().catch(() => {
        // Fallback: use default beep if audio file not found
        const ctx = new AudioContext()
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.frequency.value = 800
        gainNode.gain.value = 0.3
        oscillator.start()
        oscillator.stop(ctx.currentTime + 0.3)
      })
    } catch (err) {
      console.error('Audio playback failed:', err)
    }
  }

  // Send browser notification
  const sendNotification = (title: string, body: string) => {
    if (notificationsEnabled && notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'ticket-notification',
      })
    }
  }

  // Auto-refresh position every 15 seconds
  useEffect(() => {
    if (!ticket || ticket.status !== 'waiting') {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      return
    }

    refreshIntervalRef.current = setInterval(() => {
      calculatePosition(ticket)
    }, 15000)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [ticket?.id, ticket?.status])

  // Real-time updates
  useEffect(() => {
    if (!ticket) return

    const supabase = createClient()
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticket.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status as TicketStatus
          const prevStatus = prevStatusRef.current

          // Detect status change to 'called'
          if (newStatus === 'called' && prevStatus !== 'called') {
            playNotificationSound()
            sendNotification(
              '¡Tu turno ha sido llamado!',
              `Turno ${ticket.ticket_number} - Diríjase a la ventanilla`
            )
          }

          setTicket(prev => prev ? { ...prev, ...payload.new } as TicketWithRelations : null)
          prevStatusRef.current = newStatus

          // Recalculate position if status changed
          if (newStatus !== prevStatus) {
            calculatePosition({ ...ticket, ...payload.new } as TicketWithRelations)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ticket?.id])

  const getStatusMessage = (status: TicketStatus): string => {
    const messages: Record<TicketStatus, string> = {
      waiting: 'Su turno esta en espera. Por favor permanezca atento.',
      called: '¡Su turno ha sido llamado! Dirijase a la ventanilla indicada.',
      serving: 'Esta siendo atendido actualmente.',
      on_hold: 'Su turno esta en pausa momentaneamente.',
      transferred: 'Su turno ha sido transferido a otro servicio.',
      completed: 'Su atencion ha sido completada. ¡Gracias por su visita!',
      cancelled: 'Este turno ha sido cancelado.',
      no_show: 'No se presento cuando fue llamado.',
    }
    return messages[status]
  }

  const getCurrentStepIndex = (status: TicketStatus): number => {
    const index = STEPS.findIndex(s => s.status === status)
    return index === -1 ? 0 : index
  }

  const ticketUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/mi-turno?ticket=${ticket?.ticket_number}`
    : ''

  return (
    <div className="min-h-screen bg-neu-bg">
      {/* Header */}
      <header className="bg-coopnama-primary text-white py-6 px-8 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src={LOGO_URL} alt="COOPNAMA" width={40} height={40} className="rounded-lg object-contain" priority />
            <span className="font-bold text-xl">COOPNAMA</span>
          </div>
          <Link href="/" className="text-blue-200 hover:text-white text-sm transition-colors">
            Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">Consultar Mi Turno</h1>
        <p className="text-gray-500 text-center mb-8">Ingrese su numero de turno para ver el estado</p>

        {/* Search Form */}
        <div className="flex gap-3 mb-8">
          <Input
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
            placeholder="Ej: A-001"
            className="font-mono text-lg"
            onKeyDown={(e) => e.key === 'Enter' && searchTicket()}
          />
          <Button variant="primary" onClick={() => searchTicket()} isLoading={loading}>
            Buscar
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-coopnama-danger/10 border border-coopnama-danger/20 rounded-neu text-center mb-6">
            <p className="text-coopnama-danger">{error}</p>
          </div>
        )}

        {/* Ticket Info */}
        {ticket && (
          <div className="space-y-6">
            {/* Called Status - Large Pulsing Alert */}
            {ticket.status === 'called' && (
              <div className="bg-status-called/20 border-2 border-status-called shadow-neu-lg rounded-neu-lg p-8 text-center animate-pulse">
                <Bell className="w-16 h-16 mx-auto mb-4 text-status-called" />
                <p className="text-3xl font-black text-status-called mb-2">¡ES SU TURNO!</p>
                {ticket.station && (
                  <p className="text-xl text-gray-700">Diríjase a <span className="font-bold">{ticket.station.name}</span></p>
                )}
              </div>
            )}

            {/* Main Ticket Card */}
            <Card className="shadow-neu-lg">
              <CardHeader className={`text-center ${
                ticket.status === 'called' ? 'bg-status-called/20' :
                ticket.status === 'serving' ? 'bg-status-serving/20' :
                ticket.status === 'waiting' ? 'bg-status-waiting/20' :
                'bg-gray-100'
              }`}>
                <span className="font-mono font-black text-5xl text-coopnama-primary block mb-3">
                  {ticket.ticket_number}
                </span>
                <StatusBadge status={ticket.status} />
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-center text-gray-600 text-lg">{getStatusMessage(ticket.status)}</p>

                {/* Progress Steps */}
                <div className="flex items-center justify-between px-4">
                  {STEPS.map((step, index) => {
                    const currentIndex = getCurrentStepIndex(ticket.status)
                    const isActive = index <= currentIndex
                    return (
                      <div key={step.status} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            isActive
                              ? 'bg-coopnama-primary border-coopnama-primary text-white'
                              : 'bg-gray-200 border-gray-300 text-gray-400'
                          }`}>
                            {index + 1}
                          </div>
                          <p className={`text-xs mt-2 text-center ${isActive ? 'text-coopnama-primary font-semibold' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                        </div>
                        {index < STEPS.length - 1 && (
                          <div className={`w-8 h-1 mx-1 mb-6 ${isActive ? 'bg-coopnama-primary' : 'bg-gray-300'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Position & Wait Time */}
                {ticket.status === 'waiting' && (
                  <div className="grid grid-cols-3 gap-3">
                    {position !== null && (
                      <div className="p-4 bg-coopnama-primary/5 rounded-neu text-center shadow-neu-inset">
                        <TrendingUp className="w-5 h-5 mx-auto mb-1 text-coopnama-primary" />
                        <p className="text-xs text-gray-500">Posicion</p>
                        <p className="text-2xl font-bold text-coopnama-primary">{position}</p>
                      </div>
                    )}
                    {estimatedWait !== null && (
                      <div className="p-4 bg-coopnama-secondary/5 rounded-neu text-center shadow-neu-inset">
                        <Clock className="w-5 h-5 mx-auto mb-1 text-coopnama-secondary" />
                        <p className="text-xs text-gray-500">Espera Est.</p>
                        <p className="text-2xl font-bold text-coopnama-secondary">~{estimatedWait}m</p>
                      </div>
                    )}
                    {activeAgents !== null && (
                      <div className="p-4 bg-blue-50 rounded-neu text-center shadow-neu-inset">
                        <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs text-gray-500">Agentes</p>
                        <p className="text-2xl font-bold text-blue-500">{activeAgents}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Station Info */}
                {(ticket.status === 'serving') && ticket.station && (
                  <div className="text-center p-4 bg-status-serving/10 rounded-neu shadow-neu-inset">
                    <p className="text-sm text-gray-500">Siendo atendido en</p>
                    <p className="text-2xl font-bold text-status-serving">{ticket.station.name}</p>
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-400">Servicio</p>
                    <p className="font-medium text-gray-700">{ticket.service?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Creado</p>
                    <p className="font-medium text-gray-700">
                      {new Date(ticket.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Notification Button */}
                {ticket.status === 'waiting' && (
                  <Button
                    variant={notificationsEnabled ? 'secondary' : 'primary'}
                    onClick={enableNotifications}
                    disabled={notificationPermission === 'denied' || notificationsEnabled}
                    className="w-full"
                  >
                    {notificationsEnabled ? (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        Notificaciones Activadas
                      </>
                    ) : notificationPermission === 'denied' ? (
                      <>
                        <BellOff className="w-4 h-4 mr-2" />
                        Notificaciones Bloqueadas
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        Recibir Notificación
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* QR Section */}
            <Card className="shadow-neu">
              <CardContent className="text-center py-6">
                <QrCode className="w-12 h-12 mx-auto mb-3 text-coopnama-primary" />
                <p className="text-sm text-gray-500 mb-2">Escanea para ver tu turno</p>
                <p className="text-xs text-gray-400 break-all">{ticketUrl}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

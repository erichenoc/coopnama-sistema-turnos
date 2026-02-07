'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { estimateWaitTime } from '@/lib/estimations/wait-time'
import { useRealtimeQueue } from '@/shared/hooks/use-realtime-queue'
import { useTicketAnnouncer } from '@/shared/hooks/use-ticket-announcer'
import { PromoCarousel } from '@/features/tv-signage/components/promo-carousel'
import QRCode from 'react-qr-code'

interface ServiceEstimate {
  serviceId: string
  serviceName: string
  waitingCount: number
  estimatedMinutes: number
}

interface OrgBranding {
  name: string
  logo_url: string | null
  primary_color: string
}

export default function TVDisplayPage() {
  const searchParams = useSearchParams()
  const [branchId, setBranchId] = useState<string | null>(null)
  const { called, serving, waiting } = useRealtimeQueue(branchId)
  const { announce } = useTicketAnnouncer()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastCalledId, setLastCalledId] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [serviceEstimates, setServiceEstimates] = useState<ServiceEstimate[]>([])
  const [branding, setBranding] = useState<OrgBranding>({ name: 'COOPNAMA', logo_url: null, primary_color: '#1e40af' })
  const [orgId, setOrgId] = useState<string | null>(null)

  // Hide body overflow and background for fullscreen TV mode
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.background = '#0f172a'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.background = '#0f172a'
    return () => {
      document.body.style.overflow = ''
      document.body.style.background = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.background = ''
    }
  }, [])

  // Fetch wait time estimates per service + branding
  const fetchEstimates = useCallback(async () => {
    if (!branchId) return
    const supabase = createClient()

    // Get org_id from branch
    const { data: branch } = await supabase
      .from('branches')
      .select('organization_id')
      .eq('id', branchId)
      .single()
    if (!branch) return

    const [servicesRes, orgRes] = await Promise.all([
      supabase.from('services').select('id, name, avg_duration_minutes').eq('organization_id', branch.organization_id).eq('is_active', true).order('sort_order'),
      supabase.from('organizations').select('name, logo_url, primary_color').eq('id', branch.organization_id).single(),
    ])

    if (orgRes.data) {
      setBranding({
        name: orgRes.data.name || 'COOPNAMA',
        logo_url: orgRes.data.logo_url,
        primary_color: orgRes.data.primary_color || '#1e40af',
      })
    }

    if (branch) {
      setOrgId(branch.organization_id)
    }

    const services = servicesRes.data
    if (!services || services.length === 0) return

    const estimates = await Promise.all(
      services.map(async (svc) => {
        const est = await estimateWaitTime(branchId, svc.id, svc.avg_duration_minutes)
        return {
          serviceId: svc.id,
          serviceName: svc.name,
          waitingCount: est.waitingCount,
          estimatedMinutes: est.estimatedMinutes,
        }
      })
    )
    setServiceEstimates(estimates.filter(e => e.waitingCount > 0))
  }, [branchId])

  // Refresh estimates every 30 seconds
  useEffect(() => {
    fetchEstimates()
    const interval = setInterval(fetchEstimates, 30000)
    return () => clearInterval(interval)
  }, [fetchEstimates])

  // Resolve branch ID from URL param or fetch first active branch
  useEffect(() => {
    const resolveBranch = async () => {
      const branchParam = searchParams.get('branch')

      if (branchParam) {
        setBranchId(branchParam)
        return
      }

      // Fallback: fetch first active branch
      const supabase = createClient()
      const { data, error } = await supabase
        .from('branches')
        .select('id')
        .eq('is_active', true)
        .order('name')
        .limit(1)
        .single()

      if (data && !error) {
        setBranchId(data.id)
      } else {
        console.error('No active branch found:', error)
      }
    }

    resolveBranch()
  }, [searchParams])

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const latestCalled = [...called, ...serving].sort(
      (a, b) => new Date(b.called_at || 0).getTime() - new Date(a.called_at || 0).getTime()
    )[0]

    if (latestCalled && latestCalled.id !== lastCalledId) {
      setLastCalledId(latestCalled.id)
      setIsNew(true)

      const stationName = latestCalled.station?.name || `Ventanilla ${latestCalled.station?.station_number}`
      announce({
        ticketNumber: latestCalled.ticket_number,
        stationName,
        customerName: latestCalled.customer_name,
      })

      setTimeout(() => setIsNew(false), 5000)
    }
  }, [called, serving, lastCalledId, announce])

  const currentlyServing = [...called, ...serving].sort(
    (a, b) => new Date(b.called_at || 0).getTime() - new Date(a.called_at || 0).getTime()
  )

  const latestTicket = currentlyServing[0]

  // Idle when there are no active tickets or after the "new" animation ends
  const showPromo = !isNew && currentlyServing.length === 0

  // Show loading state while resolving branch
  if (!branchId) {
    return (
      <div
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
        className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white flex items-center justify-center"
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-2xl text-blue-300">Configurando pantalla...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
      className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white overflow-hidden flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 lg:py-4 bg-black/30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={branding.name} className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-xl object-contain bg-white/10 p-1 shrink-0" />
          ) : (
            <div className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: branding.primary_color }}>
              <span className="text-white font-bold text-lg sm:text-2xl lg:text-3xl">{branding.name.charAt(0)}</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-xl lg:text-2xl font-bold truncate">{branding.name}</h1>
            <p className="text-blue-300 text-xs sm:text-sm hidden sm:block">Sistema de Turnos</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base sm:text-2xl lg:text-3xl font-mono font-bold">
            {currentTime.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-blue-300 text-xs sm:text-sm">
            {currentTime.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      {/* Main content - fills remaining height */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Current ticket */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
          {/* Promo carousel when idle */}
          {orgId && (
            <PromoCarousel
              organizationId={orgId}
              branchId={branchId}
              isIdle={showPromo}
            />
          )}

          {latestTicket ? (
            <div className={`text-center ${isNew ? 'animate-ticket-call' : ''}`}>
              <p className="text-blue-300 text-sm sm:text-lg lg:text-xl mb-2 uppercase tracking-wider">Turno Actual</p>
              <div className={`
                inline-block px-8 py-4 sm:px-12 sm:py-6 lg:px-16 lg:py-8 rounded-3xl mb-4 lg:mb-6
                ${isNew ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.3)]' : 'bg-white/10 border border-white/20'}
                transition-all duration-500
              `}>
                <span className="font-mono font-black text-5xl sm:text-7xl lg:text-8xl xl:text-9xl tracking-wider">
                  {latestTicket.ticket_number}
                </span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-blue-200 mb-1 sm:mb-2">
                {latestTicket.station?.name || `Ventanilla ${latestTicket.station?.station_number}`}
              </p>
              <p className="text-base sm:text-lg lg:text-xl text-blue-300/70">{latestTicket.service?.name}</p>
              {latestTicket.customer_name && (
                <p className="text-sm sm:text-base lg:text-lg text-blue-300/50 mt-1 sm:mt-2">{latestTicket.customer_name}</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-5xl sm:text-6xl lg:text-8xl block mb-4 lg:mb-6 opacity-30">&#128522;</p>
              <p className="text-xl sm:text-2xl lg:text-3xl text-blue-300/50">No hay turnos activos</p>
            </div>
          )}
        </div>

        {/* Right sidebar: queue info */}
        <div className="w-44 sm:w-64 md:w-72 lg:w-80 xl:w-96 h-full bg-black/20 border-l border-white/10 flex flex-col shrink-0 overflow-hidden">
          {currentlyServing.length > 1 && (
            <div className="p-2 sm:p-4 lg:p-6 border-b border-white/10 shrink-0">
              <h3 className="text-blue-300 font-semibold mb-1.5 sm:mb-3 lg:mb-4 uppercase tracking-wider text-xs sm:text-sm">Recientes</h3>
              <div className="space-y-1.5 sm:space-y-3">
                {currentlyServing.slice(1, 5).map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-1.5 sm:p-3 bg-white/5 rounded-xl">
                    <span className="font-mono font-bold text-sm sm:text-lg lg:text-xl">{ticket.ticket_number}</span>
                    <div className="text-right">
                      <p className="text-xs sm:text-sm text-blue-200 truncate max-w-[60px] sm:max-w-none">{ticket.station?.name}</p>
                      <p className="text-xs text-blue-300/50 hidden sm:block">{ticket.service?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 p-2 sm:p-3 lg:p-4 min-h-0 overflow-hidden">
            <h3 className="text-blue-300 font-semibold mb-1 sm:mb-2 lg:mb-3 uppercase tracking-wider text-xs sm:text-sm">
              En Espera ({waiting.length})
            </h3>
            <div className="space-y-0.5 sm:space-y-2 overflow-y-auto h-full">
              {waiting.slice(0, 10).map((ticket, i) => (
                <div key={ticket.id} className="flex items-center gap-1.5 sm:gap-3 p-1 sm:p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="text-xs text-blue-300/40 w-3 sm:w-5">{i + 1}</span>
                  <span className="font-mono font-bold text-xs sm:text-base text-blue-100">{ticket.ticket_number}</span>
                  <span className="text-xs text-blue-300/60 flex-1 truncate hidden sm:inline">{ticket.service?.name}</span>
                  {ticket.priority > 0 && (
                    <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                      ticket.priority === 3 ? 'bg-red-400' :
                      ticket.priority === 2 ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                  )}
                </div>
              ))}
              {waiting.length > 10 && (
                <p className="text-center text-blue-300/40 text-xs pt-1">+{waiting.length - 10} mas</p>
              )}
            </div>
          </div>

          {serviceEstimates.length > 0 && (
            <div className="hidden sm:block p-3 sm:p-4 lg:p-6 border-t border-white/10 shrink-0">
              <h3 className="text-blue-300 font-semibold mb-2 sm:mb-3 uppercase tracking-wider text-xs sm:text-sm">Tiempo Estimado</h3>
              <div className="space-y-1 sm:space-y-2">
                {serviceEstimates.map((est) => (
                  <div key={est.serviceId} className="flex items-center justify-between p-1.5 sm:p-2 bg-white/5 rounded-lg">
                    <span className="text-xs sm:text-sm text-blue-200 truncate flex-1">{est.serviceName}</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-300 ml-2">~{est.estimatedMinutes}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR Code - always pinned to bottom */}
          {branchId && (
            <div className="p-1.5 sm:p-3 lg:p-4 border-t border-white/10 shrink-0">
              <div className="flex sm:flex-col items-center sm:items-center gap-1.5 sm:gap-1">
                <div className="bg-white p-1 sm:p-1.5 rounded-lg shrink-0">
                  <QRCode
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?branch=${branchId}`}
                    size={40}
                    className="sm:hidden"
                  />
                  <QRCode
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?branch=${branchId}`}
                    size={56}
                    className="hidden sm:block lg:hidden"
                  />
                  <QRCode
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?branch=${branchId}`}
                    size={72}
                    className="hidden lg:block"
                  />
                </div>
                <div className="sm:text-center">
                  <p className="text-[10px] text-blue-300 font-semibold sm:hidden">Tomar Turno</p>
                  <p className="text-blue-300 font-semibold uppercase tracking-wider text-xs text-center hidden sm:block">Tomar Turno</p>
                  <p className="text-[10px] sm:text-xs text-blue-300/50 sm:text-center">Escanee el QR</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

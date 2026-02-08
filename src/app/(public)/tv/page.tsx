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

  const fetchEstimates = useCallback(async () => {
    if (!branchId) return
    const supabase = createClient()

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

  useEffect(() => {
    fetchEstimates()
    const interval = setInterval(fetchEstimates, 30000)
    return () => clearInterval(interval)
  }, [fetchEstimates])

  useEffect(() => {
    const resolveBranch = async () => {
      const branchParam = searchParams.get('branch')

      if (branchParam) {
        setBranchId(branchParam)
        return
      }

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
  const showPromo = !isNew && currentlyServing.length === 0

  if (!branchId) {
    return (
      <div
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
        className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white flex items-center justify-center"
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-2xl text-blue-300">Configurando pantalla...</p>
        </div>
      </div>
    )
  }

  const priorityColor = latestTicket?.priority === 3
    ? 'border-red-400 shadow-[0_0_40px_rgba(248,113,113,0.3)]'
    : latestTicket?.priority === 2
      ? 'border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.3)]'
      : 'border-white/20'

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
      className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white overflow-hidden flex flex-col"
    >
      {/* Animated background orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/[0.04] rounded-full blur-3xl animate-[drift_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/[0.05] rounded-full blur-3xl animate-[drift_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-3xl animate-[drift_30s_ease-in-out_infinite]" />
      </div>

      {/* Inline keyframes for animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -20px) scale(1.05); }
          50% { transform: translate(-20px, 30px) scale(0.95); }
          75% { transform: translate(20px, 20px) scale(1.02); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(59,130,246,0.15), 0 0 60px rgba(59,130,246,0.05); }
          50% { box-shadow: 0 0 40px rgba(59,130,246,0.25), 0 0 80px rgba(59,130,246,0.1); }
        }
        @keyframes ticketGlow {
          0% { box-shadow: 0 0 20px rgba(245,158,11,0.2); }
          50% { box-shadow: 0 0 60px rgba(245,158,11,0.4), 0 0 100px rgba(245,158,11,0.15); }
          100% { box-shadow: 0 0 20px rgba(245,158,11,0.2); }
        }
        @keyframes callBounce {
          0% { transform: scale(1); }
          15% { transform: scale(1.08); }
          30% { transform: scale(1); }
          45% { transform: scale(1.05); }
          60% { transform: scale(1); }
        }
      `}} />

      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 lg:py-4 bg-black/30 border-b border-white/[0.06] shrink-0">
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
            <p className="text-blue-300/70 text-xs sm:text-sm hidden sm:block">Sistema de Turnos</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base sm:text-2xl lg:text-3xl font-mono font-bold tracking-wider">
            {currentTime.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-blue-300/60 text-xs sm:text-sm capitalize">
            {currentTime.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Current ticket or idle state */}
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
            /* Active ticket display */
            <div
              className={`text-center ${isNew ? '' : ''}`}
              style={isNew ? { animation: 'callBounce 1s ease-out' } : undefined}
            >
              <p className="text-blue-300/80 text-sm sm:text-lg lg:text-xl mb-3 uppercase tracking-[0.2em] font-medium">
                Turno Actual
              </p>

              <div
                className={`
                  inline-block px-10 py-5 sm:px-14 sm:py-7 lg:px-20 lg:py-10 rounded-2xl mb-5 lg:mb-7
                  bg-white/[0.06] backdrop-blur-sm border
                  ${isNew
                    ? `border-amber-400/60 ${priorityColor}`
                    : `${priorityColor} bg-white/[0.04]`
                  }
                  transition-all duration-700
                `}
                style={isNew ? { animation: 'ticketGlow 2s ease-in-out infinite' } : undefined}
              >
                <span className="font-mono font-black text-5xl sm:text-7xl lg:text-8xl xl:text-9xl tracking-wider">
                  {latestTicket.ticket_number}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white">
                  {latestTicket.station?.name || `Ventanilla ${latestTicket.station?.station_number}`}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
                  {latestTicket.service?.color && (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: latestTicket.service.color }} />
                  )}
                  <span className="text-sm sm:text-base lg:text-lg text-blue-200/80">
                    {latestTicket.service?.name}
                  </span>
                </div>
                {latestTicket.customer_name && (
                  <p className="text-sm sm:text-base lg:text-lg text-blue-300/40 mt-1">{latestTicket.customer_name}</p>
                )}
              </div>
            </div>
          ) : (
            /* Idle state - professional welcome screen */
            <div className="text-center">
              <div
                className="mx-auto mb-8 lg:mb-10 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-2xl flex items-center justify-center bg-white/[0.04] border border-white/[0.08]"
                style={{ animation: 'glowPulse 4s ease-in-out infinite' }}
              >
                {branding.logo_url ? (
                  <img src={branding.logo_url} alt={branding.name} className="w-16 h-16 sm:w-22 sm:h-22 lg:w-28 lg:h-28 object-contain" />
                ) : (
                  <span
                    className="text-5xl sm:text-6xl lg:text-7xl font-bold"
                    style={{ color: branding.primary_color }}
                  >
                    {branding.name.charAt(0)}
                  </span>
                )}
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white/90 mb-3">
                Bienvenidos
              </h2>
              <p className="text-lg sm:text-xl lg:text-2xl text-blue-300/50 mb-8">
                {branding.name}
              </p>

              {waiting.length > 0 && (
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-blue-200/70 text-sm sm:text-base lg:text-lg">
                    {waiting.length} {waiting.length === 1 ? 'persona' : 'personas'} en espera
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-44 sm:w-64 md:w-72 lg:w-80 xl:w-96 h-full bg-black/30 border-l border-white/[0.06] flex flex-col shrink-0 overflow-hidden">
          {/* Recently served */}
          {currentlyServing.length > 1 && (
            <div className="p-2 sm:p-4 lg:p-6 border-b border-white/[0.06] shrink-0">
              <h3 className="text-blue-300/70 font-semibold mb-1.5 sm:mb-3 lg:mb-4 uppercase tracking-wider text-[10px] sm:text-xs">
                Recientes
              </h3>
              <div className="space-y-1.5 sm:space-y-2.5">
                {currentlyServing.slice(1, 5).map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-1.5 sm:p-3 bg-white/[0.04] border border-white/[0.05] rounded-xl">
                    <span className="font-mono font-bold text-sm sm:text-lg lg:text-xl">{ticket.ticket_number}</span>
                    <div className="text-right">
                      <p className="text-xs sm:text-sm text-blue-200/80 truncate max-w-[60px] sm:max-w-none">{ticket.station?.name}</p>
                      <p className="text-[10px] sm:text-xs text-blue-300/40 hidden sm:block">{ticket.service?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waiting list */}
          <div className="flex-1 p-2 sm:p-3 lg:p-4 min-h-0 overflow-hidden">
            <h3 className="text-blue-300/70 font-semibold mb-1 sm:mb-2 lg:mb-3 uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-2">
              <span>En Espera</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-300 text-[10px] font-bold">
                {waiting.length}
              </span>
            </h3>
            <div className="space-y-0.5 sm:space-y-1.5 overflow-y-auto h-full">
              {waiting.slice(0, 10).map((ticket, i) => (
                <div key={ticket.id} className="flex items-center gap-1.5 sm:gap-3 p-1 sm:p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <span className="text-[10px] sm:text-xs text-blue-300/30 w-4 sm:w-5 text-right font-mono">{i + 1}</span>
                  <span className="font-mono font-bold text-xs sm:text-base text-blue-100">{ticket.ticket_number}</span>
                  <span className="text-[10px] sm:text-xs text-blue-300/40 flex-1 truncate hidden sm:inline">{ticket.service?.name}</span>
                  {ticket.priority > 0 && (
                    <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                      ticket.priority === 3 ? 'bg-red-400' :
                      ticket.priority === 2 ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                  )}
                </div>
              ))}
              {waiting.length > 10 && (
                <p className="text-center text-blue-300/30 text-[10px] sm:text-xs pt-1">+{waiting.length - 10} mas</p>
              )}
            </div>
          </div>

          {/* Service wait estimates */}
          {serviceEstimates.length > 0 && (
            <div className="hidden sm:block p-3 sm:p-4 lg:p-6 border-t border-white/[0.06] shrink-0">
              <h3 className="text-blue-300/70 font-semibold mb-2 sm:mb-3 uppercase tracking-wider text-[10px] sm:text-xs">
                Tiempo Estimado
              </h3>
              <div className="space-y-1 sm:space-y-2">
                {serviceEstimates.map((est) => (
                  <div key={est.serviceId} className="flex items-center justify-between p-1.5 sm:p-2 bg-white/[0.04] border border-white/[0.05] rounded-lg">
                    <span className="text-[10px] sm:text-sm text-blue-200/70 truncate flex-1">{est.serviceName}</span>
                    <span className="text-[10px] sm:text-sm font-bold text-amber-300/80 ml-2 font-mono">~{est.estimatedMinutes}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR Code */}
          {branchId && (
            <div className="p-2 sm:p-3 lg:p-5 border-t border-white/[0.06] shrink-0">
              <div className="flex sm:flex-col items-center sm:items-center gap-2 sm:gap-2">
                <div className="bg-white p-1.5 sm:p-2 rounded-xl shrink-0 shadow-lg shadow-black/20">
                  <QRCode
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?branch=${branchId}`}
                    size={40}
                    className="sm:hidden"
                  />
                  <QRCode
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?branch=${branchId}`}
                    size={60}
                    className="hidden sm:block lg:hidden"
                  />
                  <QRCode
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?branch=${branchId}`}
                    size={80}
                    className="hidden lg:block"
                  />
                </div>
                <div className="sm:text-center">
                  <p className="text-[10px] sm:text-xs text-blue-200/70 font-semibold uppercase tracking-wider">Tomar Turno</p>
                  <p className="text-[9px] sm:text-[10px] text-blue-300/40">Escanee el codigo QR</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

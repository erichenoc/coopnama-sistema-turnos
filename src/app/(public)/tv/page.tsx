'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { estimateWaitTime } from '@/lib/estimations/wait-time'
import { useRealtimeQueue } from '@/shared/hooks/use-realtime-queue'
import { useTicketAnnouncer } from '@/shared/hooks/use-ticket-announcer'

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

  // Show loading state while resolving branch
  if (!branchId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-2xl text-blue-300">Configurando pantalla...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white overflow-hidden">
      <header className="flex items-center justify-between px-8 py-4 bg-black/30">
        <div className="flex items-center gap-4">
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={branding.name} className="w-16 h-16 rounded-xl object-contain bg-white/10 p-1" />
          ) : (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: branding.primary_color }}>
              <span className="text-white font-bold text-3xl">{branding.name.charAt(0)}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{branding.name}</h1>
            <p className="text-blue-300 text-sm">Sistema de Turnos</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-bold">
            {currentTime.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-blue-300 text-sm">
            {currentTime.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      <div className="flex h-[calc(100vh-88px)]">
        <div className="flex-1 flex items-center justify-center p-8">
          {latestTicket ? (
            <div className={`text-center ${isNew ? 'animate-ticket-call' : ''}`}>
              <p className="text-blue-300 text-xl mb-2 uppercase tracking-wider">Turno Actual</p>
              <div className={`
                inline-block px-16 py-8 rounded-3xl mb-6
                ${isNew ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.3)]' : 'bg-white/10 border border-white/20'}
                transition-all duration-500
              `}>
                <span className="font-mono font-black text-8xl lg:text-9xl tracking-wider">
                  {latestTicket.ticket_number}
                </span>
              </div>
              <p className="text-3xl font-semibold text-blue-200 mb-2">
                {latestTicket.station?.name || `Ventanilla ${latestTicket.station?.station_number}`}
              </p>
              <p className="text-xl text-blue-300/70">{latestTicket.service?.name}</p>
              {latestTicket.customer_name && (
                <p className="text-lg text-blue-300/50 mt-2">{latestTicket.customer_name}</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-8xl block mb-6 opacity-30">&#128522;</p>
              <p className="text-3xl text-blue-300/50">No hay turnos activos</p>
            </div>
          )}
        </div>

        <div className="w-96 bg-black/20 border-l border-white/10 flex flex-col">
          {currentlyServing.length > 1 && (
            <div className="p-6 border-b border-white/10">
              <h3 className="text-blue-300 font-semibold mb-4 uppercase tracking-wider text-sm">Recientes</h3>
              <div className="space-y-3">
                {currentlyServing.slice(1, 5).map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <span className="font-mono font-bold text-xl">{ticket.ticket_number}</span>
                    <div className="text-right">
                      <p className="text-sm text-blue-200">{ticket.station?.name}</p>
                      <p className="text-xs text-blue-300/50">{ticket.service?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 p-6 overflow-hidden">
            <h3 className="text-blue-300 font-semibold mb-4 uppercase tracking-wider text-sm">
              En Espera ({waiting.length})
            </h3>
            <div className="space-y-2 overflow-y-auto max-h-full">
              {waiting.slice(0, 15).map((ticket, i) => (
                <div key={ticket.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="text-sm text-blue-300/40 w-5">{i + 1}</span>
                  <span className="font-mono font-bold text-blue-100">{ticket.ticket_number}</span>
                  <span className="text-sm text-blue-300/60 flex-1 truncate">{ticket.service?.name}</span>
                  {ticket.priority > 0 && (
                    <span className={`w-2 h-2 rounded-full ${
                      ticket.priority === 3 ? 'bg-red-400' :
                      ticket.priority === 2 ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                  )}
                </div>
              ))}
              {waiting.length > 15 && (
                <p className="text-center text-blue-300/40 text-sm pt-2">+{waiting.length - 15} mas</p>
              )}
            </div>
          </div>

          {serviceEstimates.length > 0 && (
            <div className="p-6 border-t border-white/10">
              <h3 className="text-blue-300 font-semibold mb-3 uppercase tracking-wider text-sm">Tiempo Estimado</h3>
              <div className="space-y-2">
                {serviceEstimates.map((est) => (
                  <div key={est.serviceId} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <span className="text-sm text-blue-200 truncate flex-1">{est.serviceName}</span>
                    <span className="text-sm font-bold text-amber-300 ml-2">~{est.estimatedMinutes}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

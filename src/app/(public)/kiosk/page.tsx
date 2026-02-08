'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createTicketAction } from '@/lib/actions/tickets'
import { estimateWaitTime } from '@/lib/estimations/wait-time'
import { Spinner } from '@/shared/components/spinner'
import { TicketReceipt } from '@/shared/components/ticket-receipt'
import { useThermalPrinter } from '@/shared/hooks/use-thermal-printer'
import type { Service, Ticket } from '@/shared/types/domain'

interface Member {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  full_name: string | null
  cedula: string | null
  member_type: string
  phone: string | null
  email: string | null
}

interface OrgBranding {
  name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
}

const INACTIVITY_TIMEOUT = 30000

const SERVICE_ICONS: Record<string, string> = {
  creditos: '&#128179;',
  ahorros: '&#128176;',
  servicios: '&#128196;',
  general: '&#128101;',
}

type Step = 'services' | 'identity' | 'confirm' | 'ticket'

export default function KioskPage() {
  const searchParams = useSearchParams()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [branchId, setBranchId] = useState<string | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('services')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerCedula, setCustomerCedula] = useState('')
  const [creating, setCreating] = useState(false)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [memberFound, setMemberFound] = useState<Member | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [waitEstimate, setWaitEstimate] = useState<{ waitingCount: number; estimatedMinutes: number } | null>(null)
  const [branding, setBranding] = useState<OrgBranding>({ name: 'COOPNAMA', logo_url: null, primary_color: '#1e40af', secondary_color: '#059669' })
  const thermalPrinter = useThermalPrinter()

  useEffect(() => {
    const resolveOrgAndBranch = async () => {
      const supabase = createClient()
      const urlOrgId = searchParams.get('org')
      const urlBranchId = searchParams.get('branch')

      if (urlOrgId && urlBranchId) {
        setOrgId(urlOrgId)
        setBranchId(urlBranchId)
        return
      }

      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single()

      if (!orgs) { setLoading(false); return }

      const { data: branches } = await supabase
        .from('branches')
        .select('id')
        .eq('organization_id', orgs.id)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!branches) { setLoading(false); return }

      setOrgId(orgs.id)
      setBranchId(branches.id)
    }
    resolveOrgAndBranch()
  }, [searchParams])

  useEffect(() => {
    if (!orgId) return
    const fetchData = async () => {
      const supabase = createClient()
      const [servicesRes, orgRes] = await Promise.all([
        supabase.from('services').select('*').eq('organization_id', orgId).eq('is_active', true).order('sort_order'),
        supabase.from('organizations').select('name, logo_url, primary_color, secondary_color').eq('id', orgId).single(),
      ])
      setServices((servicesRes.data || []) as Service[])
      if (orgRes.data) {
        setBranding({
          name: orgRes.data.name || 'COOPNAMA',
          logo_url: orgRes.data.logo_url,
          primary_color: orgRes.data.primary_color || '#1e40af',
          secondary_color: orgRes.data.secondary_color || '#059669',
        })
      }
      setLoading(false)
    }
    fetchData()
  }, [orgId])

  useEffect(() => {
    if (step !== 'ticket') return
    const timeout = setTimeout(() => resetKiosk(), INACTIVITY_TIMEOUT)
    return () => clearTimeout(timeout)
  }, [step])

  useEffect(() => {
    if (step !== 'confirm' || !selectedService || !branchId) return
    estimateWaitTime(branchId, selectedService.id, selectedService.avg_duration_minutes)
      .then(setWaitEstimate)
      .catch(() => setWaitEstimate(null))
  }, [step, selectedService, branchId])

  const resetKiosk = () => {
    setStep('services')
    setSelectedService(null)
    setCustomerName('')
    setCustomerCedula('')
    setTicket(null)
    setError(null)
    setMemberFound(null)
    setLookingUp(false)
    setWaitEstimate(null)
  }

  const lookupMember = async (cedula: string) => {
    if (cedula.length < 11 || !orgId) return
    setLookingUp(true)
    const supabase = createClient()
    const cleanCedula = cedula.replace(/\D/g, '')
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('organization_id', orgId)
      .or(`cedula.eq.${cleanCedula},cedula.eq.${cedula}`)
      .limit(1)
      .maybeSingle()

    if (data) {
      setMemberFound(data)
      setCustomerName(data.full_name || `${data.first_name} ${data.last_name}`)
    } else {
      setMemberFound(null)
    }
    setLookingUp(false)
  }

  const handleCreateTicket = async () => {
    if (!selectedService || !orgId || !branchId) return
    setCreating(true)
    setError(null)

    let priority: 0 | 1 | 2 | 3 = 0
    if (memberFound) {
      if (memberFound.member_type === 'vip') priority = 2
      else if (memberFound.member_type === 'socio') priority = 1
    }

    const result = await createTicketAction({
      organization_id: orgId,
      branch_id: branchId,
      service_id: selectedService.id,
      customer_name: customerName || undefined,
      customer_cedula: customerCedula || undefined,
      member_id: memberFound?.id || undefined,
      source: 'kiosk',
      priority,
    })

    if (result.error) {
      setError(result.error)
      setCreating(false)
      return
    }

    setTicket(result.data!)
    setStep('ticket')
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col relative overflow-hidden">
      {/* CSS Animations */}
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
        @keyframes successPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.01); box-shadow: 0 0 20px rgba(16,185,129,0.3); }
          100% { transform: scale(1); }
        }
        @keyframes ticketReveal {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes numberGlow {
          0%, 100% { text-shadow: 0 0 20px currentColor; }
          50% { text-shadow: 0 0 40px currentColor, 0 0 80px currentColor; }
        }
      `}} />

      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-3xl"
          style={{ animation: 'drift 20s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-indigo-500/[0.05] rounded-full blur-3xl"
          style={{ animation: 'drift 25s ease-in-out infinite reverse' }}
        />
      </div>

      {/* Header - Glass */}
      <header className="relative z-10 py-6 px-8 bg-white/[0.04] backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-center gap-4">
          <div
            className="rounded-xl overflow-hidden bg-white/[0.06] border border-white/[0.1] p-1.5"
            style={{ animation: 'glowPulse 4s ease-in-out infinite' }}
          >
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.name} className="w-14 h-14 rounded-lg object-contain" />
            ) : (
              <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: branding.primary_color }}>
                <span className="text-white font-bold text-2xl">{branding.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{branding.name}</h1>
            <p className="text-blue-200/40 text-sm">Sistema de Turnos - Autoservicio</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-8">

        {/* ====== STEP: SERVICES ====== */}
        {step === 'services' && (
          <div className="w-full max-w-4xl animate-fade-in">
            <h2 className="text-3xl font-bold text-white text-center mb-2">Seleccione un Servicio</h2>
            <p className="text-blue-200/40 text-center mb-10 text-lg">Toque el servicio que necesita</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => { setSelectedService(service); setStep('identity') }}
                  className="flex flex-col items-center justify-center gap-4 p-10 bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl hover:bg-white/[0.10] hover:border-white/[0.15] active:bg-white/[0.03] transition-all duration-200 group"
                  style={{ minHeight: '180px' }}
                >
                  <span
                    className="text-6xl block transition-transform duration-200 group-hover:scale-110"
                    dangerouslySetInnerHTML={{ __html: SERVICE_ICONS[service.category] || '&#128196;' }}
                  />
                  <span className="text-xl font-bold text-white">{service.name}</span>
                  {service.description && (
                    <span className="text-sm text-white/40 text-center">{service.description}</span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-sm text-blue-300/70">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ~{service.avg_duration_minutes} min
                  </span>
                </button>
              ))}
              {services.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-white/30 text-xl">No hay servicios disponibles</p>
                  <p className="text-white/15 text-sm mt-2">Configure servicios en el panel de administracion</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== STEP: IDENTITY ====== */}
        {step === 'identity' && (
          <div className="w-full max-w-lg animate-fade-in">
            <h2 className="text-3xl font-bold text-white text-center mb-2">Identificacion (Opcional)</h2>
            <p className="text-blue-200/40 text-center mb-8">Para un servicio mas rapido</p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2 uppercase tracking-wider">Cedula</label>
                <input
                  type="text"
                  value={customerCedula}
                  onChange={(e) => {
                    const value = e.target.value
                    setCustomerCedula(value)
                    if (memberFound && value !== memberFound.cedula) {
                      setMemberFound(null)
                      setCustomerName('')
                    }
                    const cleanValue = value.replace(/\D/g, '')
                    if (cleanValue.length >= 11) {
                      lookupMember(value)
                    }
                  }}
                  placeholder="001-0000000-0"
                  className="w-full px-6 py-4 text-lg bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 focus:bg-white/[0.08] transition-all duration-200"
                />
                {lookingUp && (
                  <p className="text-sm text-white/40 mt-2 flex items-center gap-2">
                    <Spinner size="sm" />
                    Buscando socio...
                  </p>
                )}
                {memberFound && !lookingUp && (
                  <div
                    className="mt-3 p-4 bg-emerald-500/[0.08] border border-emerald-400/[0.25] rounded-xl"
                    style={{ animation: 'successPulse 1s ease-out' }}
                  >
                    <p className="text-emerald-300 font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Socio encontrado: {memberFound.full_name || `${memberFound.first_name} ${memberFound.last_name}`}
                    </p>
                    <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold bg-white/[0.08] rounded-full text-white/70">
                      {memberFound.member_type === 'vip' && 'VIP'}
                      {memberFound.member_type === 'socio' && 'Socio'}
                      {memberFound.member_type === 'empleado' && 'Empleado'}
                      {memberFound.member_type === 'cliente' && 'Cliente'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2 uppercase tracking-wider">Nombre</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Su nombre completo"
                  disabled={!!memberFound}
                  className="w-full px-6 py-4 text-lg bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 focus:bg-white/[0.08] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                {memberFound && (
                  <p className="text-xs text-white/25 mt-1">Nombre auto-completado desde el sistema</p>
                )}
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 py-4 text-lg font-semibold bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/60 hover:bg-white/[0.08] hover:text-white/80 active:bg-white/[0.03] transition-all duration-200"
                  style={{ minHeight: '60px' }}
                >
                  Omitir
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 py-4 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 active:bg-blue-700 transition-all duration-200 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  style={{ minHeight: '60px' }}
                >
                  Continuar
                </button>
              </div>
              <button onClick={resetKiosk} className="w-full py-3 text-white/25 hover:text-white/50 transition-colors text-sm">
                Volver al inicio
              </button>
            </div>
          </div>
        )}

        {/* ====== STEP: CONFIRM ====== */}
        {step === 'confirm' && selectedService && (
          <div className="w-full max-w-lg text-center animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-8">Confirmar Turno</h2>
            <div className="p-8 bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] rounded-2xl mb-8">
              <span
                className="text-5xl mb-4 block"
                dangerouslySetInnerHTML={{ __html: SERVICE_ICONS[selectedService.category] || '&#128196;' }}
              />
              <p className="text-2xl font-bold text-white mb-2">{selectedService.name}</p>
              {customerName && <p className="text-white/50 text-lg">{customerName}</p>}
              {waitEstimate ? (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-1">En espera</p>
                    <p className="text-3xl font-bold text-blue-400">{waitEstimate.waitingCount}</p>
                  </div>
                  <div className="p-4 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Espera est.</p>
                    <p className="text-3xl font-bold text-emerald-400">~{waitEstimate.estimatedMinutes} min</p>
                  </div>
                </div>
              ) : (
                <p className="text-white/30 mt-4">Tiempo estimado: ~{selectedService.avg_duration_minutes} min</p>
              )}
            </div>
            {error && (
              <div className="p-4 bg-red-500/[0.1] border border-red-400/[0.25] rounded-xl mb-4">
                <p className="text-red-300">{error}</p>
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={resetKiosk}
                className="flex-1 py-4 text-lg font-semibold bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/60 hover:bg-white/[0.08] hover:text-white/80 active:bg-white/[0.03] transition-all duration-200"
                style={{ minHeight: '60px' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={creating}
                className="flex-1 py-4 text-lg font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 active:bg-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                style={{ minHeight: '60px' }}
              >
                {creating ? 'Creando...' : 'Obtener Turno'}
              </button>
            </div>
          </div>
        )}

        {/* ====== STEP: TICKET ====== */}
        {step === 'ticket' && ticket && (
          <div className="w-full max-w-lg text-center" style={{ animation: 'ticketReveal 0.5s ease-out' }}>
            <div className="p-10 bg-white/[0.06] backdrop-blur-2xl border border-white/[0.12] rounded-3xl mb-8 shadow-[0_0_60px_rgba(59,130,246,0.1)] print:shadow-none print:bg-white print:border-gray-200">
              {/* Success check */}
              <div
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: branding.secondary_color, animation: 'checkPop 0.6s ease-out' }}
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Org branding */}
              <div className="flex items-center justify-center gap-3 mb-6">
                {branding.logo_url ? (
                  <img src={branding.logo_url} alt={branding.name} className="w-10 h-10 rounded-lg object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: branding.primary_color }}>
                    <span className="text-white font-bold text-lg">{branding.name.charAt(0)}</span>
                  </div>
                )}
                <span className="font-bold text-lg text-white/80">{branding.name}</span>
              </div>

              <p className="text-white/40 mb-2 text-sm uppercase tracking-wider">Su turno es</p>
              <span
                className="font-mono font-black text-7xl block mb-4"
                style={{ color: branding.primary_color, animation: 'numberGlow 3s ease-in-out infinite' }}
              >
                {ticket.ticket_number}
              </span>
              <p className="text-xl text-white/80 mb-1">{selectedService?.name}</p>
              {customerName && <p className="text-white/40">{customerName}</p>}
              <p className="text-sm text-white/20 mt-4">
                {new Date(ticket.created_at).toLocaleString('es-DO')}
              </p>
              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <p className="text-sm text-white/30">Consulte su turno en</p>
                <p className="text-blue-400 font-mono font-bold">/mi-turno</p>
              </div>
            </div>
            <div className="flex gap-4 print:hidden">
              {thermalPrinter.connected ? (
                <button
                  onClick={() => thermalPrinter.printTicket({
                    ticketNumber: ticket.ticket_number,
                    serviceName: selectedService?.name || '',
                    customerName: customerName || null,
                    createdAt: ticket.created_at,
                    estimatedMinutes: waitEstimate?.estimatedMinutes || selectedService?.avg_duration_minutes,
                  })}
                  disabled={thermalPrinter.printing}
                  className="flex-1 py-4 text-lg font-semibold bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/70 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.03] transition-all duration-200 disabled:opacity-50"
                  style={{ minHeight: '60px' }}
                >
                  {thermalPrinter.printing ? 'Imprimiendo...' : 'Imprimir Recibo'}
                </button>
              ) : (
                <TicketReceipt
                  ticketNumber={ticket.ticket_number}
                  serviceName={selectedService?.name || ''}
                  customerName={customerName || null}
                  createdAt={ticket.created_at}
                  estimatedMinutes={selectedService?.avg_duration_minutes}
                />
              )}
              <button
                onClick={resetKiosk}
                className="flex-1 py-4 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 active:bg-blue-700 transition-all duration-200 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                style={{ minHeight: '60px' }}
              >
                Nuevo Turno
              </button>
            </div>
            <p className="text-sm text-white/15 mt-6 print:hidden">
              Esta pantalla se reiniciara automaticamente en 30 segundos
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

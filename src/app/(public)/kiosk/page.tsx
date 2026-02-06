'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createTicketAction } from '@/lib/actions/tickets'
import { Spinner } from '@/shared/components/spinner'
import type { Service, Ticket } from '@/shared/types/domain'

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_BRANCH_ID = '00000000-0000-0000-0000-000000000001'
const INACTIVITY_TIMEOUT = 30000

const SERVICE_ICONS: Record<string, string> = {
  creditos: '&#128179;',
  ahorros: '&#128176;',
  servicios: '&#128196;',
  general: '&#128101;',
}

type Step = 'services' | 'identity' | 'confirm' | 'ticket'

export default function KioskPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('services')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerCedula, setCustomerCedula] = useState('')
  const [creating, setCreating] = useState(false)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchServices = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', DEMO_ORG_ID)
        .eq('is_active', true)
        .order('sort_order')
      setServices((data || []) as Service[])
      setLoading(false)
    }
    fetchServices()
  }, [])

  useEffect(() => {
    if (step !== 'ticket') return
    const timeout = setTimeout(() => resetKiosk(), INACTIVITY_TIMEOUT)
    return () => clearTimeout(timeout)
  }, [step])

  const resetKiosk = () => {
    setStep('services')
    setSelectedService(null)
    setCustomerName('')
    setCustomerCedula('')
    setTicket(null)
    setError(null)
  }

  const handleCreateTicket = async () => {
    if (!selectedService) return
    setCreating(true)
    setError(null)

    const result = await createTicketAction({
      organization_id: DEMO_ORG_ID,
      branch_id: DEMO_BRANCH_ID,
      service_id: selectedService.id,
      customer_name: customerName || undefined,
      customer_cedula: customerCedula || undefined,
      source: 'kiosk',
      priority: 0,
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
      <div className="min-h-screen bg-neu-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neu-bg flex flex-col">
      <header className="bg-coopnama-primary text-white py-6 px-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-3xl font-bold">COOPNAMA</h1>
        </div>
        <p className="text-blue-200 text-lg">Sistema de Turnos - Autoservicio</p>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        {step === 'services' && (
          <div className="w-full max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">Seleccione un Servicio</h2>
            <p className="text-gray-500 text-center mb-10 text-lg">Toque el servicio que necesita</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => { setSelectedService(service); setStep('identity') }}
                  className="flex flex-col items-center justify-center gap-4 p-10 bg-neu-bg shadow-neu rounded-neu-lg hover:shadow-neu-md active:shadow-neu-inset transition-all duration-200"
                >
                  <span className="text-6xl" dangerouslySetInnerHTML={{ __html: SERVICE_ICONS[service.category] || '&#128196;' }} />
                  <span className="text-xl font-bold text-gray-800">{service.name}</span>
                  {service.description && (
                    <span className="text-sm text-gray-500 text-center">{service.description}</span>
                  )}
                  <span className="text-sm text-coopnama-primary">~{service.avg_duration_minutes} min</span>
                </button>
              ))}
              {services.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-400 text-xl">No hay servicios disponibles</p>
                  <p className="text-gray-300 text-sm mt-2">Configure servicios en el panel de administracion</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'identity' && (
          <div className="w-full max-w-lg">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">Identificacion (Opcional)</h2>
            <p className="text-gray-500 text-center mb-8">Para un servicio mas rapido</p>
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Nombre</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Su nombre completo"
                  className="w-full px-6 py-4 text-lg bg-neu-bg shadow-neu-inset rounded-neu text-gray-700 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Cedula</label>
                <input
                  type="text"
                  value={customerCedula}
                  onChange={(e) => setCustomerCedula(e.target.value)}
                  placeholder="001-0000000-0"
                  className="w-full px-6 py-4 text-lg bg-neu-bg shadow-neu-inset rounded-neu text-gray-700 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 py-4 text-lg font-semibold bg-neu-bg shadow-neu rounded-neu text-gray-600 hover:shadow-neu-sm active:shadow-neu-inset transition-all"
                >
                  Omitir
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 py-4 text-lg font-semibold bg-coopnama-primary text-white rounded-neu shadow-neu hover:bg-blue-700 active:shadow-neu-inset transition-all"
                >
                  Continuar
                </button>
              </div>
              <button onClick={resetKiosk} className="w-full py-3 text-gray-400 hover:text-gray-600 transition-colors">
                Volver al inicio
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && selectedService && (
          <div className="w-full max-w-lg text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Confirmar Turno</h2>
            <div className="p-8 bg-neu-bg shadow-neu-lg rounded-neu-lg mb-8">
              <span className="text-5xl mb-4 block" dangerouslySetInnerHTML={{ __html: SERVICE_ICONS[selectedService.category] || '&#128196;' }} />
              <p className="text-2xl font-bold text-gray-800 mb-2">{selectedService.name}</p>
              {customerName && <p className="text-gray-600 text-lg">{customerName}</p>}
              <p className="text-gray-400 mt-2">Tiempo estimado: ~{selectedService.avg_duration_minutes} min</p>
            </div>
            {error && (
              <div className="p-4 bg-coopnama-danger/10 border border-coopnama-danger/20 rounded-neu-sm mb-4">
                <p className="text-coopnama-danger">{error}</p>
              </div>
            )}
            <div className="flex gap-4">
              <button onClick={resetKiosk} className="flex-1 py-4 text-lg font-semibold bg-neu-bg shadow-neu rounded-neu text-gray-600 hover:shadow-neu-sm active:shadow-neu-inset transition-all">
                Cancelar
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={creating}
                className="flex-1 py-4 text-lg font-semibold bg-coopnama-secondary text-white rounded-neu shadow-neu hover:bg-emerald-600 active:shadow-neu-inset transition-all disabled:opacity-50"
              >
                {creating ? 'Creando...' : 'Obtener Turno'}
              </button>
            </div>
          </div>
        )}

        {step === 'ticket' && ticket && (
          <div className="w-full max-w-lg text-center">
            <div className="p-10 bg-white shadow-neu-xl rounded-neu-xl mb-8 print:shadow-none">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-10 h-10 bg-coopnama-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="font-bold text-xl text-gray-800">COOPNAMA</span>
              </div>
              <p className="text-gray-500 mb-2">Su turno es</p>
              <span className="font-mono font-black text-7xl text-coopnama-primary block mb-4">
                {ticket.ticket_number}
              </span>
              <p className="text-xl text-gray-700 mb-1">{selectedService?.name}</p>
              {customerName && <p className="text-gray-500">{customerName}</p>}
              <p className="text-sm text-gray-400 mt-4">
                {new Date(ticket.created_at).toLocaleString('es-DO')}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Consulte su turno en</p>
                <p className="text-coopnama-primary font-mono font-bold">/mi-turno</p>
              </div>
            </div>
            <div className="flex gap-4 print:hidden">
              <button onClick={() => window.print()} className="flex-1 py-4 text-lg font-semibold bg-neu-bg shadow-neu rounded-neu text-gray-700 hover:shadow-neu-sm active:shadow-neu-inset transition-all">
                Imprimir
              </button>
              <button onClick={resetKiosk} className="flex-1 py-4 text-lg font-semibold bg-coopnama-primary text-white rounded-neu shadow-neu hover:bg-blue-700 active:shadow-neu-inset transition-all">
                Nuevo Turno
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-6 print:hidden">
              Esta pantalla se reiniciara automaticamente en 30 segundos
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

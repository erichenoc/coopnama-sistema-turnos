'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { estimateWaitTime } from '@/lib/estimations/wait-time'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { LOGO_URL } from '@/shared/components/coopnama-logo'
import { Clock, Users } from 'lucide-react'

interface BranchInfo {
  id: string
  name: string
  organization: {
    name: string
    logo_url: string | null
    primary_color: string
  }
}

interface Service {
  id: string
  name: string
  code: string
  description: string | null
  avg_duration_minutes: number | null
}

interface ServiceQueueInfo {
  waitingCount: number
  estimatedMinutes: number
  activeAgents: number
}

export default function JoinQueuePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const branchParam = searchParams.get('branch')

  const [branch, setBranch] = useState<BranchInfo | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [queueInfo, setQueueInfo] = useState<Record<string, ServiceQueueInfo>>({})

  useEffect(() => {
    if (!branchParam) {
      setError('Enlace inválido. Escanee el código QR nuevamente.')
      setLoading(false)
      return
    }

    async function fetchData() {
      const supabase = createClient()

      // Fetch branch with org info
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('id, name, organization_id, organization:organizations(name, logo_url, primary_color)')
        .eq('id', branchParam)
        .eq('is_active', true)
        .single()

      if (branchError || !branchData) {
        setError('Sucursal no encontrada o inactiva.')
        setLoading(false)
        return
      }

      const orgData = Array.isArray(branchData.organization)
        ? branchData.organization[0]
        : branchData.organization

      setBranch({
        id: branchData.id,
        name: branchData.name,
        organization: {
          name: orgData?.name || 'Organización',
          logo_url: orgData?.logo_url || null,
          primary_color: orgData?.primary_color || '#1e40af',
        },
      })

      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, name, code, description, avg_duration_minutes')
        .eq('organization_id', branchData.organization_id)
        .eq('is_active', true)
        .order('sort_order')

      setServices(servicesData || [])
      setLoading(false)

      // Fetch queue info per service
      if (servicesData && servicesData.length > 0) {
        fetchQueueInfo(branchData.id, servicesData)
      }
    }

    fetchData()
  }, [branchParam])

  const fetchQueueInfo = useCallback(async (bId: string, svcs: Service[]) => {
    const results: Record<string, ServiceQueueInfo> = {}
    await Promise.all(
      svcs.map(async (svc) => {
        try {
          const est = await estimateWaitTime(bId, svc.id, svc.avg_duration_minutes || 5)
          results[svc.id] = {
            waitingCount: est.waitingCount,
            estimatedMinutes: est.estimatedMinutes,
            activeAgents: est.activeAgents,
          }
        } catch {
          // Silently skip on error
        }
      })
    )
    setQueueInfo(results)
  }, [])

  // Refresh queue info every 30 seconds
  useEffect(() => {
    if (!branch || services.length === 0) return
    const interval = setInterval(() => {
      fetchQueueInfo(branch.id, services)
    }, 30000)
    return () => clearInterval(interval)
  }, [branch, services, fetchQueueInfo])

  const handleJoinQueue = async () => {
    if (!selectedServiceId || !branch) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: branch.id,
          serviceId: selectedServiceId,
          customerName: customerName.trim() || null,
          source: 'web',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Error al crear el turno')
        setSubmitting(false)
        return
      }

      const data = await response.json()
      const ticketNumber = data.ticket_number || data.data?.ticket_number

      if (ticketNumber) {
        setSuccess(ticketNumber)
        // Redirect to mi-turno after short delay
        setTimeout(() => {
          router.push(`/mi-turno?ticket=${ticketNumber}`)
        }, 2000)
      } else {
        setError('Error inesperado al crear el turno')
      }
    } catch {
      setError('Error de conexión. Intente nuevamente.')
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neu-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neu-bg flex items-center justify-center px-6">
        <Card className="max-w-md w-full shadow-neu-lg">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Turno Creado!</h2>
            <p className="text-5xl font-mono font-black text-coopnama-primary my-4">{success}</p>
            <p className="text-gray-500">Redirigiendo a seguimiento...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neu-bg">
      {/* Header */}
      <header className="bg-coopnama-primary text-white py-6 px-8 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {branch?.organization.logo_url ? (
            <img
              src={branch.organization.logo_url}
              alt={branch.organization.name}
              className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1"
            />
          ) : (
            <Image src={LOGO_URL} alt="Logo" width={40} height={40} className="rounded-lg object-contain" priority />
          )}
          <div>
            <p className="font-bold text-lg">{branch?.organization.name || 'COOPNAMA'}</p>
            <p className="text-blue-200 text-sm">{branch?.name || 'Sucursal'}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">Tomar Turno</h1>
        <p className="text-gray-500 text-center mb-8">Seleccione el servicio que necesita</p>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Customer Name (optional) */}
          <Input
            label="Su nombre (opcional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ej: Juan Pérez"
          />

          {/* Service Selection */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Seleccione un servicio</p>
            <div className="space-y-2">
              {services.map((service) => {
                const info = queueInfo[service.id]
                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`w-full text-left p-4 rounded-neu-sm transition-all ${
                      selectedServiceId === service.id
                        ? 'bg-coopnama-primary/10 border-2 border-coopnama-primary shadow-neu-sm'
                        : 'bg-white shadow-neu-xs hover:shadow-neu-sm border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{service.code}</span>
                    </div>
                    {info && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {info.waitingCount === 0
                              ? 'Sin espera'
                              : `${info.waitingCount} en espera`}
                          </span>
                        </div>
                        {info.waitingCount > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>~{info.estimatedMinutes} min</span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}

              {services.length === 0 && (
                <p className="text-center text-gray-400 py-8">No hay servicios disponibles</p>
              )}
            </div>
          </div>

          {/* Submit */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleJoinQueue}
            disabled={!selectedServiceId || submitting}
            isLoading={submitting}
            className="w-full"
          >
            Tomar Turno
          </Button>
        </div>
      </main>
    </div>
  )
}

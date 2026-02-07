'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/button'
import { Input, Textarea } from '@/shared/components/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Building2, MapPin, Briefcase, Monitor, CheckCircle2 } from 'lucide-react'

// Service Templates
const SERVICE_TEMPLATES = [
  { name: 'Prestamos Personales', code: 'PREST', category: 'prestamos' },
  { name: 'Prestamos Hipotecarios', code: 'HIPO', category: 'prestamos' },
  { name: 'Apertura de Ahorros', code: 'AHOR', category: 'ahorros' },
  { name: 'Depositos y Retiros', code: 'DEPO', category: 'transacciones' },
  { name: 'Pago de Prestamos', code: 'PAGO', category: 'pagos' },
  { name: 'Consultas Generales', code: 'CONS', category: 'consultas' },
  { name: 'Certificados Financieros', code: 'CERT', category: 'inversiones' },
  { name: 'Tarjetas de Credito', code: 'TARJ', category: 'tarjetas' },
]

interface OnboardingWizardProps {
  organizationId: string
  onComplete: () => void
}

interface StepData {
  // Step 1
  orgName: string
  orgType: string

  // Step 2
  branchName: string
  branchAddress: string
  branchId?: string

  // Step 3
  selectedServices: typeof SERVICE_TEMPLATES

  // Step 4
  stationCount: number
}

const STEPS = [
  { number: 1, label: 'Organización', icon: Building2 },
  { number: 2, label: 'Sucursal', icon: MapPin },
  { number: 3, label: 'Servicios', icon: Briefcase },
  { number: 4, label: 'Estaciones', icon: Monitor },
  { number: 5, label: 'Resumen', icon: CheckCircle2 },
]

export function OnboardingWizard({ organizationId, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<StepData>({
    orgName: '',
    orgType: 'cooperative',
    branchName: '',
    branchAddress: '',
    selectedServices: [],
    stationCount: 3,
  })

  const supabase = createClient()

  // Step 1: Save Organization Info
  const handleStep1 = async () => {
    if (!data.orgName.trim()) {
      toast.error('Ingrese el nombre de la organización')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: data.orgName,
          type: data.orgType,
        })
        .eq('id', organizationId)

      if (error) throw error

      toast.success('Información guardada')
      setCurrentStep(2)
    } catch (error) {
      toast.error('Error al guardar organización')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Create First Branch
  const handleStep2 = async () => {
    if (!data.branchName.trim() || !data.branchAddress.trim()) {
      toast.error('Complete todos los campos')
      return
    }

    setIsLoading(true)
    try {
      const { data: branch, error } = await supabase
        .from('branches')
        .insert({
          organization_id: organizationId,
          name: data.branchName,
          address: data.branchAddress,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      setData({ ...data, branchId: branch.id })
      toast.success('Sucursal creada')
      setCurrentStep(3)
    } catch (error) {
      toast.error('Error al crear sucursal')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Create Selected Services
  const handleStep3 = async () => {
    if (data.selectedServices.length === 0) {
      toast.error('Seleccione al menos un servicio')
      return
    }

    setIsLoading(true)
    try {
      const services = data.selectedServices.map((service, index) => ({
        organization_id: organizationId,
        name: service.name,
        code: `${service.code}-${(index + 1).toString().padStart(2, '0')}`,
        category: service.category,
        is_active: true,
      }))

      const { error } = await supabase.from('services').insert(services)

      if (error) throw error

      toast.success(`${services.length} servicios creados`)
      setCurrentStep(4)
    } catch (error) {
      toast.error('Error al crear servicios')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 4: Create Stations
  const handleStep4 = async () => {
    if (data.stationCount < 1 || data.stationCount > 20) {
      toast.error('Ingrese entre 1 y 20 estaciones')
      return
    }

    setIsLoading(true)
    try {
      const stations = Array.from({ length: data.stationCount }, (_, i) => ({
        organization_id: organizationId,
        branch_id: data.branchId,
        name: `Ventanilla ${i + 1}`,
        code: `VEN-${(i + 1).toString().padStart(2, '0')}`,
        is_active: true,
      }))

      const { error } = await supabase.from('stations').insert(stations)

      if (error) throw error

      toast.success(`${stations.length} estaciones creadas`)
      setCurrentStep(5)
    } catch (error) {
      toast.error('Error al crear estaciones')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle Service Selection
  const toggleService = (service: typeof SERVICE_TEMPLATES[0]) => {
    const isSelected = data.selectedServices.some((s) => s.code === service.code)

    if (isSelected) {
      setData({
        ...data,
        selectedServices: data.selectedServices.filter((s) => s.code !== service.code),
      })
    } else {
      setData({
        ...data,
        selectedServices: [...data.selectedServices, service],
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.number
          const isCompleted = currentStep > step.number

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-200
                    ${isActive ? 'bg-coopnama-primary text-white shadow-neu' : ''}
                    ${isCompleted ? 'bg-coopnama-secondary text-white' : ''}
                    ${!isActive && !isCompleted ? 'bg-neu-bg shadow-neu-inset text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <span
                  className={`
                    text-xs font-medium text-center
                    ${isActive ? 'text-coopnama-primary' : ''}
                    ${isCompleted ? 'text-coopnama-secondary' : ''}
                    ${!isActive && !isCompleted ? 'text-gray-400' : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={`
                    h-0.5 flex-1 mx-2 transition-colors duration-200
                    ${isCompleted ? 'bg-coopnama-secondary' : 'bg-gray-300'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <Card variant="raised" size="lg">
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && 'Información de la Organización'}
            {currentStep === 2 && 'Primera Sucursal'}
            {currentStep === 3 && 'Seleccione Servicios'}
            {currentStep === 4 && 'Configure Estaciones'}
            {currentStep === 5 && 'Todo Listo'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Organization */}
          {currentStep === 1 && (
            <>
              <Input
                label="Nombre de la Organización"
                placeholder="Ej: Cooperativa Nacional"
                value={data.orgName}
                onChange={(e) => setData({ ...data, orgName: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Tipo de Organización
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'cooperative', label: 'Cooperativa' },
                    { value: 'bank', label: 'Banco' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setData({ ...data, orgType: option.value })}
                      className={`
                        p-4 rounded-neu-sm text-center transition-all
                        ${data.orgType === option.value
                          ? 'shadow-neu-inset text-coopnama-primary font-semibold'
                          : 'shadow-neu hover:shadow-neu-sm text-gray-600'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button onClick={handleStep1} isLoading={isLoading}>
                  Continuar
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Branch */}
          {currentStep === 2 && (
            <>
              <Input
                label="Nombre de la Sucursal"
                placeholder="Ej: Sucursal Central"
                value={data.branchName}
                onChange={(e) => setData({ ...data, branchName: e.target.value })}
              />

              <Textarea
                label="Dirección"
                placeholder="Dirección completa de la sucursal"
                value={data.branchAddress}
                onChange={(e) => setData({ ...data, branchAddress: e.target.value })}
                rows={3}
              />

              <div className="flex justify-between gap-3 pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                  Atrás
                </Button>
                <Button onClick={handleStep2} isLoading={isLoading}>
                  Continuar
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Services */}
          {currentStep === 3 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_TEMPLATES.map((service) => {
                  const isSelected = data.selectedServices.some((s) => s.code === service.code)

                  return (
                    <button
                      key={service.code}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={`
                        p-4 rounded-neu-sm text-left transition-all
                        ${isSelected
                          ? 'shadow-neu-inset bg-coopnama-primary/5 border-2 border-coopnama-primary'
                          : 'shadow-neu hover:shadow-neu-sm'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-700">{service.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{service.category}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-coopnama-primary flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                  Atrás
                </Button>
                <Button onClick={handleStep3} isLoading={isLoading}>
                  Continuar
                </Button>
              </div>
            </>
          )}

          {/* Step 4: Stations */}
          {currentStep === 4 && (
            <>
              <Input
                type="number"
                label="Número de Estaciones/Ventanillas"
                hint="Entre 1 y 20 estaciones"
                min={1}
                max={20}
                value={data.stationCount}
                onChange={(e) => setData({ ...data, stationCount: parseInt(e.target.value) || 1 })}
              />

              <div className="bg-neu-bg shadow-neu-inset rounded-neu-sm p-4">
                <p className="text-sm text-gray-600">
                  Se crearán <span className="font-semibold text-coopnama-primary">{data.stationCount}</span> estaciones:
                </p>
                <ul className="mt-2 space-y-1">
                  {Array.from({ length: Math.min(data.stationCount, 5) }, (_, i) => (
                    <li key={i} className="text-sm text-gray-500">
                      Ventanilla {i + 1} (VEN-{(i + 1).toString().padStart(2, '0')})
                    </li>
                  ))}
                  {data.stationCount > 5 && (
                    <li className="text-sm text-gray-400 italic">
                      ... y {data.stationCount - 5} más
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                  Atrás
                </Button>
                <Button onClick={handleStep4} isLoading={isLoading}>
                  Continuar
                </Button>
              </div>
            </>
          )}

          {/* Step 5: Summary */}
          {currentStep === 5 && (
            <>
              <div className="space-y-4">
                <div className="bg-coopnama-primary/5 rounded-neu-sm p-6 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-coopnama-secondary mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                    Configuración Completa
                  </h3>
                  <p className="text-gray-600">
                    Su sistema está listo para comenzar a operar
                  </p>
                </div>

                <div className="bg-neu-bg shadow-neu-inset rounded-neu-sm p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Organización</p>
                    <p className="font-medium text-gray-700">{data.orgName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Sucursal</p>
                    <p className="font-medium text-gray-700">{data.branchName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Servicios</p>
                    <p className="font-medium text-gray-700">{data.selectedServices.length} configurados</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estaciones</p>
                    <p className="font-medium text-gray-700">{data.stationCount} activas</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onComplete} variant="success" size="lg">
                  Finalizar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

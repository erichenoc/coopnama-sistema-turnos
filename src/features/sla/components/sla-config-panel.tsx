'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Toggle,
  Select,
  Badge,
} from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { toast } from 'sonner'
import {
  getSLAConfigs,
  saveSLAConfig,
  deleteSLAConfig,
  type SLAConfig,
} from '@/features/sla/services/sla-service'

// ============================================
// TYPES
// ============================================

interface Props {
  organizationId: string
}

interface Service {
  id: string
  name: string
  code: string
}

interface FormData {
  id?: string
  service_id: string
  warning_at_minutes: number
  critical_at_minutes: number
  max_wait_minutes: number
  auto_escalate_priority: boolean
  escalate_after_minutes: number
  escalate_to_priority: number
  notify_supervisor: boolean
  is_active: boolean
}

const INITIAL_FORM_STATE: FormData = {
  service_id: '',
  warning_at_minutes: 15,
  critical_at_minutes: 30,
  max_wait_minutes: 45,
  auto_escalate_priority: false,
  escalate_after_minutes: 20,
  escalate_to_priority: 1,
  notify_supervisor: true,
  is_active: true,
}

// ============================================
// COMPONENT
// ============================================

export function SLAConfigPanel({ organizationId }: Props) {
  const [configs, setConfigs] = useState<SLAConfig[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_STATE)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Fetch configs and services
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [configsData, servicesData] = await Promise.all([
          getSLAConfigs(organizationId),
          fetchServices(),
        ])
        setConfigs(configsData)
        setServices(servicesData)
      } catch (error) {
        console.error('Error fetching SLA data:', error)
        toast.error('Error al cargar configuraciones de SLA')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [organizationId])

  async function fetchServices(): Promise<Service[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('services')
      .select('id, name, code')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching services:', error)
      return []
    }

    return data || []
  }

  // Validate thresholds
  function validateThresholds(): boolean {
    const { warning_at_minutes, critical_at_minutes, max_wait_minutes } = formData

    if (warning_at_minutes >= critical_at_minutes) {
      setValidationError('Advertencia debe ser menor que Crítico')
      return false
    }

    if (critical_at_minutes >= max_wait_minutes) {
      setValidationError('Crítico debe ser menor que Tiempo máximo')
      return false
    }

    setValidationError(null)
    return true
  }

  // Handle save
  async function handleSave() {
    if (!validateThresholds()) return

    try {
      const result = await saveSLAConfig({
        ...formData,
        organization_id: organizationId,
        service_id: formData.service_id || null,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(formData.id ? 'SLA actualizado' : 'SLA creado exitosamente')

      // Refresh configs
      const updatedConfigs = await getSLAConfigs(organizationId)
      setConfigs(updatedConfigs)

      // Reset form
      setShowForm(false)
      setFormData(INITIAL_FORM_STATE)
      setValidationError(null)
    } catch (error) {
      console.error('Error saving SLA config:', error)
      toast.error('Error al guardar configuración')
    }
  }

  // Handle edit
  function handleEdit(config: SLAConfig) {
    setFormData({
      id: config.id,
      service_id: config.service_id || '',
      warning_at_minutes: config.warning_at_minutes,
      critical_at_minutes: config.critical_at_minutes,
      max_wait_minutes: config.max_wait_minutes,
      auto_escalate_priority: config.auto_escalate_priority,
      escalate_after_minutes: config.escalate_after_minutes,
      escalate_to_priority: config.escalate_to_priority,
      notify_supervisor: config.notify_supervisor,
      is_active: config.is_active,
    })
    setShowForm(true)
  }

  // Handle delete
  async function handleDelete(id: string) {
    try {
      const result = await deleteSLAConfig(id)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('SLA eliminado')

      // Refresh configs
      const updatedConfigs = await getSLAConfigs(organizationId)
      setConfigs(updatedConfigs)

      setDeleteConfirmId(null)
    } catch (error) {
      console.error('Error deleting SLA config:', error)
      toast.error('Error al eliminar configuración')
    }
  }

  // Cancel form
  function handleCancel() {
    setShowForm(false)
    setFormData(INITIAL_FORM_STATE)
    setValidationError(null)
  }

  // Service options
  const serviceOptions: SelectOption[] = [
    { value: '', label: 'Todos los servicios' },
    ...services.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
  ]

  // Priority options
  const priorityOptions: SelectOption[] = [
    { value: '1', label: 'Preferencial' },
    { value: '2', label: 'VIP' },
    { value: '3', label: 'Urgente' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Cargando configuraciones...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Configuración de SLA
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Define tiempos de espera y alertas por servicio
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Agregar SLA</Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-neu-bg shadow-neu">
          <CardHeader>
            <CardTitle>
              {formData.id ? 'Editar SLA' : 'Nueva Configuración SLA'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Service selector */}
            <Select
              label="Servicio"
              options={serviceOptions}
              value={formData.service_id}
              onChange={(e) =>
                setFormData({ ...formData, service_id: e.target.value })
              }
            />

            {/* Thresholds */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                type="number"
                label="Alerta de advertencia (min)"
                value={formData.warning_at_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    warning_at_minutes: parseInt(e.target.value) || 0,
                  })
                }
                min={1}
              />
              <Input
                type="number"
                label="Alerta crítica (min)"
                value={formData.critical_at_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    critical_at_minutes: parseInt(e.target.value) || 0,
                  })
                }
                min={1}
              />
              <Input
                type="number"
                label="Tiempo máximo de espera (min)"
                value={formData.max_wait_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_wait_minutes: parseInt(e.target.value) || 0,
                  })
                }
                min={1}
              />
            </div>

            {validationError && (
              <p className="text-sm text-red-600">{validationError}</p>
            )}

            {/* Auto-escalate toggle */}
            <Toggle
              label="Escalado automático de prioridad"
              checked={formData.auto_escalate_priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  auto_escalate_priority: e.target.checked,
                })
              }
            />

            {/* Escalation settings */}
            {formData.auto_escalate_priority && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                <Input
                  type="number"
                  label="Escalar después de (min)"
                  value={formData.escalate_after_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      escalate_after_minutes: parseInt(e.target.value) || 0,
                    })
                  }
                  min={1}
                />
                <Select
                  label="Escalar a prioridad"
                  options={priorityOptions}
                  value={formData.escalate_to_priority.toString()}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      escalate_to_priority: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            )}

            {/* Other toggles */}
            <Toggle
              label="Notificar supervisor"
              checked={formData.notify_supervisor}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notify_supervisor: e.target.checked,
                })
              }
            />

            <Toggle
              label="Configuración activa"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
            />

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="secondary" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configs list */}
      {configs.length === 0 ? (
        <Card className="bg-neu-bg shadow-neu">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No hay configuraciones de SLA. Crea una para comenzar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {configs.map((config) => (
            <Card key={config.id} className="bg-neu-bg shadow-neu-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {config.service?.name || 'Todos los servicios'}
                    </h3>
                    {config.service && (
                      <p className="text-xs text-gray-500">
                        Código: {config.service.code}
                      </p>
                    )}
                  </div>
                  <Badge variant={config.is_active ? 'default' : 'outline'}>
                    {config.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-gray-500">Advertencia</p>
                      <p className="font-medium text-yellow-600">
                        {config.warning_at_minutes} min
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Crítico</p>
                      <p className="font-medium text-orange-600">
                        {config.critical_at_minutes} min
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Máximo</p>
                      <p className="font-medium text-red-600">
                        {config.max_wait_minutes} min
                      </p>
                    </div>
                  </div>

                  {config.auto_escalate_priority && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-gray-600">
                        Escala a prioridad{' '}
                        <span className="font-medium">
                          {config.escalate_to_priority === 1 && 'Preferencial'}
                          {config.escalate_to_priority === 2 && 'VIP'}
                          {config.escalate_to_priority === 3 && 'Urgente'}
                        </span>{' '}
                        después de {config.escalate_after_minutes} min
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(config)}
                  >
                    Editar
                  </Button>
                  {deleteConfirmId === config.id ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDelete(config.id)}
                        className="text-red-600 border-red-600"
                      >
                        Confirmar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDeleteConfirmId(config.id)}
                      className="text-red-600"
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/shared/components'
import { toast } from 'sonner'
import { getPriorityRules, savePriorityRule, deletePriorityRule } from '@/features/priority-rules/services/priority-service'

interface PriorityRule {
  id: string
  organization_id: string
  name: string
  description: string | null
  condition_type: 'age' | 'member_type' | 'disability' | 'pregnancy' | 'vip' | 'time_of_day' | 'service' | 'custom'
  condition_value: Record<string, unknown>
  priority_boost: number
  is_active: boolean
  sort_order: number
  created_at: string
}

interface Service {
  id: string
  name: string
}

interface Props {
  organizationId: string
}

const CONDITION_TYPE_LABELS: Record<string, string> = {
  age: 'Adulto mayor',
  member_type: 'Tipo de miembro',
  disability: 'Persona con discapacidad',
  pregnancy: 'Mujer embarazada',
  vip: 'Cliente VIP',
  time_of_day: 'Horario específico',
  service: 'Servicio específico',
  custom: 'Personalizado'
}

const CONDITION_TYPE_COLORS: Record<string, string> = {
  age: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  disability: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pregnancy: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  vip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  member_type: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  time_of_day: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  service: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  custom: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
}

const BOOST_BORDER_COLORS: Record<number, string> = {
  1: 'border-l-4 border-l-blue-500',
  2: 'border-l-4 border-l-purple-500',
  3: 'border-l-4 border-l-red-500'
}

const BOOST_LABELS: Record<number, string> = {
  1: '+1 Preferencial',
  2: '+2 VIP',
  3: '+3 Urgente'
}

export function PriorityRulesManager({ organizationId }: Props) {
  const [rules, setRules] = useState<PriorityRule[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<PriorityRule | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    condition_type: 'age' as PriorityRule['condition_type'],
    condition_value: {} as Record<string, unknown>,
    priority_boost: 1,
    is_active: true
  })

  useEffect(() => {
    loadData()
  }, [organizationId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [rulesData, servicesData] = await Promise.all([
        getPriorityRules(organizationId),
        fetchServices()
      ])
      setRules(rulesData.sort((a, b) => a.sort_order - b.sort_order))
      setServices(servicesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar las reglas')
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async (): Promise<Service[]> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('services')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching services:', error)
      return []
    }
    return data || []
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    try {
      const ruleData: Partial<PriorityRule> = {
        ...formData,
        organization_id: organizationId,
        sort_order: editingRule?.sort_order ?? rules.length
      }

      if (editingRule) {
        ruleData.id = editingRule.id
      }

      const result = await savePriorityRule(ruleData as Omit<PriorityRule, 'created_at'>)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(editingRule ? 'Regla actualizada' : 'Regla creada')
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error saving rule:', error)
      toast.error('Error al guardar la regla')
    }
  }

  const handleEdit = (rule: PriorityRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || '',
      condition_type: rule.condition_type,
      condition_value: rule.condition_value,
      priority_boost: rule.priority_boost,
      is_active: rule.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta regla?')) return

    try {
      const result = await deletePriorityRule(id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Regla eliminada')
      loadData()
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast.error('Error al eliminar la regla')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      condition_type: 'age',
      condition_value: {},
      priority_boost: 1,
      is_active: true
    })
    setEditingRule(null)
    setShowForm(false)
  }

  const updateConditionValue = (key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      condition_value: { ...prev.condition_value, [key]: value }
    }))
  }

  if (loading) {
    return <div className="text-center py-8">Cargando reglas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reglas de Prioridad</h2>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          Agregar Regla
        </Button>
      </div>

      {showForm && (
        <Card className="bg-neu-bg shadow-neu rounded-neu-sm">
          <CardHeader>
            <CardTitle>{editingRule ? 'Editar Regla' : 'Nueva Regla'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de la regla</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Prioridad adultos mayores"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción breve"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo de condición</label>
              <select
                className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-800"
                value={formData.condition_type}
                onChange={(e) => setFormData({ ...formData, condition_type: e.target.value as PriorityRule['condition_type'], condition_value: {} })}
              >
                {Object.entries(CONDITION_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {formData.condition_type === 'member_type' && (
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de miembro</label>
                <select
                  className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-800"
                  value={(formData.condition_value.member_type as string) || 'vip'}
                  onChange={(e) => updateConditionValue('member_type', e.target.value)}
                >
                  <option value="vip">VIP</option>
                  <option value="socio">Socio</option>
                  <option value="empleado">Empleado</option>
                </select>
              </div>
            )}

            {formData.condition_type === 'time_of_day' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Hora inicio</label>
                  <Input
                    type="time"
                    value={(formData.condition_value.start as string) || ''}
                    onChange={(e) => updateConditionValue('start', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hora fin</label>
                  <Input
                    type="time"
                    value={(formData.condition_value.end as string) || ''}
                    onChange={(e) => updateConditionValue('end', e.target.value)}
                  />
                </div>
              </div>
            )}

            {formData.condition_type === 'service' && (
              <div>
                <label className="block text-sm font-medium mb-1">Servicio</label>
                <select
                  className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-800"
                  value={(formData.condition_value.service_id as string) || ''}
                  onChange={(e) => updateConditionValue('service_id', e.target.value)}
                >
                  <option value="">Seleccionar servicio</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Nivel de prioridad</label>
              <select
                className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-800"
                value={formData.priority_boost}
                onChange={(e) => setFormData({ ...formData, priority_boost: parseInt(e.target.value) })}
              >
                <option value={1}>{BOOST_LABELS[1]}</option>
                <option value={2}>{BOOST_LABELS[2]}</option>
                <option value={3}>{BOOST_LABELS[3]}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium">Activa</label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>Guardar</Button>
              <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {rules.map(rule => (
          <Card key={rule.id} className={`bg-neu-bg shadow-neu-sm rounded-neu-sm ${BOOST_BORDER_COLORS[rule.priority_boost]}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{rule.name}</h3>
                    <Badge className={`${CONDITION_TYPE_COLORS[rule.condition_type]} text-xs`}>
                      {CONDITION_TYPE_LABELS[rule.condition_type]}
                    </Badge>
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold">
                      +{rule.priority_boost}
                    </Badge>
                    {rule.is_active && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">
                        Activa
                      </Badge>
                    )}
                  </div>
                  {rule.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{rule.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleEdit(rule)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(rule.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay reglas configuradas. Agrega una nueva regla para comenzar.
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button,
  Input, Modal, ModalHeader, ModalBody, ModalFooter, Badge, Spinner,
  Select, Textarea,
} from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { useOrg } from '@/shared/providers/org-provider'

type ServiceCategory = 'creditos' | 'ahorros' | 'servicios' | 'general'

interface Service {
  id: string
  organization_id: string
  name: string
  code: string
  description: string | null
  icon: string | null
  color: string
  category: ServiceCategory
  avg_duration_minutes: number
  requires_appointment: boolean
  requires_member_id: boolean
  sort_order: number
  is_active: boolean
}

interface ServiceFormData {
  name: string
  code: string
  description: string
  category: ServiceCategory
  avg_duration_minutes: number
  color: string
  sort_order: number
}

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'creditos', label: 'Créditos' },
  { value: 'ahorros', label: 'Ahorros' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'general', label: 'General' },
]

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  creditos: 'bg-blue-500',
  ahorros: 'bg-green-500',
  servicios: 'bg-amber-500',
  general: 'bg-gray-500',
}

const CATEGORY_TEXT_COLORS: Record<ServiceCategory, string> = {
  creditos: 'text-blue-600',
  ahorros: 'text-green-600',
  servicios: 'text-amber-600',
  general: 'text-gray-600',
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
]

export default function ServicesPage() {
  const { organizationId } = useOrg()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    code: '',
    description: '',
    category: 'general',
    avg_duration_minutes: 15,
    color: DEFAULT_COLORS[0],
    sort_order: 0,
  })
  const [saving, setSaving] = useState(false)

  const fetchServices = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (data) setServices(data as Service[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        code: service.code,
        description: service.description || '',
        category: service.category,
        avg_duration_minutes: service.avg_duration_minutes,
        color: service.color,
        sort_order: service.sort_order,
      })
    } else {
      setEditingService(null)
      setFormData({
        name: '',
        code: '',
        description: '',
        category: 'general',
        avg_duration_minutes: 15,
        color: DEFAULT_COLORS[0],
        sort_order: services.length,
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingService(null)
    setSaving(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const payload = {
      ...formData,
      organization_id: organizationId,
      code: formData.code.toUpperCase().slice(0, 1),
      requires_appointment: false,
      requires_member_id: false,
      is_active: true,
    }

    if (editingService) {
      await supabase.from('services').update(payload).eq('id', editingService.id)
    } else {
      await supabase.from('services').insert([payload])
    }

    await fetchServices()
    closeModal()
  }

  const handleDelete = async (service: Service) => {
    if (!confirm(`¿Eliminar el servicio "${service.name}"?`)) return

    const supabase = createClient()
    await supabase.from('services').update({ is_active: false }).eq('id', service.id)
    await fetchServices()
  }

  const filteredServices = services.filter((service) => {
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Gestión de Servicios"
        description="Configura los servicios disponibles para turnos"
        actions={
          <Button variant="primary" onClick={() => openModal()}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Servicio
          </Button>
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar servicios..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-neu-sm transition-all ${categoryFilter === 'all' ? 'shadow-neu-inset text-coopnama-primary' : 'shadow-neu'}`}
          >
            Todos
          </button>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value as ServiceCategory)}
              className={`px-4 py-2 rounded-neu-sm transition-all ${categoryFilter === cat.value ? 'shadow-neu-inset text-coopnama-primary' : 'shadow-neu'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <Card key={service.id} hoverable>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-neu flex items-center justify-center text-white font-bold text-xl shadow-neu"
                    style={{ backgroundColor: service.color }}
                  >
                    {service.code}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <Badge variant="outline" size="sm" className={`mt-1 ${CATEGORY_TEXT_COLORS[service.category]}`}>
                      {CATEGORY_OPTIONS.find((c) => c.value === service.category)?.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {service.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {service.avg_duration_minutes} min
                </div>
                <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[service.category]}`} title={service.category} />
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => openModal(service)} className="flex-1">
                  Editar
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(service)}>
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} size="lg">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <h2 className="text-xl font-semibold text-gray-800">
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Nombre del Servicio"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Código (1 letra)"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 1) })}
                maxLength={1}
                required
              />
              <Textarea
                label="Descripción"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
              <Select
                label="Categoría"
                options={CATEGORY_OPTIONS}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
              />
              <Input
                label="Duración Promedio (minutos)"
                type="number"
                value={formData.avg_duration_minutes}
                onChange={(e) => setFormData({ ...formData, avg_duration_minutes: parseInt(e.target.value) || 0 })}
                required
                min={1}
              />
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-full shadow-neu transition-all ${formData.color === color ? 'ring-4 ring-coopnama-primary' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Input
                label="Orden de Visualización"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {editingService ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}

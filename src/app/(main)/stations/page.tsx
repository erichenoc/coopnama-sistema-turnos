'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button,
  Input, Modal, ModalHeader, ModalBody, ModalFooter, Badge, Spinner,
  Select,
} from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { useOrg } from '@/shared/providers/org-provider'

type StationType = 'general' | 'priority' | 'specialized'

interface Station {
  id: string
  branch_id: string
  name: string
  station_number: number
  station_type: StationType
  display_name: string | null
  is_active: boolean
}

interface StationFormData {
  name: string
  station_number: number
  station_type: StationType
  display_name: string
}

const STATION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'general', label: 'General' },
  { value: 'priority', label: 'Prioritaria' },
  { value: 'specialized', label: 'Especializada' },
]

const STATION_TYPE_COLORS: Record<StationType, string> = {
  general: 'text-emerald-400 bg-emerald-100',
  priority: 'text-amber-400 bg-amber-100',
  specialized: 'text-purple-400 bg-purple-100',
}

export default function StationsPage() {
  const { branchId } = useOrg()
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [typeFilter, setTypeFilter] = useState<StationType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState<StationFormData>({
    name: '',
    station_number: 1,
    station_type: 'general',
    display_name: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchStations = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('stations')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('station_number', { ascending: true })

    if (data) setStations(data as Station[])
    setLoading(false)
  }, [branchId])

  useEffect(() => {
    fetchStations()
  }, [fetchStations])

  const openModal = (station?: Station) => {
    if (station) {
      setEditingStation(station)
      setFormData({
        name: station.name,
        station_number: station.station_number,
        station_type: station.station_type,
        display_name: station.display_name || '',
      })
    } else {
      setEditingStation(null)
      const nextNumber = stations.length > 0
        ? Math.max(...stations.map(s => s.station_number)) + 1
        : 1
      setFormData({
        name: '',
        station_number: nextNumber,
        station_type: 'general',
        display_name: '',
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingStation(null)
    setSaving(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const payload = {
      ...formData,
      branch_id: branchId,
      display_name: formData.display_name || null,
      is_active: true,
    }

    if (editingStation) {
      await supabase.from('stations').update(payload).eq('id', editingStation.id)
    } else {
      await supabase.from('stations').insert([payload])
    }

    await fetchStations()
    closeModal()
  }

  const handleDelete = async (station: Station) => {
    if (!confirm(`¿Eliminar la ventanilla "${station.name}"?`)) return

    const supabase = createClient()
    await supabase.from('stations').update({ is_active: false }).eq('id', station.id)
    await fetchStations()
  }

  const filteredStations = stations.filter((station) => {
    const matchesType = typeFilter === 'all' || station.station_type === typeFilter
    const matchesSearch = station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.station_number.toString().includes(searchQuery)
    return matchesType && matchesSearch
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
        title="Gestión de Ventanillas"
        description="Configura las ventanillas de atención"
        actions={
          <Button variant="primary" onClick={() => openModal()}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nueva Ventanilla
          </Button>
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar ventanillas..."
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
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 rounded-neu-sm transition-all ${typeFilter === 'all' ? 'shadow-neu-inset text-emerald-400' : 'shadow-neu text-gray-300'}`}
          >
            Todas
          </button>
          {STATION_TYPE_OPTIONS.map((type) => (
            <button
              key={type.value}
              onClick={() => setTypeFilter(type.value as StationType)}
              className={`px-4 py-2 rounded-neu-sm transition-all ${typeFilter === type.value ? 'shadow-neu-inset text-emerald-400' : 'shadow-neu text-gray-300'}`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStations.map((station) => (
          <Card key={station.id} hoverable>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-neu flex items-center justify-center bg-white/[0.06] shadow-neu">
                    <span className="text-3xl font-bold text-emerald-400">
                      {station.station_number}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{station.name}</CardTitle>
                    <Badge
                      variant="outline"
                      size="sm"
                      className={`mt-1 ${STATION_TYPE_COLORS[station.station_type]}`}
                    >
                      {STATION_TYPE_OPTIONS.find((t) => t.value === station.station_type)?.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {station.display_name && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Nombre en Pantalla</p>
                  <p className="text-sm text-gray-700 font-medium">{station.display_name}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activa
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => openModal(station)} className="flex-1">
                  Editar
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(station)}>
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStations.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventanillas</h3>
          <p className="mt-1 text-sm text-gray-500">Comienza creando una nueva ventanilla.</p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} size="lg">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <h2 className="text-xl font-semibold text-gray-800">
              {editingStation ? 'Editar Ventanilla' : 'Nueva Ventanilla'}
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Nombre de la Ventanilla"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Ventanilla Principal"
                required
              />
              <Input
                label="Número de Ventanilla"
                type="number"
                value={formData.station_number}
                onChange={(e) => setFormData({ ...formData, station_number: parseInt(e.target.value) || 1 })}
                required
                min={1}
              />
              <Select
                label="Tipo de Ventanilla"
                options={STATION_TYPE_OPTIONS}
                value={formData.station_type}
                onChange={(e) => setFormData({ ...formData, station_type: e.target.value as StationType })}
              />
              <Input
                label="Nombre en Pantalla (Opcional)"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Ej: Ventanilla 1"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {editingStation ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}

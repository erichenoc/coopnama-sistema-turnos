'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Modal, ModalHeader, ModalBody, ModalFooter,
  Badge,
} from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { useOrg } from '@/shared/providers/org-provider'

interface Branch {
  id: string
  organization_id: string
  name: string
  code: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  opening_time: string
  closing_time: string
  working_days: number[]
  max_capacity_per_hour: number
  is_active: boolean
  created_at: string
}

const WEEKDAY_LABELS = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D']
const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']

export default function BranchesPage() {
  const { organizationId } = useOrg()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    opening_time: '08:00',
    closing_time: '17:00',
    max_capacity_per_hour: 10,
    working_days: [1, 2, 3, 4, 5] as number[],
  })
  const [saving, setSaving] = useState(false)

  const fetchBranches = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })

    if (!error && data) {
      setBranches(data as Branch[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch)
      setFormData({
        name: branch.name,
        code: branch.code,
        address: branch.address || '',
        city: branch.city || '',
        phone: branch.phone || '',
        email: branch.email || '',
        opening_time: branch.opening_time,
        closing_time: branch.closing_time,
        max_capacity_per_hour: branch.max_capacity_per_hour,
        working_days: branch.working_days,
      })
    } else {
      setEditingBranch(null)
      setFormData({
        name: '',
        code: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        opening_time: '08:00',
        closing_time: '17:00',
        max_capacity_per_hour: 10,
        working_days: [1, 2, 3, 4, 5],
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingBranch(null)
  }

  const toggleWorkingDay = (day: number) => {
    setFormData((prev) => {
      const days = prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day].sort((a, b) => a - b)
      return { ...prev, working_days: days }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const payload = {
      organization_id: organizationId,
      name: formData.name,
      code: formData.code,
      address: formData.address || null,
      city: formData.city || null,
      phone: formData.phone || null,
      email: formData.email || null,
      opening_time: formData.opening_time,
      closing_time: formData.closing_time,
      max_capacity_per_hour: formData.max_capacity_per_hour,
      working_days: formData.working_days,
    }

    if (editingBranch) {
      await supabase
        .from('branches')
        .update(payload)
        .eq('id', editingBranch.id)
    } else {
      await supabase
        .from('branches')
        .insert(payload)
    }

    setSaving(false)
    handleCloseModal()
    fetchBranches()
  }

  const handleDeactivate = async (branchId: string) => {
    const supabase = createClient()
    await supabase
      .from('branches')
      .update({ is_active: false })
      .eq('id', branchId)
    fetchBranches()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sucursales</h1>
          <p className="text-gray-500 mt-1">Administra las sucursales de tu organizacion</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nueva Sucursal
        </Button>
      </div>

      {branches.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-400">No hay sucursales creadas</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{branch.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Codigo: {branch.code}</p>
                  </div>
                  <Badge variant={branch.is_active ? 'default' : 'outline'}>
                    {branch.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-700">{branch.address || 'Sin direccion'}</p>
                      <p className="text-xs text-gray-500">{branch.city || 'Sin ciudad'}</p>
                    </div>
                  </div>

                  {branch.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <p className="text-sm text-gray-700">{branch.phone}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-700">
                      {branch.opening_time} - {branch.closing_time}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">Dias laborales:</p>
                    <div className="flex gap-1">
                      {WEEKDAY_LABELS.map((label, index) => {
                        const dayNumber = index + 1
                        const isActive = branch.working_days.includes(dayNumber)
                        return (
                          <span
                            key={index}
                            className={`
                              w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium
                              ${isActive
                                ? 'bg-coopnama-primary text-white'
                                : 'bg-gray-200 text-gray-400'
                              }
                            `}
                          >
                            {label}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200/50">
                    <p className="text-sm text-gray-600">
                      Capacidad: <span className="font-semibold">{branch.max_capacity_per_hour}</span> turnos/hora
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(branch)}>
                      Editar
                    </Button>
                    {branch.is_active && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeactivate(branch.id)}>
                        Desactivar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="lg">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <h2 className="text-xl font-semibold text-gray-800">
              {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Codigo"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Direccion"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Ciudad"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <Input
                  label="Telefono"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Hora apertura"
                  type="time"
                  value={formData.opening_time}
                  onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                  required
                />
                <Input
                  label="Hora cierre"
                  type="time"
                  value={formData.closing_time}
                  onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Capacidad maxima por hora"
                type="number"
                min="1"
                value={formData.max_capacity_per_hour}
                onChange={(e) => setFormData({ ...formData, max_capacity_per_hour: parseInt(e.target.value) || 1 })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dias laborales
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAY_NAMES.map((name, index) => {
                    const dayNumber = index + 1
                    const isActive = formData.working_days.includes(dayNumber)
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => toggleWorkingDay(dayNumber)}
                        className={`
                          px-2 py-3 rounded-neu-sm text-sm font-medium transition-all
                          ${isActive
                            ? 'bg-coopnama-primary text-white shadow-neu-sm'
                            : 'bg-neu-bg text-gray-600 shadow-neu-inset'
                          }
                        `}
                      >
                        {WEEKDAY_LABELS[index]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={handleCloseModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : editingBranch ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}

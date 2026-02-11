'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button,
  Input, Modal, ModalHeader, ModalBody, ModalFooter, Badge, Spinner,
  Select, Toggle,
} from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { useOrg } from '@/shared/providers/org-provider'

interface Holiday {
  id: string
  organization_id: string
  branch_id: string | null
  holiday_date: string
  name: string
  is_recurring: boolean
}

interface Branch {
  id: string
  name: string
  code: string
}

interface HolidayFormData {
  name: string
  holiday_date: string
  is_recurring: boolean
  branch_id: string | null
}

interface GroupedHolidays {
  [year: string]: {
    [month: string]: Holiday[]
  }
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function HolidaysPage() {
  const { organizationId, branches: contextBranches } = useOrg()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [formData, setFormData] = useState<HolidayFormData>({
    name: '',
    holiday_date: '',
    is_recurring: false,
    branch_id: null,
  })
  const [saving, setSaving] = useState(false)

  const fetchHolidays = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('holidays')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('holiday_date', `${selectedYear}-01-01`)
      .lte('holiday_date', `${selectedYear}-12-31`)
      .order('holiday_date', { ascending: true })

    if (data) setHolidays(data as Holiday[])
    setLoading(false)
  }, [organizationId, selectedYear])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  const openModal = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday)
      setFormData({
        name: holiday.name,
        holiday_date: holiday.holiday_date,
        is_recurring: holiday.is_recurring,
        branch_id: holiday.branch_id,
      })
    } else {
      setEditingHoliday(null)
      setFormData({
        name: '',
        holiday_date: '',
        is_recurring: false,
        branch_id: null,
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingHoliday(null)
    setSaving(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const payload = {
      ...formData,
      organization_id: organizationId,
      branch_id: formData.branch_id || null,
    }

    if (editingHoliday) {
      await supabase.from('holidays').update(payload).eq('id', editingHoliday.id)
    } else {
      await supabase.from('holidays').insert([payload])
    }

    await fetchHolidays()
    closeModal()
  }

  const handleDelete = async (holiday: Holiday) => {
    if (!confirm(`¿Eliminar el feriado "${holiday.name}"?`)) return

    const supabase = createClient()
    await supabase.from('holidays').delete().eq('id', holiday.id)
    await fetchHolidays()
  }

  // Group holidays by year and month
  const groupedHolidays: GroupedHolidays = holidays.reduce((acc, holiday) => {
    const date = new Date(holiday.holiday_date)
    const year = date.getFullYear().toString()
    const month = date.getMonth().toString()

    if (!acc[year]) acc[year] = {}
    if (!acc[year][month]) acc[year][month] = []
    acc[year][month].push(holiday)

    return acc
  }, {} as GroupedHolidays)

  // Generate year options (current year ± 5 years)
  const yearOptions: SelectOption[] = Array.from({ length: 11 }, (_, i) => {
    const year = new Date().getFullYear() - 5 + i
    return { value: year.toString(), label: year.toString() }
  })

  // Generate branch options
  const branchOptions: SelectOption[] = [
    { value: '', label: 'Toda la organización' },
    ...contextBranches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))
  ]

  const getBranchName = (branchId: string | null): string => {
    if (!branchId) return 'Toda la org'
    const branch = contextBranches.find((b) => b.id === branchId)
    return branch ? branch.name : 'Sucursal desconocida'
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
      <PageHeader
        title="Gestión de Feriados"
        description="Configura los días feriados para la organización"
        actions={
          <Button variant="primary" onClick={() => openModal()}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Feriado
          </Button>
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-48">
          <Select
            label="Año"
            options={yearOptions}
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          />
        </div>
        <div className="text-sm text-gray-300 sm:ml-4">
          Total: <span className="font-semibold">{holidays.length}</span> feriados
        </div>
      </div>

      {holidays.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">No hay feriados configurados para {selectedYear}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedHolidays[selectedYear.toString()] || {}).map(([monthIndex, monthHolidays]) => {
            const monthNumber = parseInt(monthIndex)
            return (
              <Card key={monthIndex}>
                <CardHeader>
                  <CardTitle className="text-lg">{MONTH_NAMES[monthNumber]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {monthHolidays.map((holiday) => {
                      const date = new Date(holiday.holiday_date)
                      const dayNumber = date.getDate()
                      return (
                        <div
                          key={holiday.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-lg bg-white/[0.06] border border-white/[0.08] flex flex-col items-center justify-center">
                              <span className="text-2xl font-bold text-gray-200">{dayNumber}</span>
                              <span className="text-xs text-gray-400 uppercase">{MONTH_NAMES[monthNumber].slice(0, 3)}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{holiday.name}</h3>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" size="sm">
                                  {getBranchName(holiday.branch_id)}
                                </Badge>
                                {holiday.is_recurring && (
                                  <Badge variant="default" size="sm" className="bg-purple-500/10 text-purple-300 border-purple-500/20">
                                    Recurrente
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openModal(holiday)}>
                              Editar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(holiday)}>
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} size="md">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <h2 className="text-xl font-semibold text-white">
              {editingHoliday ? 'Editar Feriado' : 'Nuevo Feriado'}
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Nombre del Feriado"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Día de la Independencia"
                required
              />
              <Input
                label="Fecha"
                type="date"
                value={formData.holiday_date}
                onChange={(e) => setFormData({ ...formData, holiday_date: e.target.value })}
                required
              />
              <Select
                label="Ámbito"
                options={branchOptions}
                value={formData.branch_id || ''}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value || null })}
              />
              <Toggle
                label="Feriado Recurrente"
                description="Se repetirá cada año en la misma fecha"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {editingHoliday ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button,
  Input, Modal, ModalHeader, ModalBody, ModalFooter, Badge, Spinner,
} from '@/shared/components'
import { useOrg } from '@/shared/providers/org-provider'

type AppointmentStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'

interface Service {
  id: string
  name: string
  code: string
  color: string
}

interface Appointment {
  id: string
  organization_id: string
  branch_id: string
  service_id: string
  member_id: string | null
  customer_name: string
  customer_phone: string | null
  customer_cedula: string | null
  customer_email: string | null
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  notes: string | null
  status: AppointmentStatus
  confirmation_code: string
  cancelled_at: string | null
  cancellation_reason: string | null
  is_recurring: boolean
  recurrence_pattern: string | null
  parent_appointment_id: string | null
  created_at: string
  updated_at: string
  service: Service
}

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  checked_in: 'Check-in',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No Asistió',
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-300',
  confirmed: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  checked_in: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  completed: 'bg-green-100 text-green-700 border border-green-300',
  cancelled: 'bg-red-100 text-red-700 border border-red-300',
  no_show: 'bg-white/[0.06] text-gray-300 border border-gray-300',
}

const STATUS_OPTIONS: AppointmentStatus[] = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show']

export default function AppointmentsPage() {
  const { organizationId, branchId } = useOrg()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAppointments = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('appointments')
      .select('*, service:services(id, name, code, color)')
      .eq('organization_id', organizationId)
      .eq('branch_id', branchId)
      .gte('appointment_date', dateFilter)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (data) setAppointments(data as Appointment[])
    setLoading(false)
  }, [organizationId, branchId, dateFilter])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const handleCheckIn = async (appointment: Appointment) => {
    if (!confirm(`¿Marcar check-in para ${appointment.customer_name}?`)) return

    setActionLoading(true)
    const supabase = createClient()
    await supabase
      .from('appointments')
      .update({ status: 'checked_in', updated_at: new Date().toISOString() })
      .eq('id', appointment.id)

    await fetchAppointments()
    setActionLoading(false)
  }

  const handleNoShow = async (appointment: Appointment) => {
    if (!confirm(`¿Marcar como "No Asistió" a ${appointment.customer_name}?`)) return

    setActionLoading(true)
    const supabase = createClient()
    await supabase
      .from('appointments')
      .update({ status: 'no_show', updated_at: new Date().toISOString() })
      .eq('id', appointment.id)

    await fetchAppointments()
    setActionLoading(false)
  }

  const openCancelModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setCancellationReason('')
    setIsCancelModalOpen(true)
  }

  const closeCancelModal = () => {
    setIsCancelModalOpen(false)
    setSelectedAppointment(null)
    setCancellationReason('')
    setActionLoading(false)
  }

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppointment) return

    setActionLoading(true)
    const supabase = createClient()
    await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellationReason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedAppointment.id)

    await fetchAppointments()
    closeCancelModal()
  }

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter
    const matchesSearch =
      appointment.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.confirmation_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (appointment.customer_cedula && appointment.customer_cedula.includes(searchQuery))
    return matchesStatus && matchesSearch
  })

  const isPastAppointment = (appointment: Appointment) => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    return appointmentDateTime < new Date()
  }

  const canCheckIn = (appointment: Appointment) => {
    return appointment.status === 'confirmed' && !isPastAppointment(appointment)
  }

  const canMarkNoShow = (appointment: Appointment) => {
    return appointment.status === 'confirmed' && isPastAppointment(appointment)
  }

  const canCancel = (appointment: Appointment) => {
    return appointment.status === 'pending' || appointment.status === 'confirmed'
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
        title="Gestión de Citas"
        description="Administra las citas programadas"
      />

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Buscar por nombre, código o cédula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          <Input
            type="date"
            label="Fecha desde"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="sm:w-48"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-neu-sm transition-all text-sm ${
              statusFilter === 'all' ? 'bg-white/[0.08] border border-coopnama-primary/30 text-coopnama-primary font-semibold' : 'bg-white/[0.06] border border-white/[0.08]'
            }`}
          >
            Todas
          </button>
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-neu-sm transition-all text-sm ${
                statusFilter === status ? 'bg-white/[0.08] border border-coopnama-primary/30 text-coopnama-primary font-semibold' : 'bg-white/[0.06] border border-white/[0.08]'
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Citas Programadas ({filteredAppointments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">No hay citas programadas</p>
              <p className="text-sm mt-1">Ajusta los filtros para ver más resultados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-200">Fecha y Hora</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-200">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-200">Servicio</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-200">Código</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-200">Estado</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-200">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="border-b border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div className="font-medium text-white">
                            {new Date(appointment.appointment_date).toLocaleDateString('es-DO', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-gray-300">
                            {appointment.appointment_time} ({appointment.duration_minutes} min)
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div className="font-medium text-white">{appointment.customer_name}</div>
                          {appointment.customer_phone && (
                            <div className="text-gray-300">{appointment.customer_phone}</div>
                          )}
                          {appointment.customer_cedula && (
                            <div className="text-xs text-gray-400">Cédula: {appointment.customer_cedula}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-neu flex items-center justify-center text-white font-bold text-xs bg-white/[0.06] border border-white/[0.08]"
                            style={{ backgroundColor: appointment.service.color }}
                          >
                            {appointment.service.code}
                          </div>
                          <span className="text-sm text-white">{appointment.service.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-white/[0.06] px-2 py-1 rounded font-mono">
                          {appointment.confirmation_code}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Badge size="sm" className={STATUS_STYLES[appointment.status]}>
                            {STATUS_LABELS[appointment.status]}
                          </Badge>
                          {(appointment.is_recurring || appointment.parent_appointment_id) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-600 border border-emerald-200" title={appointment.recurrence_pattern ? RECURRENCE_LABELS[appointment.recurrence_pattern] : 'Recurrente'}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              {appointment.recurrence_pattern ? RECURRENCE_LABELS[appointment.recurrence_pattern] : 'Rec.'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {canCheckIn(appointment) && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleCheckIn(appointment)}
                              disabled={actionLoading}
                            >
                              Check-in
                            </Button>
                          )}
                          {canMarkNoShow(appointment) && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleNoShow(appointment)}
                              disabled={actionLoading}
                            >
                              No Asistió
                            </Button>
                          )}
                          {canCancel(appointment) && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => openCancelModal(appointment)}
                              disabled={actionLoading}
                            >
                              Cancelar
                            </Button>
                          )}
                          {!canCheckIn(appointment) && !canMarkNoShow(appointment) && !canCancel(appointment) && (
                            <span className="text-xs text-gray-400">Sin acciones</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isCancelModalOpen} onClose={closeCancelModal} size="md">
        <form onSubmit={handleCancel}>
          <ModalHeader>
            <h2 className="text-xl font-semibold text-white">
              Cancelar Cita
            </h2>
          </ModalHeader>
          <ModalBody>
            {selectedAppointment && (
              <div className="space-y-4">
                <div className="bg-white/[0.04] p-4 rounded-neu-sm">
                  <p className="text-sm text-gray-300 mb-1">Cliente</p>
                  <p className="font-semibold text-white">{selectedAppointment.customer_name}</p>
                  <p className="text-sm text-gray-300 mt-2 mb-1">Fecha y Hora</p>
                  <p className="font-medium text-white">
                    {new Date(selectedAppointment.appointment_date).toLocaleDateString('es-DO')} a las{' '}
                    {selectedAppointment.appointment_time}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Razón de cancelación (opcional)
                  </label>
                  <textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-neu-sm bg-white/[0.06] border border-white/[0.08]-inset bg-neu-bg border-none focus:outline-none focus:ring-2 focus:ring-coopnama-primary/20 transition-all"
                    rows={3}
                    placeholder="Ej: Cliente solicitó reprogramar, emergencia personal, etc."
                  />
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={closeCancelModal} disabled={actionLoading}>
              Volver
            </Button>
            <Button type="submit" variant="danger" isLoading={actionLoading}>
              Confirmar Cancelación
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}

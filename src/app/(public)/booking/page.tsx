'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, MapPin, User, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'

const LOGO_URL = 'https://res.cloudinary.com/dbftvu8ab/image/upload/v1770567396/COOPNAMA-ISOLOGO-scaled-e1759506874509-1024x1018_aoobai.png'

type Step = 'branch' | 'service' | 'date' | 'time' | 'info' | 'confirm' | 'done'

interface Branch {
  id: string
  name: string
  address: string
}

interface Service {
  id: string
  name: string
  description: string | null
  avg_duration_minutes: number
}

interface Slot {
  id: string
  start_time: string
  end_time: string
  is_available: boolean
  booked_count: number
  max_appointments: number
}

interface BookingData {
  branchId: string
  branchName: string
  serviceId: string
  serviceName: string
  date: string
  slotId: string
  time: string
  duration: number
  customerName: string
  customerPhone: string
  customerCedula: string
  customerEmail: string
  notes: string
}

interface Appointment {
  confirmation_code: string
  appointment_date: string
  appointment_time: string
}

export default function BookingPage() {
  const [step, setStep] = useState<Step>('branch')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [branches, setBranches] = useState<Branch[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<Slot[]>([])

  const [bookingData, setBookingData] = useState<Partial<BookingData>>({})
  const [appointment, setAppointment] = useState<Appointment | null>(null)

  const supabase = createClient()

  // Load branches on mount
  useEffect(() => {
    loadBranches()
  }, [])

  // Load services when branch selected
  useEffect(() => {
    if (bookingData.branchId) {
      loadServices(bookingData.branchId)
    }
  }, [bookingData.branchId])

  // Load slots when date selected
  useEffect(() => {
    if (bookingData.branchId && bookingData.serviceId && bookingData.date) {
      loadSlots(bookingData.branchId, bookingData.serviceId, bookingData.date)
    }
  }, [bookingData.branchId, bookingData.serviceId, bookingData.date])

  async function loadBranches() {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('branches')
        .select('id, name, address')
        .eq('is_active', true)
        .order('name')

      if (err) throw err
      setBranches(data || [])
    } catch (err: any) {
      setError(err.message || 'Error cargando sucursales')
    } finally {
      setLoading(false)
    }
  }

  async function loadServices(branchId: string) {
    setLoading(true)
    setError('')
    try {
      // Get org_id from branch
      const { data: branchData, error: branchErr } = await supabase
        .from('branches')
        .select('organization_id')
        .eq('id', branchId)
        .single()

      if (branchErr) throw branchErr

      const { data, error: err } = await supabase
        .from('services')
        .select('id, name, description, avg_duration_minutes')
        .eq('organization_id', branchData.organization_id)
        .eq('is_active', true)
        .order('sort_order')

      if (err) throw err
      setServices(data || [])
    } catch (err: any) {
      setError(err.message || 'Error cargando servicios')
    } finally {
      setLoading(false)
    }
  }

  async function loadSlots(branchId: string, serviceId: string, date: string) {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/appointments/slots?branchId=${branchId}&serviceId=${serviceId}&date=${date}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error cargando horarios')
      }

      const data = await response.json()
      setSlots(data.slots || [])
    } catch (err: any) {
      setError(err.message || 'Error cargando horarios disponibles')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      // Get org_id from branch
      const { data: branchData, error: branchErr } = await supabase
        .from('branches')
        .select('organization_id')
        .eq('id', bookingData.branchId)
        .single()

      if (branchErr) throw branchErr

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: branchData.organization_id,
          branch_id: bookingData.branchId,
          service_id: bookingData.serviceId,
          slot_id: bookingData.slotId,
          customer_name: bookingData.customerName,
          customer_phone: bookingData.customerPhone || null,
          customer_cedula: bookingData.customerCedula || null,
          customer_email: bookingData.customerEmail || null,
          appointment_date: bookingData.date,
          appointment_time: bookingData.time,
          duration_minutes: bookingData.duration,
          notes: bookingData.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error creando cita')
      }

      const data = await response.json()
      setAppointment(data.appointment)
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Error al confirmar cita')
    } finally {
      setLoading(false)
    }
  }

  const steps: { id: Step; label: string }[] = [
    { id: 'branch', label: 'Sucursal' },
    { id: 'service', label: 'Servicio' },
    { id: 'date', label: 'Fecha' },
    { id: 'time', label: 'Hora' },
    { id: 'info', label: 'Información' },
    { id: 'confirm', label: 'Confirmar' },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === step)

  // Get tomorrow's date as minimum
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-coopnama-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <Image src={LOGO_URL} alt="COOPNAMA" width={56} height={56} className="rounded-lg object-contain" priority />
          <div>
            <h1 className="text-3xl font-bold">COOPNAMA</h1>
            <p className="text-blue-100 mt-1">Sistema de Turnos en Linea</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Indicator */}
        {step !== 'done' && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((s, index) => (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        index <= currentStepIndex
                          ? 'bg-coopnama-primary text-white shadow-lg'
                          : 'bg-white text-gray-400 shadow'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${index <= currentStepIndex ? 'text-coopnama-primary' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-1 flex-1 mx-2 rounded ${index < currentStepIndex ? 'bg-coopnama-primary' : 'bg-gray-300'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Branch Selection */}
          {step === 'branch' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <MapPin className="mr-2 text-coopnama-primary" />
                Seleccione una Sucursal
              </h2>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coopnama-primary"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {branches.map(branch => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setBookingData({ branchId: branch.id, branchName: branch.name })
                        setStep('service')
                      }}
                      className="text-left p-6 rounded-xl border-2 border-gray-200 hover:border-coopnama-primary hover:bg-blue-50 transition-all"
                    >
                      <h3 className="font-semibold text-lg text-gray-900">{branch.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{branch.address}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Service Selection */}
          {step === 'service' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Seleccione un Servicio</h2>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coopnama-primary"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {services.map(service => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setBookingData(prev => ({
                          ...prev,
                          serviceId: service.id,
                          serviceName: service.name,
                          duration: service.avg_duration_minutes,
                        }))
                        setStep('date')
                      }}
                      className="text-left p-6 rounded-xl border-2 border-gray-200 hover:border-coopnama-primary hover:bg-blue-50 transition-all"
                    >
                      <h3 className="font-semibold text-lg text-gray-900">{service.name}</h3>
                      {service.description && (
                        <p className="text-gray-600 text-sm mt-1">{service.description}</p>
                      )}
                      <p className="text-coopnama-primary text-sm mt-2 font-medium">
                        Duración estimada: {service.avg_duration_minutes} min
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setStep('branch')}
                className="mt-6 flex items-center text-gray-600 hover:text-coopnama-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver
              </button>
            </div>
          )}

          {/* Date Selection */}
          {step === 'date' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Calendar className="mr-2 text-coopnama-primary" />
                Seleccione una Fecha
              </h2>
              <input
                type="date"
                min={minDate}
                value={bookingData.date || ''}
                onChange={(e) => {
                  setBookingData(prev => ({ ...prev, date: e.target.value }))
                }}
                className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-coopnama-primary focus:outline-none"
              />
              {bookingData.date && (
                <button
                  onClick={() => setStep('time')}
                  className="mt-6 w-full bg-coopnama-primary text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Continuar <ArrowRight className="inline w-5 h-5 ml-2" />
                </button>
              )}
              <button
                onClick={() => setStep('service')}
                className="mt-4 flex items-center text-gray-600 hover:text-coopnama-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver
              </button>
            </div>
          )}

          {/* Time Selection */}
          {step === 'time' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Clock className="mr-2 text-coopnama-primary" />
                Seleccione una Hora
              </h2>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coopnama-primary"></div>
                </div>
              ) : slots.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay horarios disponibles para esta fecha</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {slots.filter(slot => slot.is_available).map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => {
                        setBookingData(prev => ({
                          ...prev,
                          slotId: slot.id,
                          time: slot.start_time,
                        }))
                        setStep('info')
                      }}
                      className="p-4 rounded-xl border-2 border-gray-200 hover:border-coopnama-primary hover:bg-blue-50 transition-all font-medium"
                    >
                      {slot.start_time.slice(0, 5)}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setStep('date')}
                className="mt-6 flex items-center text-gray-600 hover:text-coopnama-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver
              </button>
            </div>
          )}

          {/* Customer Info */}
          {step === 'info' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <User className="mr-2 text-coopnama-primary" />
                Información del Cliente
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingData.customerName || ''}
                    onChange={(e) => setBookingData(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-coopnama-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={bookingData.customerPhone || ''}
                    onChange={(e) => setBookingData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-coopnama-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                  <input
                    type="text"
                    value={bookingData.customerCedula || ''}
                    onChange={(e) => setBookingData(prev => ({ ...prev, customerCedula: e.target.value }))}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-coopnama-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={bookingData.customerEmail || ''}
                    onChange={(e) => setBookingData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-coopnama-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                  <textarea
                    rows={3}
                    value={bookingData.notes || ''}
                    onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-coopnama-primary focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => setStep('confirm')}
                disabled={!bookingData.customerName}
                className="mt-6 w-full bg-coopnama-primary text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continuar <ArrowRight className="inline w-5 h-5 ml-2" />
              </button>
              <button
                onClick={() => setStep('time')}
                className="mt-4 flex items-center text-gray-600 hover:text-coopnama-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver
              </button>
            </div>
          )}

          {/* Confirmation */}
          {step === 'confirm' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirme su Cita</h2>
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Sucursal</p>
                  <p className="font-semibold text-gray-900">{bookingData.branchName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Servicio</p>
                  <p className="font-semibold text-gray-900">{bookingData.serviceName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha y Hora</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(bookingData.date + 'T00:00:00').toLocaleDateString('es-DO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })} a las {bookingData.time?.slice(0, 5)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-semibold text-gray-900">{bookingData.customerName}</p>
                </div>
              </div>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="mt-6 w-full bg-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Confirmar Cita
                  </>
                )}
              </button>
              <button
                onClick={() => setStep('info')}
                disabled={loading}
                className="mt-4 flex items-center text-gray-600 hover:text-coopnama-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver
              </button>
            </div>
          )}

          {/* Success */}
          {step === 'done' && appointment && (
            <div className="text-center py-8">
              <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Cita Confirmada!</h2>
              <div className="bg-blue-50 border-2 border-coopnama-primary rounded-xl p-8 mb-6">
                <p className="text-sm text-gray-600 mb-2">Código de Confirmación</p>
                <p className="text-4xl font-mono font-bold text-coopnama-primary">{appointment.confirmation_code}</p>
              </div>
              <div className="text-left bg-gray-50 rounded-xl p-6 space-y-2 mb-6">
                <p className="text-gray-700">
                  <span className="font-semibold">Fecha:</span>{' '}
                  {new Date(appointment.appointment_date).toLocaleDateString('es-DO')}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Hora:</span> {appointment.appointment_time.slice(0, 5)}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Sucursal:</span> {bookingData.branchName}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Servicio:</span> {bookingData.serviceName}
                </p>
              </div>
              <p className="text-gray-600 mb-6">
                Por favor, presente este código al llegar a la sucursal.
              </p>
              <Link
                href="/"
                className="inline-block bg-coopnama-primary text-white py-3 px-8 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Volver al Inicio
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

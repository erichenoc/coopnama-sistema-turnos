'use client'

import { useState } from 'react'
import { cn } from '@/shared/utils/cn'

type Step = 'welcome' | 'cedula' | 'service' | 'priority' | 'confirm' | 'success'

interface Service {
  id: string
  name: string
  icon: string
  description: string
  prefix: string
  waitTime: number
}

const services: Service[] = [
  {
    id: 'loans',
    name: 'Préstamos',
    icon: '💰',
    description: 'Solicitud, consulta y pago de préstamos',
    prefix: 'A',
    waitTime: 15,
  },
  {
    id: 'cashier',
    name: 'Caja',
    icon: '💳',
    description: 'Depósitos, retiros y pagos',
    prefix: 'B',
    waitTime: 8,
  },
  {
    id: 'savings',
    name: 'Ahorros',
    icon: '🏦',
    description: 'Apertura y gestión de cuentas de ahorro',
    prefix: 'C',
    waitTime: 12,
  },
  {
    id: 'general',
    name: 'Atención General',
    icon: '📋',
    description: 'Consultas y otros servicios',
    prefix: 'D',
    waitTime: 10,
  },
]

interface Priority {
  id: string
  name: string
  description: string
  icon: string
}

const priorities: Priority[] = [
  {
    id: 'normal',
    name: 'Normal',
    description: 'Atención en orden de llegada',
    icon: '👤',
  },
  {
    id: 'preferential',
    name: 'Preferencial',
    description: 'Adultos mayores, embarazadas, personas con discapacidad',
    icon: '⭐',
  },
]

export function KioskDisplay() {
  const [step, setStep] = useState<Step>('welcome')
  const [cedula, setCedula] = useState('')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCedulaInput = (digit: string) => {
    if (cedula.length < 11) {
      setCedula((prev) => prev + digit)
    }
  }

  const handleCedulaDelete = () => {
    setCedula((prev) => prev.slice(0, -1))
  }

  const handleCedulaClear = () => {
    setCedula('')
  }

  const formatCedula = (value: string) => {
    if (value.length <= 3) return value
    if (value.length <= 10) return `${value.slice(0, 3)}-${value.slice(3)}`
    return `${value.slice(0, 3)}-${value.slice(3, 10)}-${value.slice(10)}`
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const randomNum = Math.floor(Math.random() * 100) + 1
    setTicketNumber(`${selectedService?.prefix}-${String(randomNum).padStart(3, '0')}`)
    setIsProcessing(false)
    setStep('success')
  }

  const handleReset = () => {
    setStep('welcome')
    setCedula('')
    setSelectedService(null)
    setSelectedPriority(null)
    setTicketNumber(null)
  }

  return (
    <div className="min-h-screen bg-neu-bg flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-coopnama-primary rounded-neu-sm shadow-neu-sm flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">COOPNAMA</h1>
            <p className="text-gray-500">Sistema de Turnos</p>
          </div>
        </div>
        {step !== 'welcome' && step !== 'success' && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        {/* Welcome Screen */}
        {step === 'welcome' && (
          <div className="text-center max-w-2xl animate-fade-in">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto bg-coopnama-primary/10 rounded-full flex items-center justify-center mb-6">
                <svg className="w-16 h-16 text-coopnama-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                ¡Bienvenido a COOPNAMA!
              </h2>
              <p className="text-xl text-gray-600">
                Toque el botón para obtener su turno
              </p>
            </div>
            <button
              onClick={() => setStep('cedula')}
              className={`
                kiosk-button
                w-full max-w-md
                px-12 py-8
                bg-coopnama-primary
                text-white
                text-2xl font-bold
                rounded-neu-lg
                shadow-neu-lg
                hover:bg-blue-700
                active:shadow-neu-inset
                transition-all duration-200
              `}
            >
              Obtener Turno
            </button>
          </div>
        )}

        {/* Cedula Input */}
        {step === 'cedula' && (
          <div className="w-full max-w-lg animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">
              Ingrese su Cédula
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Escriba su número de identificación
            </p>

            {/* Cedula Display */}
            <div className="mb-6">
              <input
                type="text"
                value={formatCedula(cedula)}
                readOnly
                className="kiosk-input w-full bg-neu-bg shadow-neu-inset rounded-neu p-6"
                placeholder="___-_______-_"
              />
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleCedulaInput(String(num))}
                  className={`
                    kiosk-button
                    bg-neu-bg
                    shadow-neu
                    rounded-neu
                    text-3xl font-bold text-gray-700
                    hover:shadow-neu-sm
                    active:shadow-neu-inset
                    transition-all duration-150
                  `}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleCedulaClear}
                className={`
                  kiosk-button
                  bg-coopnama-danger/10
                  shadow-neu
                  rounded-neu
                  text-xl font-bold text-coopnama-danger
                  hover:shadow-neu-sm
                  active:shadow-neu-inset
                  transition-all duration-150
                `}
              >
                Borrar
              </button>
              <button
                onClick={() => handleCedulaInput('0')}
                className={`
                  kiosk-button
                  bg-neu-bg
                  shadow-neu
                  rounded-neu
                  text-3xl font-bold text-gray-700
                  hover:shadow-neu-sm
                  active:shadow-neu-inset
                  transition-all duration-150
                `}
              >
                0
              </button>
              <button
                onClick={handleCedulaDelete}
                className={`
                  kiosk-button
                  bg-coopnama-accent/10
                  shadow-neu
                  rounded-neu
                  text-xl font-bold text-coopnama-accent
                  hover:shadow-neu-sm
                  active:shadow-neu-inset
                  transition-all duration-150
                `}
              >
                ←
              </button>
            </div>

            <button
              onClick={() => setStep('service')}
              disabled={cedula.length !== 11}
              className={cn(
                'w-full kiosk-button rounded-neu transition-all duration-200',
                cedula.length === 11
                  ? 'bg-coopnama-primary text-white shadow-neu hover:bg-blue-700 active:shadow-neu-inset'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              Continuar
            </button>

            <button
              onClick={() => setStep('service')}
              className="w-full mt-4 py-4 text-coopnama-primary hover:underline"
            >
              Continuar sin cédula (visitante)
            </button>
          </div>
        )}

        {/* Service Selection */}
        {step === 'service' && (
          <div className="w-full max-w-3xl animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">
              Seleccione el Servicio
            </h2>
            <p className="text-gray-500 text-center mb-8">
              ¿Qué desea realizar hoy?
            </p>

            <div className="grid grid-cols-2 gap-6">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service)
                    setStep('priority')
                  }}
                  className={`
                    p-8
                    bg-neu-bg
                    shadow-neu
                    rounded-neu-lg
                    text-left
                    hover:shadow-neu-md
                    active:shadow-neu-inset
                    transition-all duration-200
                    group
                  `}
                >
                  <span className="text-5xl mb-4 block">{service.icon}</span>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-coopnama-primary transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-gray-500 mb-4">{service.description}</p>
                  <p className="text-sm text-coopnama-secondary">
                    ⏱ Tiempo estimado: ~{service.waitTime} min
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Priority Selection */}
        {step === 'priority' && (
          <div className="w-full max-w-2xl animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">
              Tipo de Atención
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Seleccione su tipo de atención
            </p>

            <div className="space-y-4">
              {priorities.map((priority) => (
                <button
                  key={priority.id}
                  onClick={() => {
                    setSelectedPriority(priority)
                    setStep('confirm')
                  }}
                  className={`
                    w-full p-8
                    bg-neu-bg
                    shadow-neu
                    rounded-neu-lg
                    flex items-center gap-6
                    hover:shadow-neu-md
                    active:shadow-neu-inset
                    transition-all duration-200
                    group
                  `}
                >
                  <span className="text-5xl">{priority.icon}</span>
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-gray-800 group-hover:text-coopnama-primary transition-colors">
                      {priority.name}
                    </h3>
                    <p className="text-gray-500">{priority.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('service')}
              className="w-full mt-6 py-4 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Volver
            </button>
          </div>
        )}

        {/* Confirmation */}
        {step === 'confirm' && (
          <div className="w-full max-w-lg animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">
              Confirme su Turno
            </h2>

            <div className="bg-neu-bg shadow-neu-lg rounded-neu-lg p-8 mb-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-500">Cédula</span>
                  <span className="font-mono font-bold text-gray-800">
                    {cedula ? formatCedula(cedula) : 'Visitante'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-500">Servicio</span>
                  <span className="font-bold text-gray-800">
                    {selectedService?.icon} {selectedService?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-500">Tipo de Atención</span>
                  <span className="font-bold text-gray-800">
                    {selectedPriority?.icon} {selectedPriority?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-500">Tiempo Estimado</span>
                  <span className="font-bold text-coopnama-secondary">
                    ~{selectedService?.waitTime} minutos
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className={cn(
                  'w-full kiosk-button rounded-neu transition-all duration-200',
                  'bg-coopnama-primary text-white shadow-neu',
                  isProcessing
                    ? 'opacity-75 cursor-wait'
                    : 'hover:bg-blue-700 active:shadow-neu-inset'
                )}
              >
                {isProcessing ? 'Procesando...' : 'Confirmar y Obtener Turno'}
              </button>

              <button
                onClick={() => setStep('priority')}
                disabled={isProcessing}
                className="w-full py-4 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
              >
                ← Volver
              </button>
            </div>
          </div>
        )}

        {/* Success - Ticket Generated */}
        {step === 'success' && ticketNumber && (
          <div className="text-center max-w-lg animate-scale-in">
            <div className="bg-neu-bg shadow-neu-xl rounded-neu-lg p-10 mb-8">
              <div className="w-20 h-20 mx-auto bg-coopnama-secondary rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <p className="text-xl text-gray-600 mb-4">Su número de turno es</p>

              <div className="ticket-number text-7xl text-coopnama-primary mb-6">
                {ticketNumber}
              </div>

              <div className="p-4 bg-coopnama-accent/10 rounded-neu-sm mb-6">
                <p className="text-lg text-gray-700">
                  Servicio: <strong>{selectedService?.name}</strong>
                </p>
                <p className="text-lg text-gray-700">
                  Tiempo estimado: <strong>~{selectedService?.waitTime} min</strong>
                </p>
              </div>

              <p className="text-gray-500">
                Por favor, espere a ser llamado.
                <br />
                Su turno será anunciado en la pantalla.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => window.print()}
                className={`
                  flex-1 kiosk-button
                  bg-neu-bg
                  shadow-neu
                  rounded-neu
                  text-gray-700 font-bold
                  hover:shadow-neu-sm
                  active:shadow-neu-inset
                  transition-all duration-200
                `}
              >
                🖨️ Imprimir Ticket
              </button>
              <button
                onClick={handleReset}
                className={`
                  flex-1 kiosk-button
                  bg-coopnama-primary
                  text-white
                  rounded-neu
                  shadow-neu
                  hover:bg-blue-700
                  active:shadow-neu-inset
                  transition-all duration-200
                `}
              >
                Nuevo Turno
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} COOPNAMA - Cooperativa Nacional de Maestros</p>
      </footer>
    </div>
  )
}

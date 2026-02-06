'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/shared/utils/cn'

interface CalledTicket {
  number: string
  station: string
  service: string
  calledAt: Date
  isNew: boolean
}

// Mock data for demonstration
const mockCurrentTicket: CalledTicket = {
  number: 'A-045',
  station: 'Ventanilla 1',
  service: 'Préstamos',
  calledAt: new Date(),
  isNew: true,
}

const mockRecentTickets: CalledTicket[] = [
  { number: 'B-012', station: 'Ventanilla 2', service: 'Caja', calledAt: new Date(Date.now() - 60000), isNew: false },
  { number: 'C-008', station: 'Ventanilla 3', service: 'Ahorros', calledAt: new Date(Date.now() - 120000), isNew: false },
  { number: 'A-044', station: 'Ventanilla 1', service: 'Préstamos', calledAt: new Date(Date.now() - 180000), isNew: false },
  { number: 'B-011', station: 'Ventanilla 4', service: 'Atención General', calledAt: new Date(Date.now() - 240000), isNew: false },
]

const mockUpcoming = [
  { number: 'A-046', service: 'Préstamos', priority: 'normal' },
  { number: 'B-013', service: 'Caja', priority: 'preferential' },
  { number: 'C-009', service: 'Ahorros', priority: 'vip' },
  { number: 'A-047', service: 'Préstamos', priority: 'normal' },
  { number: 'B-014', service: 'Caja', priority: 'normal' },
]

export function TVDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentTicket, setCurrentTicket] = useState<CalledTicket | null>(mockCurrentTicket)
  const [recentTickets] = useState<CalledTicket[]>(mockRecentTickets)
  const [isAnimating, setIsAnimating] = useState(false)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Animation effect when new ticket is called
  useEffect(() => {
    if (currentTicket?.isNew) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [currentTicket])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-DO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-DO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="tv-display min-h-screen p-6 lg:p-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-coopnama-primary rounded-neu shadow-neu-md flex items-center justify-center">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">COOPNAMA</h1>
            <p className="text-lg text-gray-500">Sistema de Turnos - Santo Domingo Este</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold text-coopnama-primary">
            {formatTime(currentTime)}
          </p>
          <p className="text-lg text-gray-500 capitalize">{formatDate(currentTime)}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main - Now Serving */}
        <div className="lg:col-span-2">
          <div
            className={cn(
              'bg-neu-bg shadow-neu-lg rounded-neu-lg p-8 lg:p-12 text-center',
              isAnimating && 'animate-[ticketCall_0.5s_ease-out]'
            )}
          >
            <p className="text-2xl text-gray-500 mb-4">AHORA ATENDIENDO</p>

            {currentTicket ? (
              <>
                <div
                  className={cn(
                    'now-serving-number text-coopnama-primary',
                    isAnimating && 'animate-pulse'
                  )}
                >
                  {currentTicket.number}
                </div>

                <div className="mt-6 flex items-center justify-center gap-4">
                  <div
                    className={cn(
                      'px-6 py-3 bg-coopnama-accent text-white rounded-neu shadow-neu-sm',
                      'text-2xl font-bold',
                      isAnimating && 'animate-bounce'
                    )}
                  >
                    {currentTicket.station}
                  </div>
                </div>

                <p className="mt-4 text-xl text-gray-600">{currentTicket.service}</p>
              </>
            ) : (
              <div className="py-12">
                <p className="text-4xl text-gray-400">Sin turnos en espera</p>
              </div>
            )}
          </div>

          {/* Audio announcement indicator */}
          {isAnimating && (
            <div className="mt-4 flex items-center justify-center gap-3 text-coopnama-primary">
              <svg className="w-8 h-8 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              <span className="text-2xl font-medium">Turno {currentTicket?.number}, pase a {currentTicket?.station}</span>
            </div>
          )}
        </div>

        {/* Sidebar - Recent & Upcoming */}
        <div className="space-y-6">
          {/* Recent Tickets */}
          <div className="bg-neu-bg shadow-neu rounded-neu-lg p-6">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-coopnama-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Turnos Recientes
            </h2>
            <div className="space-y-3">
              {recentTickets.map((ticket, index) => (
                <div
                  key={ticket.number}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-neu-sm',
                    index === 0 ? 'bg-coopnama-secondary/10 shadow-neu-sm' : 'bg-gray-50'
                  )}
                >
                  <div>
                    <span className="font-mono font-bold text-lg text-gray-800">
                      {ticket.number}
                    </span>
                    <span className="ml-2 text-gray-500">{ticket.service}</span>
                  </div>
                  <span className="text-coopnama-secondary font-medium">
                    {ticket.station}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Tickets */}
          <div className="bg-neu-bg shadow-neu rounded-neu-lg p-6">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-status-waiting" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Próximos en Cola
            </h2>
            <div className="space-y-2">
              {mockUpcoming.map((ticket, index) => (
                <div
                  key={ticket.number}
                  className="flex items-center justify-between p-3 rounded-neu-sm bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-status-waiting text-white text-xs font-bold rounded-full">
                      {index + 1}
                    </span>
                    <span className="font-mono font-medium text-gray-700">
                      {ticket.number}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{ticket.service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer with services info */}
      <footer className="mt-8 grid grid-cols-4 gap-4">
        {[
          { label: 'Préstamos', icon: 'A', color: 'bg-status-waiting', count: 12 },
          { label: 'Caja', icon: 'B', color: 'bg-status-called', count: 8 },
          { label: 'Ahorros', icon: 'C', color: 'bg-status-serving', count: 5 },
          { label: 'Atención General', icon: 'D', color: 'bg-gray-400', count: 3 },
        ].map((service) => (
          <div
            key={service.label}
            className="bg-neu-bg shadow-neu-sm rounded-neu-sm p-4 flex items-center gap-3"
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold',
                service.color
              )}
            >
              {service.icon}
            </div>
            <div>
              <p className="font-medium text-gray-700">{service.label}</p>
              <p className="text-sm text-gray-500">{service.count} en espera</p>
            </div>
          </div>
        ))}
      </footer>
    </div>
  )
}

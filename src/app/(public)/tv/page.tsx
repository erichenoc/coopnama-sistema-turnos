'use client'

import { useEffect, useState, useRef } from 'react'
import { useRealtimeQueue } from '@/shared/hooks/use-realtime-queue'

const DEMO_BRANCH_ID = '00000000-0000-0000-0000-000000000001'

export default function TVDisplayPage() {
  const { called, serving, waiting } = useRealtimeQueue(DEMO_BRANCH_ID)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastCalledId, setLastCalledId] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const latestCalled = [...called, ...serving].sort(
      (a, b) => new Date(b.called_at || 0).getTime() - new Date(a.called_at || 0).getTime()
    )[0]

    if (latestCalled && latestCalled.id !== lastCalledId) {
      setLastCalledId(latestCalled.id)
      setIsNew(true)

      if ('speechSynthesis' in window) {
        const stationName = latestCalled.station?.name || `Ventanilla ${latestCalled.station?.station_number}`
        const utterance = new SpeechSynthesisUtterance(
          `Turno ${latestCalled.ticket_number}, ${stationName}`
        )
        utterance.lang = 'es-DO'
        utterance.rate = 0.9
        speechSynthesis.speak(utterance)
      }

      setTimeout(() => setIsNew(false), 5000)
    }
  }, [called, serving, lastCalledId])

  const currentlyServing = [...called, ...serving].sort(
    (a, b) => new Date(b.called_at || 0).getTime() - new Date(a.called_at || 0).getTime()
  )

  const latestTicket = currentlyServing[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white overflow-hidden">
      <audio ref={audioRef} />

      <header className="flex items-center justify-between px-8 py-4 bg-black/30">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-coopnama-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">COOPNAMA</h1>
            <p className="text-blue-300 text-sm">Sistema de Turnos</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-bold">
            {currentTime.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-blue-300 text-sm">
            {currentTime.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      <div className="flex h-[calc(100vh-88px)]">
        <div className="flex-1 flex items-center justify-center p-8">
          {latestTicket ? (
            <div className={`text-center ${isNew ? 'animate-ticket-call' : ''}`}>
              <p className="text-blue-300 text-xl mb-2 uppercase tracking-wider">Turno Actual</p>
              <div className={`
                inline-block px-16 py-8 rounded-3xl mb-6
                ${isNew ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.3)]' : 'bg-white/10 border border-white/20'}
                transition-all duration-500
              `}>
                <span className="font-mono font-black text-8xl lg:text-9xl tracking-wider">
                  {latestTicket.ticket_number}
                </span>
              </div>
              <p className="text-3xl font-semibold text-blue-200 mb-2">
                {latestTicket.station?.name || `Ventanilla ${latestTicket.station?.station_number}`}
              </p>
              <p className="text-xl text-blue-300/70">{latestTicket.service?.name}</p>
              {latestTicket.customer_name && (
                <p className="text-lg text-blue-300/50 mt-2">{latestTicket.customer_name}</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-8xl block mb-6 opacity-30">&#128522;</p>
              <p className="text-3xl text-blue-300/50">No hay turnos activos</p>
            </div>
          )}
        </div>

        <div className="w-96 bg-black/20 border-l border-white/10 flex flex-col">
          {currentlyServing.length > 1 && (
            <div className="p-6 border-b border-white/10">
              <h3 className="text-blue-300 font-semibold mb-4 uppercase tracking-wider text-sm">Recientes</h3>
              <div className="space-y-3">
                {currentlyServing.slice(1, 5).map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <span className="font-mono font-bold text-xl">{ticket.ticket_number}</span>
                    <div className="text-right">
                      <p className="text-sm text-blue-200">{ticket.station?.name}</p>
                      <p className="text-xs text-blue-300/50">{ticket.service?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 p-6 overflow-hidden">
            <h3 className="text-blue-300 font-semibold mb-4 uppercase tracking-wider text-sm">
              En Espera ({waiting.length})
            </h3>
            <div className="space-y-2 overflow-y-auto max-h-full">
              {waiting.slice(0, 15).map((ticket, i) => (
                <div key={ticket.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="text-sm text-blue-300/40 w-5">{i + 1}</span>
                  <span className="font-mono font-bold text-blue-100">{ticket.ticket_number}</span>
                  <span className="text-sm text-blue-300/60 flex-1 truncate">{ticket.service?.name}</span>
                  {ticket.priority > 0 && (
                    <span className={`w-2 h-2 rounded-full ${
                      ticket.priority === 3 ? 'bg-red-400' :
                      ticket.priority === 2 ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                  )}
                </div>
              ))}
              {waiting.length > 15 && (
                <p className="text-center text-blue-300/40 text-sm pt-2">+{waiting.length - 15} mas</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

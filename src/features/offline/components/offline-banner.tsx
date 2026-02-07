'use client'

import { useOnlineStatus } from '../hooks/use-online-status'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 px-4 text-sm font-medium z-50 shadow-lg">
      <div className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01" />
        </svg>
        Sin conexion - Los cambios se sincronizaran al reconectar
      </div>
    </div>
  )
}

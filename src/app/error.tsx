'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Global Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white/[0.06] shadow-neu rounded-neu-lg p-8 max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-coopnama-danger/10 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-coopnama-danger"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h2 className="text-2xl font-semibold text-white mb-2">
          Algo salió mal
        </h2>
        <p className="text-gray-300 mb-6">
          {error.message || 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente.'}
        </p>

        {/* Action Button */}
        <button
          onClick={reset}
          className="bg-white/[0.06] shadow-neu hover:shadow-neu-inset active:shadow-neu-inset-md rounded-neu px-6 py-3 font-semibold text-[#009e59] transition-all duration-150"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}

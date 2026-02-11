'use client'

import { useState } from 'react'
import { Input } from '@/shared/components'

interface RecurrenceSelectorProps {
  isRecurring: boolean
  pattern: string | null
  endDate: string | null
  onChange: (data: { is_recurring: boolean; recurrence_pattern: string | null; recurrence_end_date: string | null }) => void
}

const PATTERNS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
]

export function RecurrenceSelector({ isRecurring, pattern, endDate, onChange }: RecurrenceSelectorProps) {
  const handleToggle = () => {
    if (isRecurring) {
      onChange({ is_recurring: false, recurrence_pattern: null, recurrence_end_date: null })
    } else {
      onChange({ is_recurring: true, recurrence_pattern: 'weekly', recurrence_end_date: null })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isRecurring ? 'bg-gradient-to-r from-[#009e59] to-[#00c96f]' : 'bg-white/[0.10]'
          }`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            isRecurring ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
        <label className="text-sm font-medium text-gray-200">Cita recurrente</label>
      </div>

      {isRecurring && (
        <div className="pl-14 space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Frecuencia</label>
            <div className="flex gap-2">
              {PATTERNS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onChange({ is_recurring: true, recurrence_pattern: p.value, recurrence_end_date: endDate })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    pattern === p.value
                      ? 'bg-gradient-to-r from-[#009e59] to-[#00c96f] text-white'
                      : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.08]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Repetir hasta (opcional)</label>
            <Input
              type="date"
              value={endDate || ''}
              onChange={(e) => onChange({ is_recurring: true, recurrence_pattern: pattern, recurrence_end_date: e.target.value || null })}
              min={new Date().toISOString().split('T')[0]}
              className="w-48"
            />
          </div>
        </div>
      )}
    </div>
  )
}

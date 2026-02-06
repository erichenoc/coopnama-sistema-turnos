'use client'

import { Input } from '@/shared/components'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1e40af"
          className="flex-1 font-mono"
        />
        <div
          className="w-12 h-12 rounded-lg border border-gray-200"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  )
}

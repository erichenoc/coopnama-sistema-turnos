'use client'

import { useState, useRef, useEffect } from 'react'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config'

interface LanguageSwitcherProps {
  currentLocale: Locale
  onChange: (locale: Locale) => void
}

export function LanguageSwitcher({ currentLocale, onChange }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="text-base">{getFlagEmoji(localeFlags[currentLocale])}</span>
        <span>{localeNames[currentLocale]}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => {
                onChange(locale)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                locale === currentLocale ? 'bg-gray-50 font-medium' : ''
              } ${locale === locales[0] ? 'rounded-t-lg' : ''} ${locale === locales[locales.length - 1] ? 'rounded-b-lg' : ''}`}
            >
              <span className="text-base">{getFlagEmoji(localeFlags[locale])}</span>
              <span>{localeNames[locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

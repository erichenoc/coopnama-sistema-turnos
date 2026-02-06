'use client'

import { useState, useCallback } from 'react'
import { defaultLocale, type Locale } from '@/i18n/config'

const LOCALE_STORAGE_KEY = 'coopnama_locale'

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale
  return (localStorage.getItem(LOCALE_STORAGE_KEY) as Locale) || defaultLocale
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    // Reload to apply new translations via next-intl
    window.location.reload()
  }, [])

  return { locale, setLocale }
}

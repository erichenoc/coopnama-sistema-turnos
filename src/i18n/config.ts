export const locales = ['es', 'en', 'ht'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'es'

export const localeNames: Record<Locale, string> = {
  es: 'Espanol',
  en: 'English',
  ht: 'Kreyol',
}

export const localeFlags: Record<Locale, string> = {
  es: 'DO',
  en: 'US',
  ht: 'HT',
}

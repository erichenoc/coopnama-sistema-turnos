import { getRequestConfig } from 'next-intl/server'
import { defaultLocale, type Locale } from './config'

export default getRequestConfig(async () => {
  // For now, use cookie-based locale detection
  // In the future, could add URL-based locale routing
  const locale: Locale = defaultLocale

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})

import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from '@/shared/providers/providers'
import { OfflineBanner } from '@/features/offline/components/offline-banner'
import './globals.css'

// Fonts
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

// Metadata
export const metadata: Metadata = {
  title: {
    default: 'COOPNAMA Turnos',
    template: '%s | COOPNAMA Turnos',
  },
  description: 'Sistema inteligente de gestión de turnos para COOPNAMA - Cooperativa Nacional de Servicios Múltiples de los Maestros',
  keywords: ['turnos', 'cola', 'queue', 'coopnama', 'cooperativa', 'maestros', 'dominicana'],
  authors: [{ name: 'HENOC Marketing AI Automation' }],
  creator: 'HENOC Marketing',
  applicationName: 'COOPNAMA Turnos AI',
  generator: 'Next.js',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://res.cloudinary.com/dbftvu8ab/image/upload/v1770398227/coopnama_logo_iqzzj2.png',
    apple: 'https://res.cloudinary.com/dbftvu8ab/image/upload/v1770398227/coopnama_logo_iqzzj2.png',
  },
  openGraph: {
    images: ['https://res.cloudinary.com/dbftvu8ab/image/upload/v1770398227/coopnama_logo_iqzzj2.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#e6e7ee',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="es-DO"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-neu-bg text-gray-700 min-h-screen">
        <Providers>
          {children}
        </Providers>
        <OfflineBanner />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}

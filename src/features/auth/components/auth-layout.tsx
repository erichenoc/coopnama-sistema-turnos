'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/shared/utils/cn'
import { LOGO_URL } from '@/shared/components/coopnama-logo'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  showLogo?: boolean
  className?: string
}

export function AuthLayout({
  children,
  title,
  subtitle,
  showLogo = true,
  className,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-neu-bg flex flex-col">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-coopnama-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-coopnama-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="p-4 lg:p-6">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image src={LOGO_URL} alt="COOPNAMA" width={40} height={40} className="rounded-lg object-contain" priority />
          <span className="font-bold text-gray-800">COOPNAMA</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div
          className={cn(
            'w-full max-w-md',
            'bg-neu-bg shadow-neu-lg rounded-neu-lg',
            'p-6 lg:p-8',
            className
          )}
        >
          {/* Logo */}
          {showLogo && (
            <div className="flex justify-center mb-6">
              <Image src={LOGO_URL} alt="COOPNAMA" width={64} height={64} className="rounded-xl object-contain" priority />
            </div>
          )}

          {/* Title & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-gray-500">{subtitle}</p>
            )}
          </div>

          {/* Form Content */}
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 lg:p-6 text-center">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} COOPNAMA. Todos los derechos reservados.
        </p>
        <div className="mt-2 flex justify-center gap-4 text-sm">
          <Link href="/privacy" className="text-gray-500 hover:text-coopnama-primary">
            Privacidad
          </Link>
          <Link href="/terms" className="text-gray-500 hover:text-coopnama-primary">
            Términos
          </Link>
          <Link href="/help" className="text-gray-500 hover:text-coopnama-primary">
            Ayuda
          </Link>
        </div>
      </footer>
    </div>
  )
}

// Forgot Password Form
interface ForgotPasswordFormProps {
  onSubmit?: (email: string) => Promise<void>
}

export function ForgotPasswordForm({ onSubmit }: ForgotPasswordFormProps) {
  return (
    <AuthLayout
      title="Recuperar Contraseña"
      subtitle="Te enviaremos un enlace para restablecer tu contraseña"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          await onSubmit?.(formData.get('email') as string)
        }}
        className="space-y-6"
      >
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Correo Electrónico
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="correo@ejemplo.com"
            className={`
              w-full
              bg-neu-bg
              shadow-neu-inset
              rounded-neu-sm
              px-4 py-3
              text-gray-700
              placeholder:text-gray-400
              focus:outline-none
              focus:shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff,0_0_0_3px_rgba(30,64,175,0.2)]
              transition-shadow duration-150
            `}
          />
        </div>

        <button
          type="submit"
          className={`
            w-full
            px-6 py-3
            bg-coopnama-primary
            text-white
            font-semibold
            rounded-neu-sm
            shadow-neu-sm
            hover:bg-blue-700
            active:shadow-neu-inset
            transition-all duration-150
          `}
        >
          Enviar Enlace
        </button>

        <p className="text-center text-gray-600">
          <Link href="/auth/login" className="text-coopnama-primary font-medium hover:underline">
            ← Volver al inicio de sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

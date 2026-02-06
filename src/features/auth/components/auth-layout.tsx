'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/shared/utils/cn'

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
          <div className="w-10 h-10 bg-coopnama-primary rounded-neu-sm shadow-neu-sm flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
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
              <div className="w-16 h-16 bg-coopnama-primary rounded-neu shadow-neu flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
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

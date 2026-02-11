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
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#009e59]/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="p-4 lg:p-6">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image src={LOGO_URL} alt="COOPNAMA" width={48} height={48} className="rounded-lg object-contain" priority />
          <span className="font-bold text-white">COOPNAMA</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div
          className={cn(
            'w-full max-w-md',
            'bg-white/[0.06] backdrop-blur-xl border border-white/[0.10] border-t-[#009e59]/20 shadow-glass-lg rounded-neu-lg',
            'p-6 lg:p-8',
            className
          )}
        >
          {/* Logo */}
          {showLogo && (
            <div className="flex justify-center mb-6">
              <Image src={LOGO_URL} alt="COOPNAMA" width={80} height={80} className="rounded-xl object-contain" priority />
            </div>
          )}

          {/* Title & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-gray-400">{subtitle}</p>
            )}
          </div>

          {/* Form Content */}
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 lg:p-6 text-center">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} COOPNAMA. Todos los derechos reservados.
        </p>
        <div className="mt-2 flex justify-center gap-4 text-sm">
          <Link href="/privacy" className="text-gray-400 hover:text-[#009e59]">
            Privacidad
          </Link>
          <Link href="/terms" className="text-gray-400 hover:text-[#009e59]">
            Términos
          </Link>
          <Link href="/help" className="text-gray-400 hover:text-[#009e59]">
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
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Correo Electrónico
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="correo@ejemplo.com"
            className="w-full bg-white/[0.05] border border-white/[0.10] rounded-neu-sm px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#009e59]/50 focus:ring-2 focus:ring-[#009e59]/20 transition-all duration-150"
          />
        </div>

        <button
          type="submit"
          className={`
            w-full
            px-6 py-3
            bg-gradient-to-r from-[#009e59] to-[#00c96f]
            text-white
            font-semibold
            rounded-neu-sm
            shadow-md
            hover:shadow-lg hover:shadow-[#009e59]/20
            active:scale-[0.98]
            transition-all duration-150
          `}
        >
          Enviar Enlace
        </button>

        <p className="text-center text-gray-300">
          <Link href="/auth/login" className="text-[#009e59] font-medium hover:underline">
            ← Volver al inicio de sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

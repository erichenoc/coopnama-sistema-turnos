'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input } from '@/shared/components'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { forgotPasswordAction } from '@/features/auth/actions/auth-actions'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)

    const result = await forgotPasswordAction(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Recuperar Contrasena"
      subtitle="Te enviaremos un enlace para restablecer tu contrasena"
    >
      {success ? (
        <div className="space-y-6 text-center">
          <div className="p-4 bg-green-50 border border-green-200 rounded-neu-sm">
            <svg
              className="w-12 h-12 text-green-600 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-green-800 font-medium">
              Revisa tu correo electronico
            </p>
            <p className="text-sm text-green-600 mt-1">
              Te hemos enviado un enlace para restablecer tu contrasena.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block text-coopnama-primary font-medium hover:underline"
          >
            Volver al inicio de sesion
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-coopnama-danger/10 border border-coopnama-danger/20 rounded-neu-sm">
              <p className="text-sm text-coopnama-danger">{error}</p>
            </div>
          )}

          <Input
            label="Correo Electronico"
            type="email"
            name="email"
            placeholder="correo@ejemplo.com"
            required
            autoComplete="email"
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            }
          />

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
            Enviar Enlace
          </Button>

          <p className="text-center text-gray-600">
            <Link href="/login" className="text-coopnama-primary font-medium hover:underline">
              Volver al inicio de sesion
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}

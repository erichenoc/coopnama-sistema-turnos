'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input } from '@/shared/components'
import { signupAction } from '@/features/auth/actions/auth-actions'

export function SignupForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const form = new FormData(e.currentTarget)
    const password = form.get('password') as string
    const confirmPassword = form.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres')
      return
    }
    if (!acceptedTerms) {
      setError('Debes aceptar los terminos y condiciones')
      return
    }

    const firstName = form.get('firstName') as string
    const lastName = form.get('lastName') as string
    form.set('fullName', `${firstName} ${lastName}`)

    setIsLoading(true)
    try {
      const result = await signupAction(form)
      if (result?.error) {
        setError(result.error)
      }
    } catch {
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 bg-coopnama-danger/10 border border-coopnama-danger/20 rounded-neu-sm">
          <p className="text-sm text-coopnama-danger">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nombre" type="text" name="firstName" placeholder="Juan" required autoComplete="given-name" />
        <Input label="Apellido" type="text" name="lastName" placeholder="Perez" required autoComplete="family-name" />
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Contrasena"
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="********"
          required
          autoComplete="new-password"
          hint="Minimo 6 caracteres"
        />
        <Input
          label="Confirmar Contrasena"
          type={showPassword ? 'text' : 'password'}
          name="confirmPassword"
          placeholder="********"
          required
          autoComplete="new-password"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-coopnama-primary focus:ring-coopnama-primary"
        />
        <span className="text-sm text-gray-600">Mostrar contrasenas</span>
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded border-gray-300 text-coopnama-primary focus:ring-coopnama-primary"
        />
        <span className="text-sm text-gray-600">
          Acepto los terminos y condiciones y la politica de privacidad
        </span>
      </label>

      <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full" disabled={!acceptedTerms}>
        Crear Cuenta
      </Button>

      <p className="text-center text-gray-600">
        Ya tienes una cuenta?{' '}
        <Link href="/login" className="text-coopnama-primary font-medium hover:underline">
          Inicia sesion
        </Link>
      </p>
    </form>
  )
}

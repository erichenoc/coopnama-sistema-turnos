'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'

interface MFAVerifyProps {
  onVerified: () => void
}

export function MFAVerify({ onVerified }: MFAVerifyProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    if (code.length !== 6) return
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Get the TOTP factor
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totpFactor = factors?.totp?.find(f => f.status === 'verified')

    if (!totpFactor) {
      setError('No se encontro factor MFA')
      setLoading(false)
      return
    }

    // Challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id,
    })

    if (challengeError) {
      setError(challengeError.message)
      setLoading(false)
      return
    }

    // Verify
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challengeData.id,
      code,
    })

    if (verifyError) {
      setError('Codigo incorrecto')
      setCode('')
      setLoading(false)
      return
    }

    onVerified()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-6 bg-white rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-coopnama-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-coopnama-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Verificacion 2FA</h2>
          <p className="text-sm text-gray-500 mt-1">
            Ingresa el codigo de tu app de autenticacion
          </p>
        </div>

        <div className="space-y-4">
          <Input
            type="text"
            maxLength={6}
            pattern="[0-9]*"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="text-center text-2xl font-mono tracking-widest"
            autoFocus
          />

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <Button
            variant="primary"
            className="w-full"
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
          >
            {loading ? <Spinner size="sm" /> : 'Verificar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

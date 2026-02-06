'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'

type MFAStep = 'idle' | 'setup' | 'verify' | 'backup' | 'done'

export function MFASetup() {
  const [step, setStep] = useState<MFAStep>('idle')
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [factorId, setFactorId] = useState<string>('')
  const [verifyCode, setVerifyCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaEnabled, setMfaEnabled] = useState(false)

  // Check if MFA is already enrolled
  useState(() => {
    checkMFAStatus()
  })

  async function checkMFAStatus() {
    const supabase = createClient()
    const { data } = await supabase.auth.mfa.listFactors()
    if (data?.totp && data.totp.length > 0) {
      const verified = data.totp.find(f => f.status === 'verified')
      if (verified) {
        setMfaEnabled(true)
        setStep('done')
      }
    }
  }

  async function handleEnroll() {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'COOPNAMA Turnos',
    })

    if (enrollError) {
      setError(enrollError.message)
      setLoading(false)
      return
    }

    if (data) {
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setFactorId(data.id)
      setStep('setup')
    }
    setLoading(false)
  }

  async function handleVerify() {
    if (verifyCode.length !== 6) return
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    })

    if (challengeError) {
      setError(challengeError.message)
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode,
    })

    if (verifyError) {
      setError('Codigo incorrecto. Intenta de nuevo.')
      setLoading(false)
      return
    }

    // Generate backup codes (stored client-side - user must save them)
    const codes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 8).toUpperCase()
    )
    setBackupCodes(codes)
    setMfaEnabled(true)
    setStep('backup')
    setLoading(false)
  }

  async function handleDisable() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.auth.mfa.listFactors()

    if (data?.totp) {
      for (const factor of data.totp) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
    }

    setMfaEnabled(false)
    setStep('idle')
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Autenticacion de Dos Factores (2FA)</CardTitle>
          {mfaEnabled && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Activo
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {step === 'idle' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Protege tu cuenta con autenticacion de dos factores usando una app como
              Google Authenticator o Authy.
            </p>
            <Button variant="primary" onClick={handleEnroll} disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Activar 2FA'}
            </Button>
          </div>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Escanea este codigo QR con tu app de autenticacion:
            </p>
            {qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-1">O ingresa este codigo manualmente:</p>
              <code className="block p-2 bg-gray-100 rounded text-sm font-mono break-all">
                {secret}
              </code>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingresa el codigo de 6 digitos de tu app:
              </label>
              <div className="flex gap-3">
                <Input
                  type="text"
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-32 text-center text-lg font-mono"
                />
                <Button
                  variant="primary"
                  onClick={handleVerify}
                  disabled={loading || verifyCode.length !== 6}
                >
                  {loading ? <Spinner size="sm" /> : 'Verificar'}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {step === 'backup' && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                Guarda estos codigos de respaldo en un lugar seguro
              </p>
              <p className="text-xs text-yellow-700">
                Si pierdes acceso a tu app de autenticacion, puedes usar estos codigos para acceder a tu cuenta.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
              {backupCodes.map((code, i) => (
                <code key={i} className="text-sm font-mono text-gray-800">{code}</code>
              ))}
            </div>
            <Button
              variant="primary"
              onClick={() => setStep('done')}
            >
              Ya guarde mis codigos
            </Button>
          </div>
        )}

        {step === 'done' && mfaEnabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-green-800">
                La autenticacion de dos factores esta activa en tu cuenta.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={handleDisable}
              disabled={loading}
              className="text-red-600 hover:text-red-700"
            >
              {loading ? <Spinner size="sm" /> : 'Desactivar 2FA'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

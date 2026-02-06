import { Metadata } from 'next'
import { AuthLayout, SignupForm } from '@/features/auth/components'

export const metadata: Metadata = {
  title: 'Crear Cuenta',
  description: 'Regístrate en COOPNAMA Turnos para gestionar tus turnos',
}

export default function SignupPage() {
  return (
    <AuthLayout
      title="Crear una cuenta"
      subtitle="Únete a COOPNAMA y gestiona tus turnos fácilmente"
    >
      <SignupForm />
    </AuthLayout>
  )
}

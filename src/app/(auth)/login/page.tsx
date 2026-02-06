import { Metadata } from 'next'
import { AuthLayout, LoginForm } from '@/features/auth/components'

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description: 'Accede a tu cuenta de COOPNAMA Turnos',
}

export default function LoginPage() {
  return (
    <AuthLayout
      title="Bienvenido de vuelta"
      subtitle="Inicia sesión para acceder a tu cuenta"
    >
      <LoginForm />
    </AuthLayout>
  )
}

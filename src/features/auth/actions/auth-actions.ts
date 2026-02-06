'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export interface AuthResult {
  error?: string
  success?: boolean
}

export async function loginAction(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email y contrasena son requeridos' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Credenciales incorrectas. Verifica tu email y contrasena.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signupAction(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  if (!email || !password || !fullName) {
    return { error: 'Todos los campos son requeridos' }
  }

  if (password.length < 6) {
    return { error: 'La contrasena debe tener al menos 6 caracteres' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*, organization:organizations(*), branch:branches(*)')
    .eq('id', user.id)
    .single()

  return { ...user, profile }
}

export async function forgotPasswordAction(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'El correo electronico es requerido' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
  })

  if (error) {
    return { error: 'Error al enviar el correo. Verifica que el correo exista.' }
  }

  return { success: true }
}

export async function resetPasswordAction(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Ambas contrasenas son requeridas' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contrasenas no coinciden' }
  }

  if (password.length < 6) {
    return { error: 'La contrasena debe tener al menos 6 caracteres' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Error al actualizar la contrasena. Intenta de nuevo.' }
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}

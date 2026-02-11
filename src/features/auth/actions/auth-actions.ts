'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export interface AuthResult {
  error?: string
  success?: boolean
}

// In-memory rate limiter for auth actions
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_LOGIN_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute

function checkLoginRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = loginAttempts.get(identifier)

  if (!record || now > record.resetAt) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - 1 }
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - record.count }
}

// Cleanup old entries periodically (every 5 minutes)
if (typeof globalThis !== 'undefined') {
  const cleanupInterval = 5 * 60_000
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of loginAttempts) {
      if (now > val.resetAt) loginAttempts.delete(key)
    }
  }, cleanupInterval).unref?.()
}

export async function loginAction(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email y contrasena son requeridos' }
  }

  // Rate limit by IP + email combo
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rateLimitKey = `${ip}:${email.toLowerCase()}`
  const { allowed } = checkLoginRateLimit(rateLimitKey)

  if (!allowed) {
    return { error: 'Demasiados intentos. Espera un minuto antes de intentar de nuevo.' }
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

  // Validate password strength
  if (password.length < 8) {
    return { error: 'La contrasena debe tener al menos 8 caracteres' }
  }
  if (!/[A-Z]/.test(password)) {
    return { error: 'La contrasena debe incluir al menos una letra mayuscula' }
  }
  if (!/[a-z]/.test(password)) {
    return { error: 'La contrasena debe incluir al menos una letra minuscula' }
  }
  if (!/[0-9]/.test(password)) {
    return { error: 'La contrasena debe incluir al menos un numero' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Get the new user's ID
  const userId = data.user?.id
  if (!userId) {
    return { error: 'Error al crear usuario. Intenta de nuevo.' }
  }

  // Fetch the default organization (first org)
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .limit(1)
    .single()

  if (orgError || !orgData) {
    return { error: 'Error de configuracion. Contacta al administrador.' }
  }

  // Insert into users table with inactive status (pending admin approval)
  const { error: userInsertError } = await supabase
    .from('users')
    .insert({
      id: userId,
      organization_id: orgData.id,
      full_name: fullName,
      role: 'agent',
      is_active: false,
    })

  if (userInsertError) {
    return { error: 'Error al crear perfil de usuario. Intenta de nuevo.' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
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

  // Use origin from request headers for reliable URL detection across all environments
  const headersList = await headers()
  const origin = headersList.get('origin')
    || process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
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

  // Validate password strength
  if (password.length < 8) {
    return { error: 'La contrasena debe tener al menos 8 caracteres' }
  }
  if (!/[A-Z]/.test(password)) {
    return { error: 'La contrasena debe incluir al menos una letra mayuscula' }
  }
  if (!/[a-z]/.test(password)) {
    return { error: 'La contrasena debe incluir al menos una letra minuscula' }
  }
  if (!/[0-9]/.test(password)) {
    return { error: 'La contrasena debe incluir al menos un numero' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Error al actualizar la contrasena. Intenta de nuevo.' }
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}

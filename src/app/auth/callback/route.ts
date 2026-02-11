import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Auth callback route for Supabase.
 * Handles token exchange for:
 * - Password reset links (PKCE code or token_hash)
 * - Email confirmation links
 * - OAuth callbacks
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // PKCE flow: exchange authorization code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Legacy/token_hash flow: verify OTP with token hash
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'recovery' | 'email' | 'signup' | 'invite' | 'magiclink',
      token_hash,
    })

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If code/token exchange fails, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

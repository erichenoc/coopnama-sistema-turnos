import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

interface AuthResult {
  user: User
  organizationId: string
}

/**
 * Require authentication for an API route.
 * Returns the authenticated user and their organization_id, or a 401 response.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch user's organization from the users table
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
  }

  return { user, organizationId: profile.organization_id }
}

/**
 * Type guard: check if requireAuth returned a NextResponse (error)
 */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

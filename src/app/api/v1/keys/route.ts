import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { generateAPIKey } from '@/lib/api/auth'

/**
 * POST /api/v1/keys
 * Create a new API key (authenticated via session, not API key).
 */
export async function POST(req: NextRequest) {
  // Auth via session (this is a management endpoint)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Not needed for reading
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, scopes, organization_id } = body

  if (!name || !organization_id) {
    return NextResponse.json({ error: 'name and organization_id required' }, { status: 400 })
  }

  const { key, hash, prefix } = await generateAPIKey()

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await serviceClient.from('api_keys').insert({
    organization_id,
    name,
    key_hash: hash,
    key_prefix: prefix,
    scopes: scopes || ['read'],
    created_by: user.id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return the full key ONCE
  return NextResponse.json({ key, prefix })
}

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface APIKeyInfo {
  id: string
  organizationId: string
  scopes: string[]
  rateLimitPerMinute: number
}

/**
 * Authenticate API request using Bearer token (API key).
 * Returns API key info or null if invalid.
 */
export async function authenticateAPIKey(req: NextRequest): Promise<APIKeyInfo | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const apiKey = authHeader.slice(7)
  if (!apiKey || apiKey.length < 32) return null

  const keyHash = await hashKey(apiKey)
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  const { data } = await supabase
    .from('api_keys')
    .select('id, organization_id, scopes, rate_limit_per_minute, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single()

  if (!data || !data.is_active) return null

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return {
    id: data.id,
    organizationId: data.organization_id,
    scopes: data.scopes || ['read'],
    rateLimitPerMinute: data.rate_limit_per_minute || 60,
  }
}

/**
 * Check rate limit for an API key. Returns true if within limit.
 */
export async function checkRateLimit(keyInfo: APIKeyInfo): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  // Current minute window
  const now = new Date()
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()).toISOString()

  const { data: existing } = await supabase
    .from('api_rate_limits')
    .select('request_count')
    .eq('api_key_id', keyInfo.id)
    .eq('window_start', windowStart)
    .single()

  const currentCount = existing?.request_count || 0

  if (currentCount >= keyInfo.rateLimitPerMinute) {
    return { allowed: false, remaining: 0 }
  }

  // Upsert rate limit counter
  if (existing) {
    await supabase
      .from('api_rate_limits')
      .update({ request_count: currentCount + 1 })
      .eq('api_key_id', keyInfo.id)
      .eq('window_start', windowStart)
  } else {
    await supabase.from('api_rate_limits').insert({
      api_key_id: keyInfo.id,
      window_start: windowStart,
      request_count: 1,
    })
  }

  return { allowed: true, remaining: keyInfo.rateLimitPerMinute - currentCount - 1 }
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a new API key. Returns the full key (only shown once) and its hash.
 */
export async function generateAPIKey(): Promise<{ key: string; hash: string; prefix: string }> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const key = 'ck_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const hash = await hashKey(key)
  const prefix = key.slice(0, 11) // "ck_" + 8 chars

  return { key, hash, prefix }
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/tv', '/kiosk', '/mi-turno', '/booking', '/auth/callback']

// API routes that are intentionally public (have their own auth/secret validation)
const PUBLIC_API_PREFIXES = [
  '/api/public/',      // Public endpoints (kiosk ticket creation, etc.)
  '/api/webhooks/',    // Webhooks (validate their own secrets)
  '/api/cron/',        // Cron jobs (validate their own secrets)
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Record<string, unknown>)
          )
        },
      },
    }
  )

  // White-label: detect custom domain and pass org info via headers
  const hostname = request.headers.get('host') || ''
  const isCustomDomain = hostname &&
    !hostname.includes('localhost') &&
    !hostname.includes('vercel.app') &&
    !hostname.includes('coopnama')

  if (isCustomDomain) {
    supabaseResponse.headers.set('x-custom-domain', hostname)
  }

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Check if route is public
  const isPublicPage = PUBLIC_ROUTES.some(route => pathname === route)
  const isPublicAPI = PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
  const isPublicRoute = isPublicPage || isPublicAPI

  if (!user && !isPublicRoute) {
    // For protected API routes, return 401 JSON instead of redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // For pages, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

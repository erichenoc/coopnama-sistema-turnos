import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/tv', '/kiosk', '/mi-turno', '/booking']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    request.nextUrl.pathname === route
  ) || request.nextUrl.pathname.startsWith('/api/')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
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

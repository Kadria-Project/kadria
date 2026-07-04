import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { DEMO_ACCESS_COOKIE, verifyDemoAccessSessionToken } from '@/src/lib/demo-access'

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error('Missing AUTH_SECRET or NEXTAUTH_SECRET')
  }

  return new TextEncoder().encode(secret)
}

function normalizeAccessValue(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function canAccessPlatformFromToken(payload: { role?: unknown; statut?: unknown; billing_status?: unknown; billingStatus?: unknown }) {
  const role = normalizeAccessValue(payload.role)
  const statut = normalizeAccessValue(payload.statut)
  const billingStatus = normalizeAccessValue(payload.billing_status ?? payload.billingStatus)

  if (role === 'admin') return true
  if (billingStatus === 'active' || billingStatus === 'trialing') return true
  if (statut === 'actif' && !billingStatus) return true
  return false
}

type AccessTokenPayload = {
  role?: unknown
  statut?: unknown
  billing_status?: unknown
  billingStatus?: unknown
}

type DemoAccessRow = {
  id?: string
  status?: string | null
  expires_at?: string | null
  revoked_at?: string | null
  access_token_hash?: string | null
}

function maskTokenForLog(value: string | null | undefined) {
  const normalized = String(value || '').trim()
  if (!normalized) return 'empty'
  if (normalized.length <= 8) return `${normalized.slice(0, 2)}…${normalized.slice(-2)}`
  return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`
}

function redirectToDemoAccess(request: NextRequest, reason: string) {
  const url = new URL('/demo/acces', request.url)
  url.searchParams.set('reason', reason)
  const response = NextResponse.redirect(url)
  response.cookies.delete(DEMO_ACCESS_COOKIE)
  return response
}

function parseIsoDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function fetchDemoAccessRow(requestId: string): Promise<DemoAccessRow | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseSecretKey || !requestId) {
    return null
  }

  const params = new URLSearchParams({
    select: 'id,status,expires_at,revoked_at,access_token_hash',
  })
  params.append('id', `eq.${requestId}`)

  const response = await fetch(`${supabaseUrl}/rest/v1/demo_access_requests?${params.toString()}`, {
    headers: {
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${supabaseSecretKey}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    console.error('[DEMO ACCESS MIDDLEWARE] fetchDemoAccessRow failed', {
      requestId: maskTokenForLog(requestId),
      status: response.status,
    })
    return null
  }

  const rows = (await response.json().catch(() => [])) as DemoAccessRow[]
  return rows[0] || null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/devis/')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/devis/public/')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/demo-dashboard') || pathname.startsWith('/demo-parametres')) {
    const token = request.cookies.get(DEMO_ACCESS_COOKIE)?.value

    if (!token) {
      return redirectToDemoAccess(request, 'demo_access_required')
    }

    const session = await verifyDemoAccessSessionToken(token)
    if (!session?.requestId || !session.tokenHash) {
      return redirectToDemoAccess(request, 'demo_access_required')
    }

    const row = await fetchDemoAccessRow(session.requestId)
    if (!row?.id) {
      console.warn('[DEMO ACCESS MIDDLEWARE] Signed demo session accepted without DB recheck', {
        requestId: maskTokenForLog(session.requestId),
      })
      return NextResponse.next()
    }

    if (row.access_token_hash !== session.tokenHash) {
      console.warn('[DEMO ACCESS MIDDLEWARE] Token hash mismatch', {
        requestId: maskTokenForLog(session.requestId),
      })
      return redirectToDemoAccess(request, 'demo_access_invalid')
    }

    if (row.revoked_at || row.status === 'revoked') {
      console.warn('[DEMO ACCESS MIDDLEWARE] Revoked demo access', {
        requestId: maskTokenForLog(session.requestId),
      })
      return redirectToDemoAccess(request, 'demo_access_revoked')
    }

    const expiresAt = parseIsoDate(row.expires_at)
    if (!expiresAt || expiresAt.getTime() <= Date.now() || row.status === 'expired') {
      console.warn('[DEMO ACCESS MIDDLEWARE] Expired demo access', {
        requestId: maskTokenForLog(session.requestId),
      })
      return redirectToDemoAccess(request, 'demo_access_expired')
    }

    if (row.status !== 'approved') {
      console.warn('[DEMO ACCESS MIDDLEWARE] Unexpected demo access status', {
        requestId: maskTokenForLog(session.requestId),
        status: row.status || 'empty',
      })
      return redirectToDemoAccess(request, 'demo_access_required')
    }

    return NextResponse.next()
  }

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('kadria-auth')?.value

    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    try {
      const { payload } = await jwtVerify(token, getAuthSecret())
      if (payload.role !== 'Admin') {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return NextResponse.next()
    } catch {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('kadria-auth')
      return response
    }
  }

  if (pathname.startsWith('/dashboard-v2') || pathname === '/onboarding') {
    const token = request.cookies.get('kadria-auth')?.value

    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    try {
      const { payload } = await jwtVerify(token, getAuthSecret())
      if (!canAccessPlatformFromToken(payload as AccessTokenPayload)) {
        const loginUrl = new URL('/register?payment=required', request.url)
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('kadria-auth')
        return response
      }
      return NextResponse.next()
    } catch {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('kadria-auth')
      return response
    }
  }

  if (pathname === '/login') {
    const token = request.cookies.get('kadria-auth')?.value
    if (token) {
      try {
        const { payload } = await jwtVerify(token, getAuthSecret())
        if (canAccessPlatformFromToken(payload as AccessTokenPayload)) {
          return NextResponse.redirect(new URL('/dashboard-v2', request.url))
        }
      } catch {
        // Token invalide, laisse passer
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard-v2',
    '/dashboard-v2/:path*',
    '/onboarding',
    '/login',
    '/admin',
    '/admin/:path*',
    '/demo-dashboard',
    '/demo-dashboard/:path*',
    '/demo-parametres',
    '/demo-parametres/:path*',
  ],
}

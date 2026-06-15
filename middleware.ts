import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error('Missing AUTH_SECRET or NEXTAUTH_SECRET')
  }

  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/devis/')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/devis/public/')) {
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
      await jwtVerify(token, getAuthSecret())
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
        await jwtVerify(token, getAuthSecret())
        return NextResponse.redirect(new URL('/dashboard-v2', request.url))
      } catch {
        // Token invalide, laisse passer
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard-v2', '/dashboard-v2/:path*', '/onboarding', '/login', '/admin', '/admin/:path*'],
}

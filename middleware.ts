import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard-v2')) {
    const token = request.cookies.get('kadria-auth')?.value

    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    try {
      await jwtVerify(token, SECRET)
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
        await jwtVerify(token, SECRET)
        return NextResponse.redirect(new URL('/dashboard-v2', request.url))
      } catch {
        // Token invalide, laisse passer
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard-v2', '/dashboard-v2/:path*', '/login'],
}

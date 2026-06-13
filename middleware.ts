import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard-v2')
  const isOnLogin = req.nextUrl.pathname.startsWith('/login')

  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard-v2', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard-v2/:path*', '/login'],
}

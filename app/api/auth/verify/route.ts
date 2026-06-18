import { NextRequest, NextResponse } from 'next/server'
import { getArtisanByEmail } from '@/src/lib/airtable'
import { verifyMagicToken, createToken } from '@/src/lib/auth-utils'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/auth/error?error=MissingToken', request.url))
  }

  const magic = await verifyMagicToken(token)
  if (!magic) {
    return NextResponse.redirect(new URL('/auth/error?error=Verification', request.url))
  }

  const artisan = await getArtisanByEmail(magic.email)
  if (!artisan) {
    return NextResponse.redirect(new URL('/auth/error?error=AccessDenied', request.url))
  }

  // Crée le cookie de session
  const sessionToken = await createToken({
    email: magic.email,
    artisanId: artisan.artisanId,
    companyName: artisan.companyName,
    primaryColor: artisan.primaryColor || '#22c55e',
  })

  const response = NextResponse.redirect(new URL('/dashboard-v2', request.url))
  response.cookies.set('kadria-auth', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: '/',
  })

  return response
}

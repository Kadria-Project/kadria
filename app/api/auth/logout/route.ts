import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.redirect(
    new URL('/login', process.env.NEXTAUTH_URL || 'https://kadria-beta.vercel.app')
  )
  response.cookies.delete('kadria-auth')
  return response
}

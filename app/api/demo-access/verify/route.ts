import { NextRequest, NextResponse } from 'next/server'
import { DEMO_ACCESS_COOKIE, createDemoAccessSessionToken, hashDemoAccessToken } from '@/src/lib/demo-access'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function redirectToDemoAccess(request: NextRequest, reason: string) {
  const url = new URL('/demo/acces', request.url)
  url.searchParams.set('reason', reason)
  return NextResponse.redirect(url)
}

function parseExpiresAt(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  try {
    const rawToken = request.nextUrl.searchParams.get('token') || ''
    if (!rawToken) {
      return redirectToDemoAccess(request, 'demo_access_invalid')
    }

    const tokenHash = await hashDemoAccessToken(rawToken)

    const { data: row, error } = await supabaseAdmin
      .from('demo_access_requests')
      .select('id, status, expires_at, revoked_at, access_count')
      .eq('access_token_hash', tokenHash)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[DEMO ACCESS VERIFY] Fetch error:', error)
      return redirectToDemoAccess(request, 'demo_access_invalid')
    }

    if (!row) {
      return redirectToDemoAccess(request, 'demo_access_invalid')
    }

    if (row.revoked_at || row.status === 'revoked') {
      return redirectToDemoAccess(request, 'demo_access_revoked')
    }

    const expiresAt = parseExpiresAt(row.expires_at)
    if (!expiresAt || expiresAt.getTime() <= Date.now() || row.status === 'expired') {
      return redirectToDemoAccess(request, 'demo_access_expired')
    }

    if (row.status !== 'approved') {
      return redirectToDemoAccess(request, 'demo_access_invalid')
    }

    const cookieValue = await createDemoAccessSessionToken({
      requestId: row.id,
      tokenHash,
      expiresAt,
    })

    const { error: updateError } = await supabaseAdmin
      .from('demo_access_requests')
      .update({
        last_access_at: new Date().toISOString(),
        access_count: Number(row.access_count || 0) + 1,
      })
      .eq('id', row.id)

    if (updateError) {
      console.error('[DEMO ACCESS VERIFY] Update error:', updateError)
    }

    const response = NextResponse.redirect(new URL('/demo-dashboard', request.url))
    response.cookies.set(DEMO_ACCESS_COOKIE, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })

    return response
  } catch (error) {
    console.error('[DEMO ACCESS VERIFY] Error:', error instanceof Error ? error.message : String(error))
    return redirectToDemoAccess(request, 'demo_access_invalid')
  }
}

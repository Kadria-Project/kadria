import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { GOOGLE_CALENDAR_PROVIDER } from '@/src/lib/google-calendar'

const GOOGLE_CALENDAR_OAUTH_STATE_COOKIE = 'kadria-gcal-state'

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

interface GoogleUserInfo {
  email?: string
}

export async function GET(request: NextRequest) {
  const redirectErrorUrl = new URL('/dashboard-v2?agenda=error', request.url)
  const redirectSuccessUrl = new URL('/dashboard-v2?agenda=connected', request.url)

  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.redirect(redirectErrorUrl)
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const oauthError = searchParams.get('error')

    if (oauthError) {
      console.error('[GOOGLE CALENDAR CALLBACK] Erreur OAuth retournée par Google:', oauthError)
      return NextResponse.redirect(redirectErrorUrl)
    }

    const cookieState = request.cookies.get(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE)?.value
    if (!code || !state || !cookieState || state !== cookieState) {
      console.error('[GOOGLE CALENDAR CALLBACK] State CSRF invalide ou code manquant')
      return NextResponse.redirect(redirectErrorUrl)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('[GOOGLE CALENDAR CALLBACK] Variables GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI manquantes')
      return NextResponse.redirect(redirectErrorUrl)
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('[GOOGLE CALENDAR CALLBACK] Échec échange code/token', tokenResponse.status, await tokenResponse.text())
      return NextResponse.redirect(redirectErrorUrl)
    }

    const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse

    let calendarEmail: string | null = null
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      })
      if (userInfoResponse.ok) {
        const userInfo = (await userInfoResponse.json()) as GoogleUserInfo
        calendarEmail = userInfo.email || null
      }
    } catch (error) {
      console.error('[GOOGLE CALENDAR CALLBACK] Erreur récupération userinfo:', error instanceof Error ? error.message : String(error))
    }

    const tokenExpiry = new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()

    // Google ne renvoie un refresh_token que lors du premier consentement
    // (prompt=consent force toutefois ce renvoi systématique ici). Par
    // sécurité, si jamais absent, on conserve l'ancien refresh_token existant
    // plutôt que d'écraser avec null.
    let refreshToken: string | null | undefined = tokenJson.refresh_token
    if (!refreshToken) {
      const { data: existing } = await supabaseAdmin
        .from('calendar_integrations')
        .select('refresh_token')
        .eq('artisan_id', session.artisanId)
        .eq('provider', GOOGLE_CALENDAR_PROVIDER)
        .maybeSingle()
      refreshToken = existing?.refresh_token ?? null
    }

    const { error: upsertError } = await supabaseAdmin
      .from('calendar_integrations')
      .upsert(
        {
          artisan_id: session.artisanId,
          provider: GOOGLE_CALENDAR_PROVIDER,
          access_token: tokenJson.access_token,
          refresh_token: refreshToken,
          token_expiry: tokenExpiry,
          calendar_email: calendarEmail,
          is_connected: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'artisan_id,provider' }
      )

    if (upsertError) {
      console.error('[GOOGLE CALENDAR CALLBACK] Erreur upsert Supabase:', upsertError.message)
      return NextResponse.redirect(redirectErrorUrl)
    }

    const response = NextResponse.redirect(redirectSuccessUrl)
    response.cookies.delete(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE)
    return response
  } catch (error) {
    console.error('[GOOGLE CALENDAR CALLBACK]', error instanceof Error ? error.message : String(error))
    return NextResponse.redirect(redirectErrorUrl)
  }
}

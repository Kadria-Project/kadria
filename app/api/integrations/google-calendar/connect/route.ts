import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSession } from '@/src/lib/auth-utils'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { checkPermission } from '@/src/lib/team/access'

const GOOGLE_CALENDAR_OAUTH_STATE_COOKIE = 'kadria-gcal-state'
const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'email',
].join(' ')

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    if (!checkPermission(await getCurrentTenantContext(), 'integrations.manage')) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI
    if (!clientId || !redirectUri) {
      console.error('[GOOGLE CALENDAR CONNECT] Variables GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI manquantes')
      return NextResponse.redirect(new URL('/dashboard-v2?agenda=error', _request.url))
    }

    // Nonce CSRF, stocké côté cookie httpOnly de courte durée et revalidé
    // dans /callback. L'identité de l'artisan n'a pas besoin d'être encodée
    // dans state puisque le cookie de session kadria-auth reviendra avec la
    // requête de callback (même domaine).
    const state = randomBytes(16).toString('hex')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_OAUTH_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    const response = NextResponse.redirect(authUrl)
    response.cookies.set(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[GOOGLE CALENDAR CONNECT]', error instanceof Error ? error.message : String(error))
    return NextResponse.redirect(new URL('/dashboard-v2?agenda=error', _request.url))
  }
}

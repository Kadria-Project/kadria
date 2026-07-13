import { NextRequest, NextResponse } from 'next/server'
import { getArtisanByEmail, getArtisanConfig } from '@/src/lib/airtable'
import { canAccessPlatformAccount, createToken } from '@/src/lib/auth-utils'
import { normalizePlan } from '@/src/lib/plans'
import { assertUxAuditRequestAllowed, getConfiguredAuditEmail } from '@/src/lib/dev/ux-audit-guard'

/**
 * Local-only login route for the "real product UX audit" access mechanism.
 *
 * This route is NOT a generic backdoor: it can only ever authenticate the
 * single, explicitly-configured test account named by
 * `KADRIA_AUDIT_USER_EMAIL`, and only when every independent condition in
 * `assertUxAuditRequestAllowed` holds (non-production, explicit opt-in flag,
 * configured email, localhost Host header, requested email exactly matches).
 *
 * Session creation architecture note: this codebase's real login flow
 * (see app/api/auth/verify/route.ts) does NOT use Supabase Auth / GoTrue
 * sessions. Session identity here is a project-specific signed JWT
 * (`kadria-auth` cookie, created by `createToken()` in
 * `src/lib/auth-utils.ts`) backed by an Airtable-sourced artisan record,
 * with Supabase Postgres used only as an application data store (tenants,
 * tenant_members, etc.), not as the auth/session provider. There is no
 * Supabase `generateLink()` / magic-link session-exchange mechanism to reuse
 * here, because the real product does not use one.
 *
 * To honour "reuse the existing official mechanism, do not invent a new
 * session format" under that real architecture, this route calls the exact
 * same functions the real magic-link verification route calls to produce a
 * session (`getArtisanByEmail`, `canAccessPlatformAccount`, `createToken`),
 * and sets the `kadria-auth` cookie with the exact same options. The only
 * difference from the real flow is that no magic-link email round-trip is
 * required, because the request has already been authenticated by the
 * independent server-side guard above (environment + host + exact email
 * match) instead of by possession of a mailed one-time token.
 */
export async function GET(request: NextRequest) {
  const hostHeader = request.headers.get('host')
  const requestedEmail = request.nextUrl.searchParams.get('email') || getConfiguredAuditEmail() || ''

  const check = assertUxAuditRequestAllowed({
    hostHeader,
    requestedEmail,
  })

  if (!check.enabled) {
    // Inert 404: no information disclosed about why, no route fingerprint.
    return new NextResponse(null, { status: 404 })
  }

  const auditEmail = getConfiguredAuditEmail()
  if (!auditEmail) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const artisan = await getArtisanByEmail(auditEmail)
    if (!artisan || !artisan.active) {
      console.error('[UX AUDIT LOGIN] Configured audit account not found or inactive in Airtable')
      return NextResponse.json(
        { success: false, error: 'Compte de test audit introuvable ou inactif. Voir docs/LOCAL_REAL_PRODUCT_UX_AUDIT_ACCESS.md' },
        { status: 412 },
      )
    }

    const billingStatus = (artisan as { billingStatus?: string }).billingStatus

    if (!canAccessPlatformAccount({
      role: artisan.role,
      statut: artisan.statut,
      billingStatus,
    })) {
      console.error('[UX AUDIT LOGIN] Configured audit account is not authorized to access the platform')
      return NextResponse.json(
        { success: false, error: 'Compte de test audit non autorisé (statut/plan). Voir la documentation.' },
        { status: 412 },
      )
    }

    const userId = artisan.id
    if (!userId) {
      console.error('[UX AUDIT LOGIN] Configured audit account has no Users.id')
      return NextResponse.json({ success: false, error: 'Compte de test audit invalide.' }, { status: 412 })
    }

    // Identical session-creation call to the real magic-link verify route.
    const sessionToken = await createToken({
      id: userId,
      email: auditEmail,
      artisanId: artisan.artisanId,
      companyName: artisan.companyName,
      primaryColor: artisan.primaryColor || '#22c55e',
      role: artisan.role || '',
      plan: normalizePlan(artisan.plan || 'Performance'),
      statut: artisan.statut || '',
      billingStatus: billingStatus || '',
      firstName: artisan.firstName || '',
      lastName: artisan.lastName || '',
    })

    const config = await getArtisanConfig(artisan.artisanId)
    const onboardingDone = !!config?.onboardingCompleted
    const redirectPath = onboardingDone ? '/dashboard-v2' : '/onboarding'

    const response = NextResponse.redirect(new URL(redirectPath, request.url))
    // Identical cookie options to the real magic-link verify route.
    response.cookies.set('kadria-auth', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    console.info('[UX AUDIT LOGIN] Local audit session created for configured test account')
    return response
  } catch (error) {
    console.error('[UX AUDIT LOGIN] Error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

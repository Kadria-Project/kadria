import { NextRequest, NextResponse } from 'next/server'
import { getArtisanByEmail, getArtisanConfig } from '@/src/lib/airtable'
import { verifyMagicToken, createToken, canAccessPlatformAccount } from '@/src/lib/auth-utils'
import { normalizePlan } from '@/src/lib/plans'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  try {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/error?error=MissingToken', request.url))
    }

    const magic = await verifyMagicToken(token)
    if (!magic) {
      console.error('[VERIFY] Erreur: token magique invalide ou expiré')
      return NextResponse.redirect(new URL('/auth/error?error=Verification', request.url))
    }

    const artisan = await getArtisanByEmail(magic.email)
    console.info('[VERIFY] User trouvé:', artisan?.id)
    if (!artisan) {
      console.error('[VERIFY] Erreur: aucun user Airtable')
      return NextResponse.redirect(new URL('/auth/error?error=AccessDenied', request.url))
    }

    const billingStatus = (artisan as { billingStatus?: string }).billingStatus
    const userId = artisan.id

    if (!userId) {
      console.error('[VERIFY] Erreur: Users.id introuvable pour la session', {
        email: magic.email,
        artisanId: artisan.artisanId,
        recordId: 'recordId' in artisan ? (artisan as { recordId?: string }).recordId || null : null,
      })
      return NextResponse.redirect(new URL('/auth/error?error=Verification', request.url))
    }

    if (!canAccessPlatformAccount({
      role: artisan.role,
      statut: artisan.statut,
      billingStatus,
    })) {
      return NextResponse.redirect(new URL('/register?payment=required', request.url))
    }

    // Crée le cookie de session
    const sessionToken = await createToken({
      id: userId,
      email: magic.email,
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

    // Détermine si l'onboarding a déjà été finalisé
    const config = await getArtisanConfig(artisan.artisanId)
    const onboardingDone = !!config?.onboardingCompleted

    const redirectPath =
      typeof magic.redirectTo === 'string' && magic.redirectTo.startsWith('/')
        ? magic.redirectTo
        : onboardingDone
          ? '/dashboard-v2'
          : '/onboarding'

    const response = NextResponse.redirect(
      new URL(redirectPath, request.url)
    )
    response.cookies.set('kadria-auth', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[VERIFY] Erreur:', error instanceof Error ? error.message : String(error))
    return NextResponse.redirect(new URL('/auth/error?error=Verification', request.url))
  }
}

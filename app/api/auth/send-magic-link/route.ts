import { NextResponse } from 'next/server'
import { getArtisanByEmail, TABLES } from '@/src/lib/airtable'
import { canAccessPlatformAccount, sendPlatformMagicLinkEmail } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email, callbackUrl } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail) {
      return NextResponse.json(
        { success: false, error: 'Email requis' },
        { status: 400 },
      )
    }

    const artisan = await getArtisanByEmail(normalizedEmail)
    if (!artisan || !artisan.active) {
      return NextResponse.json({ success: true })
    }

    const billingStatus = (artisan as { billingStatus?: string }).billingStatus

    if (!canAccessPlatformAccount({
      role: artisan.role,
      statut: artisan.statut,
      billingStatus,
    })) {
      return NextResponse.json(
        { success: false, error: 'Compte en attente de validation Stripe' },
        { status: 403 },
      )
    }

    await sendPlatformMagicLinkEmail({
      email: normalizedEmail,
      companyName: artisan.companyName,
      firstName: artisan.firstName,
      redirectTo: typeof callbackUrl === 'string' && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
        ? callbackUrl
        : null,
    })

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.users)
      .update({ last_login: new Date().toISOString() })
      .eq('id', artisan.id)

    if (updateError) {
      console.error('[AUTH] Failed to update last_login:', updateError.message)
    }

    console.info('[AUTH] Magic link sent')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[AUTH] Error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 },
    )
  }
}

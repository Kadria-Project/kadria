import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function getSiteUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'Adresse email invalide.' }, { status: 400 })
    }

    await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${getSiteUrl(request)}/reset-password`,
    })
    // Cette réponse est volontairement neutre : elle ne révèle pas l'existence d'un compte.
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AUTH PASSWORD RESET REQUEST] Failed', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Impossible d’envoyer le lien pour le moment. Réessayez dans quelques instants.' }, { status: 500 })
  }
}

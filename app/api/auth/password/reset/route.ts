import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken, password } = await request.json()
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string' || !validPassword(password)) {
      return NextResponse.json({ success: false, error: 'Le lien de réinitialisation n’est plus valide. Demandez-en un nouveau.' }, { status: 400 })
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SECRET_KEY
    if (!url || !secret) throw new Error('Missing Supabase environment variables')
    const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    if (sessionError) {
      return NextResponse.json({ success: false, error: 'Le lien de réinitialisation n’est plus valide. Demandez-en un nouveau.' }, { status: 400 })
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return NextResponse.json({ success: false, error: 'Le lien de réinitialisation n’est plus valide. Demandez-en un nouveau.' }, { status: 400 })
    }
    return NextResponse.json({ success: true, redirectUrl: '/login' })
  } catch (error) {
    console.error('[AUTH PASSWORD RESET] Failed', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Impossible de modifier le mot de passe pour le moment.' }, { status: 500 })
  }
}

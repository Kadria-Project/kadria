import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'

async function getAuthUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  const normalizedEmail = email.trim().toLowerCase()
  return data.users.find((user) => user.email?.trim().toLowerCase() === normalizedEmail) || null
}

function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const user = await getAuthUserByEmail(session.email)
    return NextResponse.json({ success: true, configured: Boolean(user) })
  } catch (error) {
    console.error('[AUTH PASSWORD STATUS] Failed', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Informations indisponibles.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const { password } = await request.json()
    if (!validPassword(password)) {
      return NextResponse.json({ success: false, error: 'Choisissez un mot de passe d’au moins 12 caractères.' }, { status: 400 })
    }

    const existingUser = await getAuthUserByEmail(session.email)
    const result = existingUser
      ? await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password })
      : await supabaseAdmin.auth.admin.createUser({ email: session.email, password, email_confirm: true })

    if (result.error) {
      console.error('[AUTH PASSWORD UPDATE] Supabase failed', result.error.message)
      return NextResponse.json({ success: false, error: 'Impossible de modifier le mot de passe pour le moment.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AUTH PASSWORD UPDATE] Failed', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Impossible de modifier le mot de passe pour le moment.' }, { status: 500 })
  }
}

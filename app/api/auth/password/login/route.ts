import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getArtisanByEmail, getArtisanConfig } from '@/src/lib/airtable'
import { canAccessPlatformAccount, createToken } from '@/src/lib/auth-utils'
import { normalizePlan } from '@/src/lib/plans'

function callbackPath(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null
}

function createPasswordAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) throw new Error('Missing Supabase environment variables')
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, callbackUrl } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail || !normalizedEmail.includes('@') || typeof password !== 'string' || !password) {
      return NextResponse.json({ success: false, error: 'Adresse email ou mot de passe incorrect.' }, { status: 400 })
    }

    const { data, error } = await createPasswordAuthClient().auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error || !data.user?.email) {
      return NextResponse.json({ success: false, error: 'Adresse email ou mot de passe incorrect.' }, { status: 401 })
    }

    const artisan = await getArtisanByEmail(data.user.email)
    const billingStatus = artisan && (artisan as { billingStatus?: string }).billingStatus
    if (!artisan || !canAccessPlatformAccount({ role: artisan.role, statut: artisan.statut, billingStatus })) {
      return NextResponse.json({ success: false, error: 'Impossible de vous connecter pour le moment. Réessayez dans quelques instants.' }, { status: 403 })
    }

    const sessionToken = await createToken({
      id: artisan.id,
      email: data.user.email,
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
    const redirectUrl = callbackPath(callbackUrl) || (config?.onboardingCompleted ? '/dashboard-v2' : '/onboarding')
    const response = NextResponse.json({ success: true, redirectUrl })
    response.cookies.set('kadria-auth', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('[AUTH PASSWORD LOGIN] Failed', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Impossible de vous connecter pour le moment. Réessayez dans quelques instants.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createMagicToken, createToken } from '@/src/lib/auth-utils'
import { TABLES } from '@/src/lib/airtable'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { normalizePlan, getPlanLabel } from '@/src/config/plans'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }
  return new Resend(apiKey)
}

function formatDateOnly(date: Date) {
  return date.toISOString().split('T')[0]
}

function buildArtisanId() {
  return `Artisan_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as { message?: string; code?: string; details?: string; hint?: string }
    return {
      message: supabaseError.message,
      code: supabaseError.code,
      details: supabaseError.details,
      hint: supabaseError.hint,
      raw: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    }
  }

  return String(error)
}

export async function POST(request: NextRequest) {
  let createdUserArtisanId: string | null = null
  let createdConfigArtisanId: string | null = null

  try {
    const resend = getResendClient()
    const { email, firstName, lastName, phone, company, trade, plan, interval } = await request.json()

    if (!email || !firstName || !lastName || !company || !trade) {
      return NextResponse.json(
        { success: false, error: 'Champs requis manquants' },
        { status: 400 },
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const requestedPlan = normalizePlan(plan)
    const validatedPlan = requestedPlan === 'performance' ? 'performance' : 'essentiel'

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from(TABLES.users)
      .select('artisan_id,email')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle()

    if (existingUserError) {
      throw existingUserError
    }

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Un compte existe déjà avec cet email' },
        { status: 409 },
      )
    }

    const trialEndDate = formatDateOnly(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    const subscriptionStart = formatDateOnly(new Date())
    const artisanId = buildArtisanId()

    const { error: userError } = await supabaseAdmin
      .from(TABLES.users)
      .insert({
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        company_name: company,
        role: 'Artisan',
        plan: getPlanLabel(validatedPlan),
        statut: 'Trial',
        trial_end_date: trialEndDate,
        subscription_start: subscriptionStart,
        artisan_id: artisanId,
        phone: phone || '',
      })

    if (userError) {
      console.error('[REGISTER] Supabase user error:', serializeError(userError))
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création du compte' },
        { status: 500 },
      )
    }

    createdUserArtisanId = artisanId

    const { error: configError } = await supabaseAdmin
      .from(TABLES.artisanConfig)
      .insert({
        artisan_id: artisanId,
        company_name: company,
        primary_trade: trade,
        email: normalizedEmail,
        phone: phone || '',
        active: true,
        devis_prefixe: 'DEV',
        devis_validite: 90,
        devis_tva_defaut: 10,
      })

    if (configError) {
      console.error('[REGISTER] Supabase config error:', serializeError(configError))

      await supabaseAdmin
        .from(TABLES.users)
        .delete()
        .eq('artisan_id', createdUserArtisanId)

      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création du compte' },
        { status: 500 },
      )
    }

    createdConfigArtisanId = artisanId

    const magicToken = await createMagicToken(normalizedEmail)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://kadria-beta.vercel.app'
    const magicUrl = `${baseUrl}/api/auth/verify?token=${magicToken}`

    await resend.emails.send({
      from: 'Kadria <connexion@kadria.fr>',
      to: normalizedEmail,
      subject: 'Bienvenue sur Kadria - Accédez à votre espace',
      html: `
        <div style="font-family:system-ui;max-width:500px;margin:0 auto;padding:40px 20px;background:#09090b;color:white;">
          <h1 style="margin:0 0 24px;">
            <span style="color:#22c55e">K</span><span style="color:white">adria</span>
          </h1>
          <h2 style="color:white;font-size:20px;margin:0 0 12px;font-weight:600;">
            Bienvenue ${firstName} !
          </h2>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 24px;">
            Votre espace Kadria Pro pour <strong style="color:white">${company}</strong> est prêt.
            Cliquez sur le bouton ci-dessous pour y accéder.<br/>
            Ce lien expire dans <strong style="color:white">10 minutes</strong>.
          </p>
          <a href="${magicUrl}"
             style="display:inline-block;background:#22c55e;color:black;font-weight:700;border-radius:10px;padding:14px 28px;font-size:16px;text-decoration:none;">
            Accéder à mon espace →
          </a>
          <p style="color:#52525b;font-size:12px;margin:24px 0 0;line-height:1.6;">
            Si vous n'avez pas demandé ce lien, ignorez cet email.<br/>
            Lien valable une seule fois pendant 10 minutes.
          </p>
        </div>
      `,
    })

    await resend.emails.send({
      from: 'Kadria <notifications@kadria.fr>',
      to: 'contact@kadria.fr',
      subject: `Nouvelle inscription : ${company}`,
      html: `
        <div style="font-family:system-ui;max-width:500px;margin:0 auto;padding:20px;">
          <h2>Nouvelle inscription Kadria</h2>
          <p><strong>Entreprise :</strong> ${company}</p>
          <p><strong>Nom :</strong> ${firstName} ${lastName}</p>
          <p><strong>Email :</strong> ${normalizedEmail}</p>
          <p><strong>Téléphone :</strong> ${phone || '-'}</p>
          <p><strong>Métier :</strong> ${trade}</p>
          <p><strong>Artisan ID :</strong> ${artisanId}</p>
        </div>
      `,
    })

    const sessionToken = await createToken({
      id: artisanId,
      email: normalizedEmail,
      artisanId,
      companyName: company,
      primaryColor: '#22c55e',
      role: 'Artisan',
      plan: normalizePlan(validatedPlan),
      statut: 'Trial',
      firstName,
      lastName,
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('kadria-auth', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    const serializedError = serializeError(error)
    console.error('[REGISTER] Error:', serializedError)

    if (createdConfigArtisanId) {
      await supabaseAdmin
        .from(TABLES.artisanConfig)
        .delete()
        .eq('artisan_id', createdConfigArtisanId)
    }

    if (createdUserArtisanId) {
      await supabaseAdmin
        .from(TABLES.users)
        .delete()
        .eq('artisan_id', createdUserArtisanId)
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la création du compte',
        details: process.env.NODE_ENV === 'development' ? serializedError : undefined,
      },
      { status: 500 },
    )
  }
}

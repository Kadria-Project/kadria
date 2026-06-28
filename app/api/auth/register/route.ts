import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createCheckoutIntentToken } from '@/src/lib/auth-utils'
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
        statut: 'pending_payment',
        billing_status: 'pending_payment',
        artisan_id: artisanId,
        phone: phone || '',
        notes_admin: 'Inscription en attente de validation Stripe - CB non saisie / paiement non finalisé',
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

    await resend.emails.send({
      from: 'Kadria <notifications@kadria.fr>',
      to: 'contact@kadria.fr',
      subject: `Nouvelle inscription en attente de paiement : ${company}`,
      html: `
        <div style="font-family:system-ui;max-width:500px;margin:0 auto;padding:20px;">
          <h2>Nouvelle inscription Kadria en attente de paiement</h2>
          <p><strong>Entreprise :</strong> ${company}</p>
          <p><strong>Nom :</strong> ${firstName} ${lastName}</p>
          <p><strong>Email :</strong> ${normalizedEmail}</p>
          <p><strong>Téléphone :</strong> ${phone || '-'}</p>
          <p><strong>Métier :</strong> ${trade}</p>
          <p><strong>Artisan ID :</strong> ${artisanId}</p>
          <p><strong>Statut :</strong> pending_payment</p>
          <p><strong>Note :</strong> CB non saisie / paiement non finalisé</p>
        </div>
      `,
    })

    const checkoutToken = await createCheckoutIntentToken({
      artisanId,
      email: normalizedEmail,
      plan: normalizePlan(validatedPlan),
      interval: interval === 'yearly' ? 'yearly' : 'monthly',
    })

    return NextResponse.json({ success: true, checkoutToken })
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

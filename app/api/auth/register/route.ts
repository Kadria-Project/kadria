import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createMagicToken } from '@/src/lib/auth-utils'
import { TABLES } from '@/src/lib/airtable'
import { supabaseAdmin } from '@/src/lib/supabase/server'

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

export async function POST(request: NextRequest) {
  let createdUserId: string | null = null
  let createdConfigId: string | null = null

  try {
    const resend = getResendClient()
    const { email, firstName, lastName, phone, company, trade } = await request.json()

    if (!email || !firstName || !lastName || !company || !trade) {
      return NextResponse.json(
        { success: false, error: 'Champs requis manquants' },
        { status: 400 },
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from(TABLES.users)
      .select('id')
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

    const { data: userData, error: userError } = await supabaseAdmin
      .from(TABLES.users)
      .insert({
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        company_name: company,
        role: 'Artisan',
        plan: 'Performance',
        statut: 'Trial',
        trial_end_date: trialEndDate,
        subscription_start: subscriptionStart,
        artisan_id: artisanId,
        phone: phone || '',
        active: true,
      })
      .select('id')
      .single()

    if (userError) {
      console.error('[REGISTER] Supabase user error:', userError.message)
      return NextResponse.json(
        { error: 'Erreur création compte' },
        { status: 500 },
      )
    }

    createdUserId = userData.id

    const { data: configData, error: configError } = await supabaseAdmin
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
      .select('id')
      .single()

    if (configError) {
      console.error('[REGISTER] Supabase config error:', configError.message)

      await supabaseAdmin
        .from(TABLES.users)
        .delete()
        .eq('id', createdUserId)

      return NextResponse.json(
        { error: 'Erreur création compte' },
        { status: 500 },
      )
    }

    createdConfigId = configData.id

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
          <p><strong>User record :</strong> ${userData.id}</p>
          <p><strong>Artisan_config record :</strong> ${configData.id}</p>
          <p><strong>Artisan ID :</strong> ${artisanId}</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[REGISTER] Error:', error instanceof Error ? error.message : String(error))

    if (createdConfigId) {
      await supabaseAdmin
        .from(TABLES.artisanConfig)
        .delete()
        .eq('id', createdConfigId)
    }

    if (createdUserId) {
      await supabaseAdmin
        .from(TABLES.users)
        .delete()
        .eq('id', createdUserId)
    }

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 },
    )
  }
}

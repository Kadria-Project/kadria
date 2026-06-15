import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createMagicToken } from '@/src/lib/auth-utils'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, phone, company, trade } = await request.json()

    if (!email || !firstName || !lastName || !company || !trade) {
      return NextResponse.json(
        { success: false, error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    const apiKey = process.env.AIRTABLE_API_KEY
    const baseId = process.env.AIRTABLE_BASE_ID

    // Vérifie si l'email existe déjà
    const checkUrl = `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}`
    const checkRes = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    const checkData = await checkRes.json()

    if (checkData.records?.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Un compte existe déjà avec cet email' },
        { status: 409 }
      )
    }

    console.log('[REGISTER] Tentative:', email)

    const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const subscriptionStart = new Date().toISOString().split('T')[0]

    // Crée l'utilisateur dans Users
    const userRes = await fetch(`https://api.airtable.com/v0/${baseId}/Users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          'Email': email,
          'First Name': firstName || '',
          'Last Name': lastName || '',
          'Company Name': company || '',
          'Role': 'Artisan',
          'Plan': 'Performance',
          'Statut': 'Trial',
          'Trial_end_date': trialEndDate,
          'Subscription_start': subscriptionStart,
        },
      }),
    })

    const userData = await userRes.json()

    if (!userRes.ok) {
      console.error('[REGISTER] Airtable error:', JSON.stringify(userData))
      return NextResponse.json(
        { error: 'Erreur création compte' },
        { status: 500 }
      )
    }

    console.log('[REGISTER] User créé:', userData?.id)

    // Crée la configuration artisan
    const configRes = await fetch(`https://api.airtable.com/v0/${baseId}/Artisan_config`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          'devis_prefixe': 'DEV',
          'devis_validite': 90,
          'devis_tva_defaut': 10,
        },
      }),
    })

    const configData = await configRes.json()

    if (!configRes.ok) {
      console.error('[REGISTER] Airtable error:', JSON.stringify(configData))
      return NextResponse.json(
        { error: 'Erreur création compte' },
        { status: 500 }
      )
    }

    console.log('[REGISTER] Config créée:', configData?.id)

    // Lie la configuration au compte utilisateur
    const linkRes = await fetch(`https://api.airtable.com/v0/${baseId}/Users/${userData.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          'Artisan ID': configData.id,
        },
      }),
    })

    const linkData = await linkRes.json()

    if (!linkRes.ok) {
      console.error('[REGISTER] Airtable error:', JSON.stringify(linkData))
      return NextResponse.json(
        { error: 'Erreur création compte' },
        { status: 500 }
      )
    }

    // Génère le lien magique
    const magicToken = await createMagicToken(email)
    const baseUrl = process.env.NEXTAUTH_URL || 'https://kadria-beta.vercel.app'
    const magicUrl = `${baseUrl}/api/auth/verify?token=${magicToken}`

    // Email de bienvenue
    await resend.emails.send({
      from: 'Kadria <connexion@kadria.fr>',
      to: email,
      subject: 'Bienvenue sur Kadria — Accédez à votre espace',
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

    // Email de notification interne
    await resend.emails.send({
      from: 'Kadria <notifications@kadria.fr>',
      to: 'contact@kadria.fr',
      subject: `Nouvelle inscription : ${company}`,
      html: `
        <div style="font-family:system-ui;max-width:500px;margin:0 auto;padding:20px;">
          <h2>Nouvelle inscription Kadria</h2>
          <p><strong>Entreprise :</strong> ${company}</p>
          <p><strong>Nom :</strong> ${firstName} ${lastName}</p>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Téléphone :</strong> ${phone || '-'}</p>
          <p><strong>Métier :</strong> ${trade}</p>
          <p><strong>User record :</strong> ${userData.id}</p>
          <p><strong>Artisan_config record :</strong> ${configData.id}</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[REGISTER] Error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}


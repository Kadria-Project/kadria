import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createMagicToken } from '@/src/lib/auth-utils'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateArtisanId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return `ART_${id}`
}

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

    const artisanId = generateArtisanId()

    // Crée l'utilisateur dans Users
    await fetch(`https://api.airtable.com/v0/${baseId}/Users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          Email: email,
          'Artisan ID': artisanId,
          'Company Name': company,
          Active: true,
          Plan: 'Trial',
        },
      }),
    })

    // Crée la configuration artisan
    await fetch(`https://api.airtable.com/v0/${baseId}/Artisan_config`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          'Artisan ID': artisanId,
          'Company Name': company,
          'Primary Trade': trade,
          Phone: phone || '',
          Email: email,
          'Primary Color': '#22c55e',
          'Secondary Color': '#09090b',
          'Welcome Name': company,
          'Welcome Message': '',
          Active: true,
        },
      }),
    })

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
          <p style="color:#a1a1aa;font-size:13px;margin:24px 0 0;line-height:1.6;">
            Votre identifiant artisan : <strong style="color:white">${artisanId}</strong>
          </p>
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
          <p><strong>Artisan ID :</strong> ${artisanId}</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, artisanId })
  } catch (error) {
    console.error('[REGISTER] Error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getArtisanByEmail } from '@/src/lib/airtable'
import { createMagicToken } from '@/src/lib/auth-utils'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }
  return new Resend(apiKey)
}

export async function POST(request: Request) {
  try {
    const resend = getResendClient()
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email requis' },
        { status: 400 }
      )
    }

    // Vérifie que l'email existe dans Airtable
    const artisan = await getArtisanByEmail(email)
    if (!artisan) {
      // On renvoie success pour ne pas révéler si l'email existe
      return NextResponse.json({ success: true })
    }

    if (!artisan.active) {
      return NextResponse.json({ success: true })
    }

    // Génère le token magique
    const magicToken = await createMagicToken(email)
    const baseUrl = process.env.NEXTAUTH_URL || 'https://kadria-beta.vercel.app'
    const magicUrl = `${baseUrl}/api/auth/verify?token=${magicToken}`

    // Envoie l'email
    const { error } = await resend.emails.send({
      from: 'Kadria <contact@kadria.fr>',
      to: email,
      subject: 'Votre lien de connexion Kadria',
      html: `
        <div style="font-family:system-ui;max-width:500px;margin:0 auto;padding:40px 20px;background:#09090b;color:white;">
          <h1 style="margin:0 0 24px;">
            <span style="color:#22c55e">K</span><span style="color:white">adria</span>
          </h1>
          <h2 style="color:white;font-size:20px;margin:0 0 12px;font-weight:600;">
            Votre lien de connexion
          </h2>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 24px;">
            Bonjour ${artisan.companyName || ''}, cliquez sur le bouton
            ci-dessous pour accéder à votre espace Kadria Pro.<br/>
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

    if (error) {
      console.error('[AUTH] Resend error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur envoi email' },
        { status: 500 }
      )
    }

    // Met à jour la date de dernière connexion
    const apiKey = process.env.AIRTABLE_API_KEY
    const baseId = process.env.AIRTABLE_BASE_ID
    await fetch(`https://api.airtable.com/v0/${baseId}/Users/${artisan.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: { 'Last_login': new Date().toISOString() },
      }),
    })

    console.info('[AUTH] Magic link sent')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[AUTH] Error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

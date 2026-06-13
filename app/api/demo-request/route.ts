import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createCommercialLead } from '@/src/lib/airtable'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[DEMO REQUEST] body:', JSON.stringify(body))
    console.log('[DEMO REQUEST] quizResult:', JSON.stringify(body.quizResult))
    const { nom, prenom, email, phone, societe, trade, website, preferredSlot, quizResult } = body

    const fullName = `${prenom || ''} ${nom || ''}`.trim()
    const offer = quizResult?.planLabel || ''
    const answers = quizResult?.answersText || ''

    // Email de notification interne
    await resend.emails.send({
      from: 'Kadria <contact@kadria.fr>',
      to: 'contact@kadria.fr',
      subject: `Nouvelle demande de démo — ${fullName || 'Inconnu'}`,
      html: `
        <div style="font-family:system-ui;max-width:500px;margin:0 auto;padding:40px 20px;background:#09090b;color:white;">
          <h1 style="margin:0 0 24px;">
            <span style="color:#22c55e">K</span><span style="color:white">adria</span>
          </h1>
          <h2 style="color:white;font-size:20px;margin:0 0 12px;font-weight:600;">
            Nouvelle demande de démo
          </h2>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Nom :</strong> ${fullName}</p>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Email :</strong> ${email || ''}</p>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Téléphone :</strong> ${phone || ''}</p>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Société :</strong> ${societe || ''}</p>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Métier :</strong> ${trade || ''}</p>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Site web :</strong> ${website || ''}</p>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Créneau préféré :</strong> ${preferredSlot || ''}</p>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Offre recommandée :</strong> ${offer}</p>
          <pre style="color:#71717a;font-size:12px;white-space:pre-wrap;background:#18181b;border-radius:10px;padding:14px;margin-top:16px;">${answers}</pre>
        </div>
      `,
    })

    // Email de confirmation au prospect
    if (email) {
      await resend.emails.send({
        from: 'Kadria <contact@kadria.fr>',
        to: email,
        subject: 'Votre demande de démo Kadria a bien été reçue',
        html: `
          <div style="font-family:system-ui;max-width:500px;margin:0 auto;padding:40px 20px;background:#09090b;color:white;">
            <h1 style="margin:0 0 24px;">
              <span style="color:#22c55e">K</span><span style="color:white">adria</span>
            </h1>
            <h2 style="color:white;font-size:20px;margin:0 0 12px;font-weight:600;">
              Merci pour votre demande !
            </h2>
            <p style="color:#a1a1aa;line-height:1.6;margin:0 0 24px;">
              Bonjour ${prenom || ''}, nous avons bien reçu votre demande de démonstration.
              Notre équipe va vous contacter très rapidement pour planifier un créneau.
            </p>
            <p style="color:#52525b;font-size:12px;margin:24px 0 0;line-height:1.6;">
              À très vite,<br/>L'équipe Kadria
            </p>
          </div>
        `,
      })
    }

    await createCommercialLead({
      nom: nom || '',
      prenom: prenom || '',
      societe: societe || '',
      trade: trade || '',
      offer,
      answers,
      email: email || '',
      phone: phone || '',
      preferredSlot: preferredSlot || '',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DEMO_REQUEST] Error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}

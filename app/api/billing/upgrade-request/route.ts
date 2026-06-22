import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSession } from '@/src/lib/auth-utils'
import { getPlanLabel, normalizePlan } from '@/src/lib/plans'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { targetPlan } = await request.json()
    const currentPlan = normalizePlan(session.plan)
    const requestedPlan = normalizePlan(targetPlan)

    const resend = getResendClient()
    if (resend) {
      await resend.emails.send({
        from: 'Kadria <contact@kadria.fr>',
        to: 'contact@kadria.fr',
        subject: `Demande de changement d'offre — ${session.companyName || session.email}`,
        html: `
          <div style="font-family:system-ui;max-width:500px;margin:0 auto;padding:40px 20px;background:#09090b;color:white;">
            <h1 style="margin:0 0 24px;">
              <span style="color:#22c55e">K</span><span style="color:white">adria</span>
            </h1>
            <h2 style="color:white;font-size:20px;margin:0 0 12px;font-weight:600;">
              Demande de changement d'offre
            </h2>
            <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Artisan :</strong> ${session.companyName || ''}</p>
            <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Email :</strong> ${session.email}</p>
            <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Offre actuelle :</strong> ${getPlanLabel(currentPlan)}</p>
            <p style="color:#a1a1aa;line-height:1.6;margin:0 0 8px;"><strong style="color:white">Offre demandée :</strong> ${getPlanLabel(requestedPlan)}</p>
          </div>
        `,
      })
    } else {
      console.info('[UPGRADE REQUEST] Resend non configuré, demande non envoyée par e-mail', {
        artisanId: session.artisanId,
        currentPlan,
        requestedPlan,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[UPGRADE REQUEST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/src/lib/supabase/server'

type DemoAccessPayload = {
  firstName?: string
  lastName?: string
  companyName?: string
  trade?: string
  email?: string
  phone?: string
  website?: string
  monthlyRequestsVolume?: string
  currentTool?: string
  mainNeed?: string
  objective?: string
  message?: string
  consentContact?: boolean
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }

  return new Resend(apiKey)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as DemoAccessPayload | null
    if (!body) {
      return NextResponse.json({ success: false, error: 'Requete invalide' }, { status: 400 })
    }

    const payload = {
      firstName: normalizeText(body.firstName),
      lastName: normalizeText(body.lastName),
      companyName: normalizeText(body.companyName),
      trade: normalizeText(body.trade),
      email: normalizeText(body.email).toLowerCase(),
      phone: normalizeText(body.phone),
      website: normalizeText(body.website),
      monthlyRequestsVolume: normalizeText(body.monthlyRequestsVolume),
      currentTool: normalizeText(body.currentTool),
      mainNeed: normalizeText(body.mainNeed),
      objective: normalizeText(body.objective),
      message: normalizeText(body.message),
      consentContact: Boolean(body.consentContact),
    }

    if (!payload.firstName || !payload.lastName || !payload.companyName || !payload.trade || !payload.email || !payload.phone || !payload.objective) {
      return NextResponse.json(
        { success: false, error: 'Merci de renseigner les champs obligatoires.' },
        { status: 400 },
      )
    }

    if (!isValidEmail(payload.email)) {
      return NextResponse.json(
        { success: false, error: 'Adresse email invalide.' },
        { status: 400 },
      )
    }

    if (!payload.consentContact) {
      return NextResponse.json(
        { success: false, error: 'Le consentement de contact est requis.' },
        { status: 400 },
      )
    }

    const { error: insertError } = await supabaseAdmin
      .from('demo_access_requests')
      .insert({
        first_name: payload.firstName,
        last_name: payload.lastName,
        company_name: payload.companyName,
        email: payload.email,
        phone: payload.phone,
        trade: payload.trade,
        website: payload.website,
        monthly_requests_volume: payload.monthlyRequestsVolume,
        current_tool: payload.currentTool,
        main_need: payload.mainNeed,
        objective: payload.objective,
        message: payload.message,
        consent_contact: payload.consentContact,
        status: 'pending',
      })

    if (insertError) {
      console.error('[DEMO ACCESS REQUEST] Supabase error:', insertError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'enregistrement de la demande." },
        { status: 500 },
      )
    }

    const resend = getResendClient()
    if (resend) {
      try {
        const subjectName = `${payload.firstName} ${payload.lastName}`.trim()
        await resend.emails.send({
          from: 'Kadria <contact@kadria.fr>',
          to: 'contact@kadria.fr',
          subject: `Nouvelle demande d'acces demo - ${subjectName || payload.email}`,
          html: `
            <div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:32px 20px;background:#09090b;color:white;">
              <h1 style="margin:0 0 20px;">
                <span style="color:#22c55e">K</span><span style="color:white">adria</span>
              </h1>
              <h2 style="margin:0 0 16px;font-size:20px;">Nouvelle demande d'acces demo</h2>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Nom :</strong> ${escapeHtml(subjectName)}</p>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Entreprise :</strong> ${escapeHtml(payload.companyName)}</p>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Metier :</strong> ${escapeHtml(payload.trade)}</p>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Email :</strong> ${escapeHtml(payload.email)}</p>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Telephone :</strong> ${escapeHtml(payload.phone)}</p>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Site web :</strong> ${escapeHtml(payload.website || '-')}</p>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Volume mensuel :</strong> ${escapeHtml(payload.monthlyRequestsVolume || '-')}</p>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Outil actuel :</strong> ${escapeHtml(payload.currentTool || '-')}</p>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Besoin principal :</strong> ${escapeHtml(payload.mainNeed || '-')}</p>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Objectif :</strong> ${escapeHtml(payload.objective)}</p>
              <p style="margin:0 0 8px;color:#a1a1aa;"><strong style="color:white;">Consentement :</strong> ${payload.consentContact ? 'oui' : 'non'}</p>
              <div style="margin-top:16px;border-radius:12px;background:#18181b;padding:16px;color:#d4d4d8;white-space:pre-wrap;">${escapeHtml(payload.message || 'Aucun message')}</div>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('[DEMO ACCESS REQUEST] Resend error:', emailError)
      }
    } else {
      console.info('[DEMO ACCESS REQUEST] Resend non configure, demande stockee sans notification email')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DEMO ACCESS REQUEST] Error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 },
    )
  }
}

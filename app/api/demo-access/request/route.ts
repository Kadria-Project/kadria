import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
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
          text: renderBaseEmailText({
            preheader: `Nouvelle demande d'acces demo - ${subjectName || payload.email}`,
            title: 'Nouvelle demande d acces demo',
            intro: `Une nouvelle demande d'acces demo a ete soumise par ${subjectName || payload.email}.`,
            body: payload.message || 'Aucun message',
            summaryItems: [
              { label: 'Nom', value: subjectName || '-' },
              { label: 'Entreprise', value: payload.companyName },
              { label: 'Metier', value: payload.trade },
              { label: 'Email', value: payload.email },
              { label: 'Telephone', value: payload.phone },
              { label: 'Site web', value: payload.website || '-' },
              { label: 'Volume mensuel', value: payload.monthlyRequestsVolume || '-' },
              { label: 'Outil actuel', value: payload.currentTool || '-' },
              { label: 'Besoin principal', value: payload.mainNeed || '-' },
              { label: 'Objectif', value: payload.objective },
              { label: 'Consentement', value: payload.consentContact ? 'oui' : 'non' },
            ],
            footerNote: 'Kadria aide les artisans a qualifier, suivre et securiser leurs demandes clients.',
          }),
          html: renderBaseEmail({
            preheader: `Nouvelle demande d'acces demo - ${subjectName || payload.email}`,
            title: 'Nouvelle demande d acces demo',
            intro: `Une nouvelle demande d'acces demo a ete soumise par ${subjectName || payload.email}.`,
            body: payload.message || 'Aucun message',
            summaryItems: [
              { label: 'Nom', value: subjectName || '-' },
              { label: 'Entreprise', value: payload.companyName },
              { label: 'Metier', value: payload.trade },
              { label: 'Email', value: payload.email },
              { label: 'Telephone', value: payload.phone },
              { label: 'Site web', value: payload.website || '-' },
              { label: 'Volume mensuel', value: payload.monthlyRequestsVolume || '-' },
              { label: 'Outil actuel', value: payload.currentTool || '-' },
              { label: 'Besoin principal', value: payload.mainNeed || '-' },
              { label: 'Objectif', value: payload.objective },
              { label: 'Consentement', value: payload.consentContact ? 'oui' : 'non' },
            ],
            footerNote: 'Kadria aide les artisans a qualifier, suivre et securiser leurs demandes clients.',
          }),
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

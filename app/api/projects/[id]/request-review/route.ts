import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { TABLES, getArtisanConfig } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { resolveDevisEmailBranding } from '@/src/lib/devis-email-branding'
import { renderBaseEmail } from '@/src/lib/email/templates/base-email'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

async function createActivityLog(projectId: string, action: string, description: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[GOOGLE REVIEW REQUEST] Activity insert error:', JSON.stringify(error, null, 2))
  }
}

async function getAuthorizedProject(id: string, artisanId: string) {
  const direct = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, artisan_id, client_name, client_first_name, client_email, project_type, trade')
    .eq('id', id)
    .limit(1)
    .maybeSingle()

  if (direct.error) throw direct.error
  if (direct.data) {
    return direct.data.artisan_id === artisanId ? direct.data : 'forbidden'
  }

  const legacy = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, artisan_id, client_name, client_first_name, client_email, project_type, trade')
    .eq('record_id', id)
    .limit(1)
    .maybeSingle()

  if (legacy.error) throw legacy.error
  if (!legacy.data) return null
  return legacy.data.artisan_id === artisanId ? legacy.data : 'forbidden'
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let projectIdForLog: string | null = null
  let clientEmailForLog = ''

  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    const { id } = await params
    const project = await getAuthorizedProject(id, session.artisanId)

    if (project === 'forbidden') {
      return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
    }

    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    projectIdForLog = String(project.id)
    const clientEmail = String(project.client_email || '').trim()
    clientEmailForLog = clientEmail

    if (!clientEmail) {
      return NextResponse.json({ success: false, error: 'Email client manquant.' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: 'Configuration e-mail manquante' }, { status: 500 })
    }

    const config = await getArtisanConfig(session.artisanId)
    const googleReviewUrl = String(config?.googleReviewUrl || '').trim()
    if (!googleReviewUrl) {
      return NextResponse.json({ success: false, error: "URL d'avis Google non configuree." }, { status: 400 })
    }

    if (!isValidHttpUrl(googleReviewUrl)) {
      return NextResponse.json({ success: false, error: "URL d'avis Google invalide." }, { status: 400 })
    }

    const businessName =
      config?.raisonSociale ||
      config?.companyName ||
      session.companyName ||
      'Votre artisan'
    const clientFirstName = String(project.client_first_name || '').trim()
    const clientName = String(project.client_name || '').trim()
    const recipientLabel = clientFirstName || clientName || 'Bonjour'
    const greeting = clientFirstName || clientName ? `Bonjour ${recipientLabel},` : 'Bonjour,'
    const projectLabel = String(project.project_type || project.trade || 'votre projet').trim()

    const emailBranding = resolveDevisEmailBranding({
      plan: session.plan,
      whiteLabelEnabled: config?.whiteLabelEnabled,
      widgetBrandName: config?.widgetBrandName,
      widgetBrandLogoUrl: config?.widgetBrandLogoUrl,
      logoUrl: config?.logoUrl,
      companyName: config?.companyName,
      raisonSociale: config?.raisonSociale,
      primaryColor: config?.primaryColor,
      secondaryColor: config?.secondaryColor,
    })
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr'
    const fromName = emailBranding.isWhiteLabelActive
      ? `${emailBranding.brandName} via Kadria`
      : 'Kadria'
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: `"${fromName.replace(/["\r\n]/g, '')}" <${fromEmail}>`,
      to: clientEmail,
      subject: 'Votre avis compte pour nous',
      text: `${greeting}\n\nMerci pour votre confiance.\n\nSi vous etes satisfait de l'intervention ou de l'accompagnement pour ${projectLabel}, vous pouvez laisser un avis ici :\n\n${googleReviewUrl}\n\nVotre retour aide ${businessName} a etre plus visible localement et a continuer d'ameliorer son service.\n\nMerci encore.\n\n${businessName}`,
      html: renderBaseEmail({
        preheader: 'Votre avis compte beaucoup',
        brand: emailBranding.brandName || 'Kadria',
        title: 'Votre avis compte beaucoup',
        intro: `${greeting}\n\nMerci pour votre confiance. Votre retour aide l'entreprise à valoriser son travail et à rassurer ses futurs clients.`,
        body: `Si vous êtes satisfait de l'intervention ou de l'accompagnement pour ${projectLabel}, vous pouvez laisser un avis via le lien ci-dessous.`,
        ctaLabel: 'Laisser un avis',
        ctaUrl: googleReviewUrl,
        artisanName: businessName,
        secondaryText: `Votre retour aide ${businessName} à être plus visible localement et à continuer d'améliorer son service.`,
        footerNote: emailBranding.isWhiteLabelActive
          ? emailBranding.poweredByLabel
          : 'Kadria aide les artisans à qualifier, suivre et sécuriser leurs demandes clients.',
        accentColor: emailBranding.ctaColor,
      }),
      headers: {
        'X-Entity-Ref-ID': `google-review-request-${project.id}`,
      },
    })

    if (result.error) {
      console.error('[GOOGLE REVIEW REQUEST] Resend error:', result.error)
      const resendMessage =
        typeof result.error.message === 'string' && result.error.message.trim()
          ? result.error.message
          : 'Erreur envoi e-mail'
      await createActivityLog(
        projectIdForLog,
        'GOOGLE_REVIEW_REQUEST_FAILED',
        `Echec demande avis Google - ${clientEmail} - ${resendMessage}`,
      )
      return NextResponse.json(
        { success: false, error: "Impossible d'envoyer la demande d'avis. Reessayez." },
        { status: 500 },
      )
    }

    const sentAt = new Date().toISOString()
    await createActivityLog(
      projectIdForLog,
      'GOOGLE_REVIEW_REQUEST_SENT',
      `Demande avis Google envoyee - ${clientEmail}${result.data?.id ? ` - Resend ${result.data.id}` : ''}`,
    )

    return NextResponse.json({
      success: true,
      message: "Demande d'avis envoyee au client.",
      sent_at: sentAt,
      resend_id: result.data?.id || null,
    })
  } catch (error) {
    console.error('[GOOGLE REVIEW REQUEST]', error instanceof Error ? error.message : String(error))
    if (projectIdForLog) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
      await createActivityLog(
        projectIdForLog,
        'GOOGLE_REVIEW_REQUEST_FAILED',
        `Echec demande avis Google - ${clientEmailForLog || 'email inconnu'} - ${errorMessage}`,
      )
    }
    return NextResponse.json(
      { success: false, error: "Impossible d'envoyer la demande d'avis. Reessayez." },
      { status: 500 },
    )
  }
}

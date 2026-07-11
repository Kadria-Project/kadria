import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { TABLES, getArtisanConfig } from '@/src/lib/airtable'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { resolveDevisEmailBranding } from '@/src/lib/devis-email-branding'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { PermissionError } from '@/src/lib/team/access'

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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let projectIdForLog: string | null = null
  let clientEmailForLog = ''

  try {
    const { id } = await params
    const authResult = await authorizeProjectAccess({
      projectId: id,
      requiredPermission: 'projects.update',
      allowAppointmentAccess: true,
      select: 'id, client_name, client_first_name, client_email, project_type, trade',
    })

    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    const project = authResult.project
    projectIdForLog = authResult.projectId
    const clientEmail = String(project.client_email || '').trim()
    clientEmailForLog = clientEmail

    if (!clientEmail) {
      return NextResponse.json({ success: false, error: 'Email client manquant.' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: 'Configuration e-mail manquante' }, { status: 500 })
    }

    const config = await getArtisanConfig(authResult.session.artisanId)
    const googleReviewUrl = String(config?.googleReviewUrl || '').trim()
    if (!googleReviewUrl) {
      return NextResponse.json({ success: false, error: "URL d'avis Google non configurée." }, { status: 400 })
    }

    if (!isValidHttpUrl(googleReviewUrl)) {
      return NextResponse.json({ success: false, error: "URL d'avis Google invalide." }, { status: 400 })
    }

    const businessName =
      config?.raisonSociale ||
      config?.companyName ||
      authResult.session.companyName ||
      'Votre artisan'
    const clientFirstName = String(project.client_first_name || '').trim()
    const clientName = String(project.client_name || '').trim()
    const recipientLabel = clientFirstName || clientName || 'Bonjour'
    const greeting = clientFirstName || clientName ? `Bonjour ${recipientLabel},` : 'Bonjour,'
    const projectLabel = String(project.project_type || project.trade || 'votre projet').trim()

    const emailBranding = resolveDevisEmailBranding({
      plan: authResult.session.plan,
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
      text: renderBaseEmailText({
        preheader: 'Votre avis compte beaucoup',
        brand: emailBranding.brandName || 'Kadria',
        title: 'Votre avis compte beaucoup',
        intro: `${greeting}\n\nMerci pour votre confiance. Votre retour aide l'entreprise a valoriser son travail et a rassurer ses futurs clients.`,
        body: `Si vous etes satisfait de l'intervention ou de l'accompagnement pour ${projectLabel}, vous pouvez laisser un avis via le lien ci-dessous.`,
        ctaLabel: 'Laisser un avis',
        ctaUrl: googleReviewUrl,
        artisanName: businessName,
        summaryItems: [
          { label: 'Projet', value: projectLabel },
          { label: 'Entreprise', value: businessName },
        ],
        secondaryText: `Votre retour aide ${businessName} a etre plus visible localement et a continuer d'ameliorer son service.`,
        footerNote: emailBranding.isWhiteLabelActive
          ? emailBranding.poweredByLabel
          : 'Kadria aide les artisans a qualifier, suivre et securiser leurs demandes clients.',
        accentColor: emailBranding.ctaColor,
      }),
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
        'X-Entity-Ref-ID': `google-review-request-${authResult.projectId}`,
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
        { success: false, error: "Impossible d'envoyer la demande d'avis. Réessayez." },
        { status: 500 },
      )
    }

    const sentAt = new Date().toISOString()
    await createActivityLog(
      projectIdForLog,
      'GOOGLE_REVIEW_REQUEST_SENT',
      `Demande avis Google envoyée - ${clientEmail}${result.data?.id ? ` - Resend ${result.data.id}` : ''}`,
    )

    return NextResponse.json({
      success: true,
      message: "Demande d'avis envoyée au client.",
      sent_at: sentAt,
      resend_id: result.data?.id || null,
    })
  } catch (error) {
    const permissionError = error as PermissionError
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status })
    }

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
      { success: false, error: "Impossible d'envoyer la demande d'avis. Réessayez." },
      { status: 500 },
    )
  }
}

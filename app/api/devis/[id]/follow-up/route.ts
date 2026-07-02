import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import { TABLES, getArtisanConfig, getDevisById, resolveProjectId, updateDevis } from '@/src/lib/airtable'
import { notifyArtisanQuoteFollowedUp } from '@/src/lib/artisan-notifications'
import { requireFeatureAccess } from '@/src/lib/auth-utils'
import { getPublicDevisUrl } from '@/src/lib/base-url'
import { generateQuoteFollowupEmailForStage, getQuoteFollowupState } from '@/src/lib/quote-followup'
import { resolveDevisEmailBranding } from '@/src/lib/devis-email-branding'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function isValidDevisToken(token: string | undefined): token is string {
  return !!token && !token.includes('undefined') && /^[0-9a-f-]{36}$/i.test(token)
}

async function createActivityLogSupabase(projectId: string, action: string, description: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[DEVIS FOLLOW-UP ACTIVITY] Insert error:', JSON.stringify(error, null, 2))
  }
}

function buildFollowUpSentDescription(stage: string, devisNumber: string) {
  if (stage === 'j2_unopened') return `Relance J+2 envoyee - devis ${devisNumber} non ouvert`
  if (stage === 'j5_opened_no_decision') return `Relance J+5 envoyee - devis ${devisNumber} ouvert sans reponse`
  if (stage === 'j10_final') return `Relance finale J+10 envoyee - devis ${devisNumber}`
  return `Relance devis envoyee - ${devisNumber}`
}

function buildFollowUpFailedDescription(stage: string, devisNumber: string, detail: string) {
  const normalizedDetail = detail.trim() || 'Erreur inconnue'
  if (stage === 'j2_unopened') return `Echec relance J+2 - devis ${devisNumber} non ouvert - ${normalizedDetail}`
  if (stage === 'j5_opened_no_decision') return `Echec relance J+5 - devis ${devisNumber} ouvert sans reponse - ${normalizedDetail}`
  if (stage === 'j10_final') return `Echec relance finale J+10 - devis ${devisNumber} - ${normalizedDetail}`
  return `Echec relance devis - ${devisNumber} - ${normalizedDetail}`
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let projectIdForLog: string | null = null
  let devisNumberForLog = ''
  let stageForLog = 'none'

  try {
    const access = await requireFeatureAccess('quoteGeneration')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const { id } = await params
    let devis = await getDevisById(id)
    if (!devis) {
      return NextResponse.json({ success: false, error: 'Devis introuvable' }, { status: 404 })
    }
    devisNumberForLog = devis.devisNumber || id

    if (devis.artisanId !== access.session.artisanId) {
      return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
    }

    const followupState = getQuoteFollowupState(devis)
    stageForLog = followupState.stage
    if (!followupState.canFollowUp) {
      return NextResponse.json({ success: false, error: followupState.reason }, { status: 400 })
    }

    if (!devis.clientEmail) {
      return NextResponse.json({ success: false, error: 'Email client manquant' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: 'Configuration e-mail manquante' }, { status: 500 })
    }

    const project = await resolveProjectId(devis.projectId)
    if (!project || project.artisanId !== access.session.artisanId) {
      return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
    }
    projectIdForLog = project.id

    if (!isValidDevisToken(devis.token)) {
      try {
        devis = await updateDevis(devis.id, { token: randomUUID() })
      } catch (error) {
        console.error('[DEVIS FOLLOW-UP] Token update failed:', error instanceof Error ? error.message : String(error))
        return NextResponse.json({ success: false, error: 'Invalid devis token' }, { status: 400 })
      }
    }

    if (!isValidDevisToken(devis.token)) {
      return NextResponse.json({ success: false, error: 'Invalid devis token' }, { status: 400 })
    }

    const { data: projectRow, error: projectError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('client_first_name, project_type, trade')
      .eq('id', project.id)
      .limit(1)
      .maybeSingle()

    if (projectError) {
      throw projectError
    }

    const config = await getArtisanConfig(access.session.artisanId)
    const artisanName = config?.raisonSociale || config?.companyName || access.session.companyName || 'Votre artisan'
    const firstName =
      (projectRow?.client_first_name as string) ||
      devis.clientName.split(' ')[0] ||
      ''
    const projectType =
      (projectRow?.project_type as string) ||
      (projectRow?.trade as string) ||
      devis.objet ||
      'votre projet'

    const email = generateQuoteFollowupEmailForStage(followupState.stage, {
      firstName,
      quoteSentAt: devis.quoteSentAt || devis.dateEmission,
      projectType,
      artisanName,
    })
    const devisUrl = getPublicDevisUrl(devis.token)
    const resend = new Resend(process.env.RESEND_API_KEY)

    const emailBranding = resolveDevisEmailBranding({
      plan: access.session.plan,
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
    const emailTitle =
      followupState.stage === 'j10_final'
        ? 'Dernier rappel concernant votre devis'
        : 'Votre devis est toujours disponible'

    const emailTemplate = {
      preheader: email.subject,
      brand: emailBranding.brandName || 'Kadria',
      title: emailTitle,
      body: email.text,
      ctaLabel: 'Consulter le devis',
      ctaUrl: devisUrl,
      summaryItems: [
        { label: 'Reference', value: devis.devisNumber },
        { label: 'Projet', value: projectType },
      ],
      artisanName,
      footerNote: emailBranding.isWhiteLabelActive
        ? emailBranding.poweredByLabel
        : 'Kadria aide les artisans a qualifier, suivre et securiser leurs demandes clients.',
      accentColor: emailBranding.ctaColor,
    }

    const result = await resend.emails.send({
      from: `"${fromName.replace(/["\r\n]/g, '')}" <${fromEmail}>`,
      to: devis.clientEmail,
      subject: email.subject,
      text: renderBaseEmailText(emailTemplate),
      html: renderBaseEmail(emailTemplate),
      attachments: devis.pdfUrl
        ? [{ filename: `${devis.devisNumber}.pdf`, path: devis.pdfUrl }]
        : undefined,
      headers: {
        'X-Entity-Ref-ID': `follow-up-${id}`,
      },
    })

    if (result.error) {
      console.error('[DEVIS FOLLOW-UP] Resend error:', result.error)
      const resendMessage =
        typeof result.error.message === 'string' && result.error.message.trim()
          ? result.error.message
          : 'Erreur envoi e-mail'
      await createActivityLogSupabase(
        project.id,
        'DEVIS_FOLLOW_UP_FAILED',
        buildFollowUpFailedDescription(followupState.stage, devis.devisNumber, resendMessage),
      )
      return NextResponse.json({ success: false, error: "Impossible d'envoyer la relance. Reessayez." }, { status: 500 })
    }

    const now = new Date().toISOString()

    await updateDevis(id, {
      lastFollowUpAt: now,
      followUpCount: (devis.followUpCount || 0) + 1,
    })

    await createActivityLogSupabase(
      project.id,
      'DEVIS_FOLLOW_UP_SENT',
      buildFollowUpSentDescription(followupState.stage, devis.devisNumber),
    )

    await notifyArtisanQuoteFollowedUp({
      artisanId: access.session.artisanId,
      projectId: project.id,
      devisNumber: devis.devisNumber,
      clientName: devis.clientName,
      stage: followupState.stage as 'j2_unopened' | 'j5_opened_no_decision' | 'j10_final' | 'none',
    })

    return NextResponse.json({
      success: true,
      message: 'Relance envoyee',
      sent_at: now,
      resend_id: result.data?.id || null,
    })
  } catch (error) {
    console.error('[DEVIS FOLLOW-UP]', error instanceof Error ? error.message : String(error))
    if (projectIdForLog) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
      await createActivityLogSupabase(
        projectIdForLog,
        'DEVIS_FOLLOW_UP_FAILED',
        buildFollowUpFailedDescription(stageForLog, devisNumberForLog || 'inconnu', errorMessage),
      )
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

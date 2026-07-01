import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import { TABLES, getArtisanConfig, getDevisById, resolveProjectId, updateDevis } from '@/src/lib/airtable'
import { notifyArtisanQuoteFollowedUp } from '@/src/lib/artisan-notifications'
import { requireFeatureAccess } from '@/src/lib/auth-utils'
import { getPublicDevisUrl } from '@/src/lib/base-url'
import { generateQuoteFollowupEmailForStage, getQuoteFollowupState } from '@/src/lib/quote-followup'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { resolveDevisEmailBranding, escapeHtml } from '@/src/lib/devis-email-branding'

function toHtml(text: string) {
  return text
    .split('\n\n')
    .map((paragraph) => `<p style="margin:0 0 14px;line-height:1.6;color:#374151;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

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
    const ctaTextColor = emailBranding.isWhiteLabelActive ? '#ffffff' : '#09090b'
    const footerHtml = emailBranding.isWhiteLabelActive
      ? `<p style="margin:22px 0 0;font-size:11px;color:#9ca3af;text-align:center;">${escapeHtml(emailBranding.poweredByLabel)}</p>`
      : ''

    const result = await resend.emails.send({
      from: `"${fromName.replace(/["\r\n]/g, '')}" <${fromEmail}>`,
      to: devis.clientEmail,
      subject: email.subject,
      text: `${email.text}\n\nLien du devis : ${devisUrl}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px;">
            <div style="margin-bottom:20px;">${emailBranding.headerHtml}</div>
            ${toHtml(email.text)}
            <p style="margin:22px 0 0;">
              <a href="${devisUrl}" style="display:inline-block;background:${emailBranding.ctaColor};color:${ctaTextColor};text-decoration:none;font-weight:700;border-radius:10px;padding:12px 18px;">
                Voir le devis
              </a>
            </p>
            ${footerHtml}
          </div>
        </div>
      `,
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

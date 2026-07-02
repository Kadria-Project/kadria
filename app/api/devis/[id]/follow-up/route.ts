import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import { TABLES, getArtisanConfig, getDevisById, resolveProjectId, updateDevis } from '@/src/lib/airtable'
import { notifyArtisanQuoteFollowedUp } from '@/src/lib/artisan-notifications'
import { requireFeatureAccess } from '@/src/lib/auth-utils'
import { getPublicDevisUrl } from '@/src/lib/base-url'
import { generateQuoteFollowupEmailForStage, getQuoteFollowupState } from '@/src/lib/quote-followup'
import { getProjectDisplayTitle } from '@/src/lib/project-detail/project-headline'
import { resolveDevisEmailBranding } from '@/src/lib/devis-email-branding'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function isValidDevisToken(token: string | undefined): token is string {
  return !!token && !token.includes('undefined') && /^[0-9a-f-]{36}$/i.test(token)
}

// Rend une erreur exploitable en log, quel que soit son type (Error natif,
// objet d'erreur Supabase/Resend en plain object, string, etc.). Evite le
// classique "console.error('[X]', error)" qui affiche "[object Object]"
// pour les erreurs qui ne sont pas des instances de Error.
function serializeErrorForLog(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack.split('\n').slice(0, 5).join('\n')}` : ''}`
  }
  if (typeof error === 'string') return error
  try {
    const json = JSON.stringify(error, null, 2)
    if (json && json !== '{}') return json
  } catch {
    // ignore, fallback below
  }
  try {
    return String(error)
  } catch {
    return 'Erreur non serialisable'
  }
}

async function createActivityLogSupabase(projectId: string, action: string, description: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[DEVIS FOLLOW-UP ACTIVITY] Insert error:', serializeErrorForLog(error), '| projectId:', projectId)
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
    console.log('[DEVIS FOLLOW-UP] step: session-ok')

    const { id } = await params
    let devis = await getDevisById(id)
    if (!devis) {
      return NextResponse.json({ success: false, error: 'Devis introuvable' }, { status: 404 })
    }
    devisNumberForLog = devis.devisNumber || id
    console.log('[DEVIS FOLLOW-UP] step: devis-loaded', '| devisId:', devisNumberForLog)

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
    console.log('[DEVIS FOLLOW-UP] step: project-loaded', '| projectId:', projectIdForLog)

    if (!isValidDevisToken(devis.token)) {
      try {
        devis = await updateDevis(devis.id, { token: randomUUID() })
      } catch (error) {
        console.error('[DEVIS FOLLOW-UP] Token update failed:', serializeErrorForLog(error))
        return NextResponse.json({ success: false, error: 'Invalid devis token' }, { status: 400 })
      }
    }

    if (!isValidDevisToken(devis.token)) {
      return NextResponse.json({ success: false, error: 'Invalid devis token' }, { status: 400 })
    }

    const { data: projectRow, error: projectError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('client_first_name, project_type, trade, ai_summary, project_title')
      .eq('id', project.id)
      .limit(1)
      .maybeSingle()

    if (projectError) {
      throw projectError
    }

    const config = await getArtisanConfig(access.session.artisanId)
    console.log('[DEVIS FOLLOW-UP] step: artisan-config-loaded')
    const artisanName = config?.raisonSociale || config?.companyName || access.session.companyName || 'Votre artisan'
    const firstName =
      (projectRow?.client_first_name as string) ||
      devis.clientName.split(' ')[0] ||
      ''
    // Titre complet du projet (ex : "Installation neuve d'un WC suspendu"),
    // et non le seul type/service court (ex : "Installation") — meme source
    // de verite que la fiche projet et la page devis publique.
    const projectType = getProjectDisplayTitle(
      {
        projectTitle: projectRow?.project_title,
        projectType: projectRow?.project_type,
        trade: projectRow?.trade,
        aiSummary: projectRow?.ai_summary,
      },
      devis.objet || (projectRow?.project_type as string) || (projectRow?.trade as string) || 'votre projet',
    )

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

    const resendFrom = `"${fromName.replace(/["\r\n]/g, '')}" <${fromEmail}>`
    const resendTo = devis.clientEmail
    const resendSubject = email.subject
    const resendHtml = renderBaseEmail(emailTemplate)
    const resendText = renderBaseEmailText(emailTemplate)

    // Garde-fou avant l'appel Resend : un payload invalide (destinataire,
    // expediteur, sujet ou corps vide) doit produire une erreur claire et
    // loggable plutot qu'un echec Resend opaque ou un envoi vide.
    if (!resendTo || !resendFrom || !resendSubject || !resendHtml || !resendText) {
      console.error('[DEVIS FOLLOW-UP] Payload Resend invalide', {
        devisId: id,
        artisanId: access.session.artisanId,
        hasTo: Boolean(resendTo),
        hasFrom: Boolean(resendFrom),
        hasSubject: Boolean(resendSubject),
        hasHtml: Boolean(resendHtml),
        hasText: Boolean(resendText),
      })
      return NextResponse.json({ success: false, error: "Impossible d'envoyer la relance pour le moment." }, { status: 500 })
    }
    console.log('[DEVIS FOLLOW-UP] step: email-built')

    console.log('[DEVIS FOLLOW-UP] step: resend-start')
    const result = await resend.emails.send({
      from: resendFrom,
      to: resendTo,
      subject: resendSubject,
      text: resendText,
      html: resendHtml,
      attachments: devis.pdfUrl
        ? [{ filename: `${devis.devisNumber}.pdf`, path: devis.pdfUrl }]
        : undefined,
      headers: {
        'X-Entity-Ref-ID': `follow-up-${id}`,
      },
    })

    if (result.error) {
      console.error('[DEVIS FOLLOW-UP] Resend error:', serializeErrorForLog(result.error), '| devisId:', id, '| artisanId:', access.session.artisanId)
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
    console.log('[DEVIS FOLLOW-UP] step: resend-success')

    const now = new Date().toISOString()

    await updateDevis(id, {
      lastFollowUpAt: now,
      followUpCount: (devis.followUpCount || 0) + 1,
    })

    console.log('[DEVIS FOLLOW-UP] step: activity-log-start')
    await createActivityLogSupabase(
      project.id,
      'DEVIS_FOLLOW_UP_SENT',
      buildFollowUpSentDescription(followupState.stage, devis.devisNumber),
    )
    console.log('[DEVIS FOLLOW-UP] step: activity-log-success')

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
    console.error(
      '[DEVIS FOLLOW-UP]',
      serializeErrorForLog(error),
      '| devisId:', devisNumberForLog || 'inconnu',
      '| projectId:', projectIdForLog || 'inconnu',
      '| stage:', stageForLog,
    )
    if (projectIdForLog) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      try {
        await createActivityLogSupabase(
          projectIdForLog,
          'DEVIS_FOLLOW_UP_FAILED',
          buildFollowUpFailedDescription(stageForLog, devisNumberForLog || 'inconnu', errorMessage),
        )
      } catch (logError) {
        // Ne jamais laisser l'echec du logging masquer l'erreur d'origine
        // deja loggee et deja convertie en reponse 500 ci-dessous.
        console.error('[DEVIS FOLLOW-UP] Failed to log DEVIS_FOLLOW_UP_FAILED activity:', serializeErrorForLog(logError))
      }
    }
    return NextResponse.json(
      { success: false, error: "Impossible d'envoyer la relance pour le moment." },
      { status: 500 }
    )
  }
}

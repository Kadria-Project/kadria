import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { TABLES, getAllSentDevis, getArtisanConfig, resolveProjectId, updateDevis } from '@/src/lib/airtable'
import { notifyArtisanQuoteFollowedUp } from '@/src/lib/artisan-notifications'
import { getPublicDevisUrl } from '@/src/lib/base-url'
import { generateQuoteFollowupEmailForStage, getQuoteFollowupState } from '@/src/lib/quote-followup'
import { supabaseAdmin } from '@/src/lib/supabase/server'

// Route protegee, a appeler manuellement (ou par un futur scheduler externe une
// fois mis en place) -- aucun cron n'existe encore dans ce projet, donc cette
// route n'est jamais declenchee automatiquement par le serveur lui-meme.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.QUOTE_FOLLOWUP_ADMIN_SECRET
  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }
  const headerSecret = request.headers.get('x-admin-secret')
  const querySecret = new URL(request.url).searchParams.get('secret')
  return headerSecret === secret || querySecret === secret
}

function toHtml(text: string) {
  return text
    .split('\n\n')
    .map((paragraph) => `<p style="margin:0 0 14px;line-height:1.6;color:#374151;">${paragraph.replace(/\n/g, '<br>')}</p>`)
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
    console.error('[QUOTE FOLLOW-UPS ACTIVITY] Insert error:', JSON.stringify(error, null, 2))
  }
}

function stageDescription(stage: string, devisNumber: string): string {
  if (stage === 'j2_unopened') return `Relance J+2 envoyee - devis ${devisNumber} non ouvert`
  if (stage === 'j5_opened_no_decision') return `Relance J+5 envoyee - devis ${devisNumber} ouvert sans reponse`
  if (stage === 'j10_final') return `Relance finale J+10 envoyee - devis ${devisNumber}`
  return `Relance devis envoyee - ${devisNumber}`
}

function failedStageDescription(stage: string, devisNumber: string, detail: string): string {
  const normalizedDetail = detail.trim() || 'Erreur inconnue'
  if (stage === 'j2_unopened') return `Echec relance J+2 - devis ${devisNumber} non ouvert - ${normalizedDetail}`
  if (stage === 'j5_opened_no_decision') return `Echec relance J+5 - devis ${devisNumber} ouvert sans reponse - ${normalizedDetail}`
  if (stage === 'j10_final') return `Echec relance finale J+10 - devis ${devisNumber} - ${normalizedDetail}`
  return `Echec relance devis - ${devisNumber} - ${normalizedDetail}`
}

// Liste les devis eligibles a une relance automatique sans rien envoyer.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Non autorise' }, { status: 401 })
  }

  try {
    const allSent = await getAllSentDevis()
    const due = allSent
      .map((devis) => ({ devis, state: getQuoteFollowupState(devis) }))
      .filter(({ state }) => state.shouldAutoFollowUp)
      .map(({ devis, state }) => ({
        devisId: devis.id,
        devisNumber: devis.devisNumber,
        stage: state.stage,
        reason: state.reason,
      }))

    return NextResponse.json({ success: true, due, count: due.length })
  } catch (error) {
    console.error('[QUOTE FOLLOW-UPS GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

// Envoie reellement les relances dues. A declencher manuellement (ou par un
// futur scheduler externe securise) -- jamais par un cron interne non maitrise.
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Non autorise' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ success: false, error: 'Configuration e-mail manquante' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const results: Array<{ devisId: string; devisNumber: string; stage: string; status: 'sent' | 'skipped' | 'error'; detail: string }> = []

  try {
    const allSent = await getAllSentDevis()
    const due = allSent
      .map((devis) => ({ devis, state: getQuoteFollowupState(devis) }))
      .filter(({ state }) => state.shouldAutoFollowUp)

    for (const { devis, state } of due) {
      let projectIdForLog: string | null = null

      try {
        if (!devis.clientEmail) {
          results.push({ devisId: devis.id, devisNumber: devis.devisNumber, stage: state.stage, status: 'skipped', detail: 'Email client manquant' })
          continue
        }

        if (!isValidDevisToken(devis.token)) {
          results.push({ devisId: devis.id, devisNumber: devis.devisNumber, stage: state.stage, status: 'skipped', detail: 'Token devis invalide' })
          continue
        }

        const project = await resolveProjectId(devis.projectId)
        if (!project) {
          results.push({ devisId: devis.id, devisNumber: devis.devisNumber, stage: state.stage, status: 'skipped', detail: 'Projet introuvable' })
          continue
        }
        projectIdForLog = project.id

        const { data: projectRow } = await supabaseAdmin
          .from(TABLES.projects)
          .select('client_first_name, project_type, trade')
          .eq('id', project.id)
          .limit(1)
          .maybeSingle()

        const config = await getArtisanConfig(devis.artisanId)
        const artisanName = config?.raisonSociale || config?.companyName || 'Votre artisan'
        const firstName = (projectRow?.client_first_name as string) || devis.clientName.split(' ')[0] || ''
        const projectType = (projectRow?.project_type as string) || (projectRow?.trade as string) || devis.objet || 'votre projet'

        const email = generateQuoteFollowupEmailForStage(state.stage, {
          firstName,
          quoteSentAt: devis.quoteSentAt || devis.dateEmission,
          projectType,
          artisanName,
        })
        const devisUrl = getPublicDevisUrl(devis.token)

        const sendResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr',
          to: devis.clientEmail,
          subject: email.subject,
          text: `${email.text}\n\nLien du devis : ${devisUrl}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px;">
              <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px;">
                ${toHtml(email.text)}
                <p style="margin:22px 0 0;">
                  <a href="${devisUrl}" style="display:inline-block;background:#22c55e;color:#09090b;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 18px;">
                    Voir le devis
                  </a>
                </p>
              </div>
            </div>
          `,
          headers: { 'X-Entity-Ref-ID': `auto-follow-up-${devis.id}-${state.stage}` },
        })

        if (sendResult.error) {
          console.error('[QUOTE FOLLOW-UPS] Resend error:', sendResult.error)
          const resendMessage =
            typeof sendResult.error.message === 'string' && sendResult.error.message.trim()
              ? sendResult.error.message
              : 'Erreur envoi e-mail'
          await createActivityLogSupabase(
            project.id,
            'DEVIS_FOLLOW_UP_FAILED',
            failedStageDescription(state.stage, devis.devisNumber, resendMessage),
          )
          results.push({ devisId: devis.id, devisNumber: devis.devisNumber, stage: state.stage, status: 'error', detail: 'Erreur envoi e-mail' })
          continue
        }

        const now = new Date().toISOString()
        await updateDevis(devis.id, { lastFollowUpAt: now, followUpCount: (devis.followUpCount || 0) + 1 })
        await createActivityLogSupabase(project.id, 'DEVIS_FOLLOW_UP_SENT', stageDescription(state.stage, devis.devisNumber))
        await notifyArtisanQuoteFollowedUp({
          artisanId: devis.artisanId,
          projectId: project.id,
          devisNumber: devis.devisNumber,
          clientName: devis.clientName,
          stage: state.stage as 'j2_unopened' | 'j5_opened_no_decision' | 'j10_final' | 'none',
        })

        results.push({ devisId: devis.id, devisNumber: devis.devisNumber, stage: state.stage, status: 'sent', detail: 'OK' })
      } catch (innerError) {
        console.error('[QUOTE FOLLOW-UPS] Erreur sur un devis:', innerError instanceof Error ? innerError.message : String(innerError))
        const detail = innerError instanceof Error ? innerError.message : 'Erreur inconnue'
        if (projectIdForLog) {
          await createActivityLogSupabase(
            projectIdForLog,
            'DEVIS_FOLLOW_UP_FAILED',
            failedStageDescription(state.stage, devis.devisNumber, detail),
          )
        }
        results.push({
          devisId: devis.id,
          devisNumber: devis.devisNumber,
          stage: state.stage,
          status: 'error',
          detail,
        })
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results })
  } catch (error) {
    console.error('[QUOTE FOLLOW-UPS POST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

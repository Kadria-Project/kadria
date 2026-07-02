import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { TABLES, getAllSentDevis, getArtisanConfig, resolveProjectId, updateDevis } from '@/src/lib/airtable'
import { notifyArtisanQuoteFollowedUp } from '@/src/lib/artisan-notifications'
import { getPublicDevisUrl } from '@/src/lib/base-url'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { generateQuoteFollowupEmailForStage, getQuoteFollowupState } from '@/src/lib/quote-followup'
import { getProjectDisplayTitle } from '@/src/lib/project-detail/project-headline'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.QUOTE_FOLLOWUP_ADMIN_SECRET
  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }
  const headerSecret = request.headers.get('x-admin-secret')
  const querySecret = new URL(request.url).searchParams.get('secret')
  return headerSecret === secret || querySecret === secret
}

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
    console.error('[QUOTE FOLLOW-UPS ACTIVITY] Insert error:', serializeErrorForLog(error), '| projectId:', projectId)
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
    console.error('[QUOTE FOLLOW-UPS GET]', serializeErrorForLog(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

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
          .select('client_first_name, project_type, trade, ai_summary, description')
          .eq('id', project.id)
          .limit(1)
          .maybeSingle()

        const config = await getArtisanConfig(devis.artisanId)
        const artisanName = config?.raisonSociale || config?.companyName || 'Votre artisan'
        const firstName = (projectRow?.client_first_name as string) || devis.clientName.split(' ')[0] || ''
        // Titre complet du projet (ex : "Installation neuve d'un WC suspendu"),
        // et non le seul type/service court (ex : "Installation") — meme
        // source de verite que la fiche projet et la page devis publique.
        const projectType = getProjectDisplayTitle(
          {
            projectType: projectRow?.project_type,
            trade: projectRow?.trade,
            aiSummary: projectRow?.ai_summary,
            description: (projectRow?.description as string) || devis.objet,
          },
          devis.objet || (projectRow?.project_type as string) || (projectRow?.trade as string) || 'votre projet',
        )

        const email = generateQuoteFollowupEmailForStage(state.stage, {
          firstName,
          quoteSentAt: devis.quoteSentAt || devis.dateEmission,
          projectType,
          artisanName,
        })
        const devisUrl = getPublicDevisUrl(devis.token)
        const emailTitle =
          state.stage === 'j10_final'
            ? 'Dernier rappel concernant votre devis'
            : 'Votre devis est toujours disponible'

        const emailTemplate = {
          preheader: email.subject,
          title: emailTitle,
          body: email.text,
          ctaLabel: 'Consulter le devis',
          ctaUrl: devisUrl,
          summaryItems: [
            { label: 'Reference', value: devis.devisNumber },
            { label: 'Projet', value: projectType },
          ],
          artisanName,
        }

        const resendFrom = process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr'
        const resendTo = devis.clientEmail
        const resendSubject = email.subject
        const resendHtml = renderBaseEmail(emailTemplate)
        const resendText = renderBaseEmailText(emailTemplate)

        // Garde-fou avant l'appel Resend : un payload invalide doit produire
        // une erreur claire et loggable plutot qu'un echec Resend opaque.
        if (!resendTo || !resendFrom || !resendSubject || !resendHtml || !resendText) {
          console.error('[QUOTE FOLLOW-UPS] Payload Resend invalide', {
            devisId: devis.id,
            artisanId: devis.artisanId,
            hasTo: Boolean(resendTo),
            hasFrom: Boolean(resendFrom),
            hasSubject: Boolean(resendSubject),
            hasHtml: Boolean(resendHtml),
            hasText: Boolean(resendText),
          })
          await createActivityLogSupabase(
            project.id,
            'DEVIS_FOLLOW_UP_FAILED',
            failedStageDescription(state.stage, devis.devisNumber, 'Payload email invalide'),
          )
          results.push({ devisId: devis.id, devisNumber: devis.devisNumber, stage: state.stage, status: 'error', detail: 'Payload email invalide' })
          continue
        }

        const sendResult = await resend.emails.send({
          from: resendFrom,
          to: resendTo,
          subject: resendSubject,
          text: resendText,
          html: resendHtml,
          headers: { 'X-Entity-Ref-ID': `auto-follow-up-${devis.id}-${state.stage}` },
        })

        if (sendResult.error) {
          console.error('[QUOTE FOLLOW-UPS] Resend error:', serializeErrorForLog(sendResult.error), '| devisId:', devis.id, '| artisanId:', devis.artisanId)
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
        console.error(
          '[QUOTE FOLLOW-UPS] Erreur sur un devis:',
          serializeErrorForLog(innerError),
          '| devisId:', devis.id,
          '| artisanId:', devis.artisanId,
        )
        const detail = innerError instanceof Error ? innerError.message : 'Erreur inconnue'
        if (projectIdForLog) {
          try {
            await createActivityLogSupabase(
              projectIdForLog,
              'DEVIS_FOLLOW_UP_FAILED',
              failedStageDescription(state.stage, devis.devisNumber, detail),
            )
          } catch (logError) {
            console.error('[QUOTE FOLLOW-UPS] Failed to log DEVIS_FOLLOW_UP_FAILED activity:', serializeErrorForLog(logError))
          }
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
    console.error('[QUOTE FOLLOW-UPS POST]', serializeErrorForLog(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

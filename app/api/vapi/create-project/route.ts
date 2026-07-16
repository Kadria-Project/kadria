import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { randomBytes } from 'crypto'
import { TABLES } from '@/src/lib/airtable'
import { notifyArtisanQuotaReached } from '@/src/lib/artisan-notifications'
import { createProjectNotification } from '@/src/lib/notifications'
import { projectResponsibilityColumnExists, resolveDefaultProjectResponsible } from '@/src/lib/project-responsibility'
import { toSupabaseProjectInsert } from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { attachTenantIdToPayload, resolveTenantIdentity } from '@/src/lib/tenant-context'
import { canUseVapi, recordProjectCreatedUsage, recordVapiCallUsage } from '@/src/lib/usage/quotas'
import { sendOvhSms } from '@/src/lib/sms/ovh-sms'
import { getBaseUrl } from '@/src/lib/base-url'
import { sendClientProjectConfirmationEmailBestEffort } from '@/src/lib/email/client-project-confirmation'
import { createProjectWithCanonicalClient } from '@/src/lib/clients/project-client-dual-write'

const FALLBACK_ARTISAN_ID = 'Artisan_demo'

function maskPhone(value: string | undefined | null): string {
  if (!value) return ''
  const digits = String(value)
  if (digits.length <= 4) return '***'
  return `${digits.slice(0, 4)}***${digits.slice(-2)}`
}

function readArtisanMapping(): Record<string, string> {
  const raw = process.env.VAPI_ARTISAN_MAPPING_JSON
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
    return {}
  } catch {
    console.warn('[VAPI] VAPI_ARTISAN_MAPPING_JSON invalide - ignorée')
    return {}
  }
}

function resolveArtisanId(params: {
  phoneNumberId?: string
  calledNumber?: string
  assistantId?: string
  explicitArtisanId?: string
}): string {
  const mapping = readArtisanMapping()

  if (params.phoneNumberId) {
    const match = mapping[`phoneNumberId:${params.phoneNumberId}`]
    if (match) return match
  }
  if (params.calledNumber) {
    const match = mapping[`calledNumber:${params.calledNumber}`]
    if (match) return match
  }
  if (params.assistantId) {
    const match = mapping[`assistantId:${params.assistantId}`]
    if (match) return match
  }
  if (params.explicitArtisanId) {
    return params.explicitArtisanId
  }

  return FALLBACK_ARTISAN_ID
}

// Renvoie true si le body correspond à un event serveur Vapi qui n'est PAS
// un vrai appel d'outil (ex: conversation-update, status-update, etc.).
// Ces events partagent tous une structure message.type connue de Vapi qui
// n'est pas "tool-calls". On ne doit jamais créer de dossier à partir de ça.
function isNonToolVapiEvent(body: any): boolean {
  const messageType = body?.message?.type
  if (typeof messageType !== 'string') return false
  return messageType !== 'tool-calls'
}

// Un appel manuel de test (hors Vapi) envoie le payload "à plat" à la racine
// du body, sans structure message.*. On le reconnaît par la présence de
// champs propres au contrat create_project (clientName/artisanId), afin de
// ne jamais confondre un event Vapi (conversation-update, etc.) avec un
// appel de test légitime.
function looksLikeFlatManualTestPayload(body: any): boolean {
  if (!body || typeof body !== 'object') return false
  if (body.message) return false
  return typeof body.clientName === 'string' || typeof body.artisanId === 'string'
}

function extractToolCallFromBody(body: any): { toolCall: any; source: string } | null {
  const message = body?.message
  if (message?.type === 'tool-calls') {
    const toolCall = Array.isArray(message?.toolCalls)
      ? message.toolCalls[0]
      : Array.isArray(message?.toolCallList)
        ? message.toolCallList[0]
        : undefined
    if (toolCall) return { toolCall, source: 'message.toolCalls[0].function.arguments' }
  }
  if (body?.toolCall) return { toolCall: body.toolCall, source: 'body.toolCall' }
  if (Array.isArray(body?.toolCalls) && body.toolCalls[0]) {
    return { toolCall: body.toolCalls[0], source: 'body.toolCalls' }
  }
  if (body?.functionCall) {
    return { toolCall: { function: body.functionCall }, source: 'body.functionCall' }
  }
  return null
}

// Extrait le numéro de téléphone du CLIENT (jamais celui de l'artisan)
// depuis les différents emplacements possibles d'un payload Vapi. Testé
// dans l'ordre décrit dans le brief, on renvoie le premier match non-vide.
// Ne jamais lire phoneNumber.number / calledNumber / body.phoneNumber.number
// ici : ce sont des identifiants du numéro Vapi/Twilio de l'artisan.
export function extractCustomerPhoneFromVapiPayload(body: any, args: Record<string, unknown>): {
  phone: string
  source: string
} {
  const candidates: Array<[string, unknown]> = [
    ['args.caller_phone', args?.caller_phone],
    ['args.callerPhone', args?.callerPhone],
    ['args.phone', args?.phone],
    ['args.clientPhone', args?.clientPhone],
    ['args.customerPhone', args?.customerPhone],
    ['body.customer.number', body?.customer?.number],
    ['body.call.customer.number', body?.call?.customer?.number],
    ['body.message.customer.number', body?.message?.customer?.number],
    ['body.message.call.customer.number', body?.message?.call?.customer?.number],
    ['body.message.artifact.variables.customer.number', body?.message?.artifact?.variables?.customer?.number],
    ['body.message.artifact.variableValues.customer.number', body?.message?.artifact?.variableValues?.customer?.number],
    ['body.message.artifact.variables.transport.from', body?.message?.artifact?.variables?.transport?.from],
    ['body.message.artifact.variableValues.transport.from', body?.message?.artifact?.variableValues?.transport?.from],
    ['body.call.transport.from', body?.call?.transport?.from],
  ]

  for (const [source, value] of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return { phone: value.trim(), source }
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return { phone: String(value), source }
    }
  }

  return { phone: '', source: 'none' }
}

function extractCallId(body: any, args: Record<string, unknown>): string {
  const candidates = [
    args?.callId,
    body?.call?.id,
    body?.message?.call?.id,
    body?.message?.artifact?.variables?.call?.id,
    body?.message?.artifact?.variableValues?.call?.id,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return ''
}

function parseIncomingPayload(body: any) {
  const message = body?.message
  const isToolCallFormat = message?.type === 'tool-calls'

  if (!isToolCallFormat) {
    return {
      isToolCallFormat: false as const,
      toolCallId: undefined as string | undefined,
      toolName: undefined as string | undefined,
      callId: body?.callId,
      assistantId: body?.assistantId,
      phoneNumberId: body?.phoneNumberId,
      calledNumber: body?.calledNumber,
      callerNumber:
        body?.callerNumber ?? body?.customer?.number ?? body?.call?.customer?.number ?? body?.phoneNumber,
      params: body ?? {},
    }
  }

  const call = message?.call ?? {}
  const toolCall = Array.isArray(message?.toolCalls)
    ? message.toolCalls[0]
    : Array.isArray(message?.toolCallList)
      ? message.toolCallList[0]
      : undefined
  const toolName = toolCall?.function?.name ?? toolCall?.name
  let params: Record<string, unknown> = {}
  const rawArgs = toolCall?.function?.arguments ?? toolCall?.arguments ?? toolCall?.parameters

  if (rawArgs && typeof rawArgs === 'object') {
    params = rawArgs as Record<string, unknown>
  } else if (typeof rawArgs === 'string') {
    try {
      params = JSON.parse(rawArgs)
    } catch {
      params = {}
    }
  }

  return {
    isToolCallFormat: true as const,
    toolCallId: toolCall?.id,
    toolName,
    callId: call?.id,
    assistantId: call?.assistantId,
    phoneNumberId: call?.phoneNumberId ?? call?.phoneNumber?.id,
    calledNumber: call?.phoneNumber?.number,
    callerNumber: call?.customer?.number,
    params,
  }
}

// Génère un token de complément sécurisé et envoie un SMS OVH au client
// avec le lien de complément d'infos. Étape best-effort : ne doit jamais
// faire échouer la création du projet (le projet est déjà créé en base
// au moment de l'appel de cette fonction). Toute erreur est capturée et
// tracée sur la ligne Projects via sms_status/sms_last_error.
async function sendCompletionSmsBestEffort(params: { projectId: string; clientPhone: string }) {
  const { projectId, clientPhone } = params

  if (!clientPhone) {
    console.warn('[VAPI] Pas de numéro client, SMS de complément non envoyé - projectId:', projectId)
    try {
      await supabaseAdmin
        .from(TABLES.projects)
        .update({
          sms_status: 'not_sent',
          sms_last_error: 'missing_customer_phone',
        })
        .eq('id', projectId)
    } catch {
      // best-effort : on n'échoue jamais la création du projet pour ça
    }
    return
  }

  const token = randomBytes(24).toString('hex')
  const completionUrl = `${getBaseUrl()}/completer/${token}`

  try {
    const { error: tokenUpdateError } = await supabaseAdmin
      .from(TABLES.projects)
      .update({
        sms_completion_token: token,
        sms_completion_url: completionUrl,
        completion_source: 'sms_after_vapi',
      })
      .eq('id', projectId)

    if (tokenUpdateError) {
      console.error('[VAPI] Échec écriture token de complément:', tokenUpdateError.message)
    }

    const message = `Kadria - Merci pour votre appel. Complétez votre demande ici : ${completionUrl}`
    const smsResult = await sendOvhSms({ to: clientPhone, message })

    const { error: statusUpdateError } = await supabaseAdmin
      .from(TABLES.projects)
      .update({
        sms_sent_at: new Date().toISOString(),
        sms_status: smsResult.success ? 'sent' : 'failed',
        sms_last_error: smsResult.success ? null : (smsResult.error || 'Erreur inconnue'),
        completion_source: 'sms_after_vapi',
      })
      .eq('id', projectId)

    if (statusUpdateError) {
      console.error('[VAPI] Échec écriture statut SMS:', statusUpdateError.message)
    }

    if (!smsResult.success) {
      console.error('[VAPI] Envoi SMS de complément échoué - projectId:', projectId, '- error:', smsResult.error)
    } else {
      console.log('[VAPI] SMS de complément envoyé - projectId:', projectId)
    }
  } catch (error) {
    console.error('[VAPI] Erreur inattendue lors de l\'envoi du SMS de complément - projectId:', projectId, '-', error instanceof Error ? error.message : String(error))
    try {
      await supabaseAdmin
        .from(TABLES.projects)
        .update({
          sms_status: 'failed',
          sms_last_error: error instanceof Error ? error.message : 'Erreur inconnue',
          completion_source: 'sms_after_vapi',
        })
        .eq('id', projectId)
    } catch {
      // best-effort : on n'échoue jamais la création du projet pour ça
    }
  }
}

function parseOptionalNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return undefined
}

export async function POST(request: NextRequest) {
  let parsed: ReturnType<typeof parseIncomingPayload> | undefined
  const processingStartTime = Date.now()

  try {
    const secret = request.headers.get('x-vapi-secret')
    if (secret !== process.env.VAPI_SHARED_SECRET) {
      console.warn('[VAPI] Unauthorized attempt - invalid or missing secret')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const body = await request.json()
    console.log(`[VAPI_TIMING] payload_parsed in ${Date.now() - processingStartTime}ms`)

    // Garde-fou : un event serveur Vapi qui n'est pas un vrai appel d'outil
    // (ex: conversation-update) ne doit jamais créer de dossier projet. On
    // ne l'ignore que s'il n'y a pas non plus de vrai tool call détectable
    // dans le même body (défense en profondeur) et que ce n'est pas un
    // payload de test manuel à plat.
    if (isNonToolVapiEvent(body) && !extractToolCallFromBody(body) && !looksLikeFlatManualTestPayload(body)) {
      console.log('[VAPI] Event ignored - type:', body?.message?.type)
      return NextResponse.json({ success: true, ignored: true, reason: 'non_tool_event' })
    }

    parsed = parseIncomingPayload(body)

    const {
      isToolCallFormat,
      toolCallId,
      toolName,
      callId: callIdFromParse,
      assistantId,
      phoneNumberId,
      calledNumber,
      callerNumber,
      params,
    } = parsed

    const callId = String(params.callId || '') || callIdFromParse || extractCallId(body, params)

    console.log(
      '[VAPI] Detected args source:',
      isToolCallFormat ? 'message.toolCalls[0].function.arguments' : 'root body',
    )
    console.log(
      isToolCallFormat
        ? '[VAPI] Tool call detected - source: message.toolCalls[0].function.arguments'
        : looksLikeFlatManualTestPayload(body)
          ? '[VAPI] Tool call detected - source: flat manual test payload'
          : '[VAPI] Tool call detected - source: root body fallback',
    )
    {
      const redactedParams: Record<string, unknown> = { ...params }
      for (const key of ['phone', 'clientPhone', 'customerPhone', 'callerPhone', 'caller_phone']) {
        if (typeof redactedParams[key] === 'string') {
          redactedParams[key] = maskPhone(redactedParams[key] as string)
        }
      }
      console.log('[VAPI] Parsed args:', JSON.stringify(redactedParams, null, 2))
    }
    console.log(
      '[VAPI] Incoming payload -',
      'type:', isToolCallFormat ? 'tool-calls' : 'flat',
      'toolName:', toolName || '-',
      'callId:', callId || '-',
      'assistantId:', assistantId || '-',
      'phoneNumberId:', phoneNumberId || '-',
      'calledNumber:', maskPhone(calledNumber) || '-',
      'callerNumber:', maskPhone(callerNumber) || '-',
    )

    const explicitArtisanId = typeof params.artisanId === 'string' ? params.artisanId : undefined
    const artisanId = resolveArtisanId({
      phoneNumberId,
      calledNumber,
      assistantId,
      explicitArtisanId,
    })
    const quotaBefore = await canUseVapi(artisanId)

    const trade = String(params.trade || '') || 'Non précisé'
    const city = String(params.city || '')
    const projectType = String(params.projectType || params.projectDetails || '')
    const budget = String(params.budget || '')
    const desiredTimeline = String(params.desiredTimeline || '')
    const urgency = String(params.urgency || '')
    const clientName = String(params.clientName || '') || 'Prospect appel vocal'
    // Optionnel : certains assistants Vapi peuvent transmettre un email
    // client (ex: rappele par le client a l'oral). Extraction non-bloquante,
    // n'existait pas avant ce lot - purement additive.
    const clientEmail = String(params.clientEmail || params.email || '')
    const clientFirstName = String(params.clientFirstName || '')
    const phoneExtraction = extractCustomerPhoneFromVapiPayload(body, params)
    const clientPhone = phoneExtraction.phone || String(params.clientPhone || callerNumber || '')
    console.log(
      '[VAPI] Customer phone extraction - found:', Boolean(clientPhone),
      '- source:', phoneExtraction.phone ? phoneExtraction.source : 'none',
      '- phoneLast4:', clientPhone ? clientPhone.slice(-4) : '-',
    )
    console.log(`[VAPI_TIMING] phone_extracted in ${Date.now() - processingStartTime}ms`)

    let completenessScore = Number(params.completenessScore)
    if (Number.isNaN(completenessScore)) completenessScore = 60
    completenessScore = Math.max(0, Math.min(100, completenessScore))

    const aiSummary = String(params.aiSummary || '') || [
      `Appel vocal - ${trade}`,
      city ? `à ${city}` : '',
      budget ? `budget ${budget}` : '',
      desiredTimeline ? `délai souhaité ${desiredTimeline}` : '',
      urgency ? `urgence: ${urgency}` : '',
    ].filter(Boolean).join(', ')

    const tenantIdentity = await resolveTenantIdentity({ artisanId })
    const supportsResponsibleUser = await projectResponsibilityColumnExists()
    const defaultResponsible = supportsResponsibleUser && tenantIdentity?.tenantId
      ? await resolveDefaultProjectResponsible(tenantIdentity.tenantId)
      : null
    const payload = await attachTenantIdToPayload(TABLES.projects, {
      ...toSupabaseProjectInsert({
      artisanId,
      tenantId: tenantIdentity?.tenantId || null,
      clientName,
      clientFirstName,
      clientPhone,
      clientEmail,
      city,
      trade,
      projectType,
      budget,
      desiredTimeline,
      aiSummary,
      completenessScore,
      source: 'vapi',
      callId: callId || '',
    }),
      ...(defaultResponsible
        ? {
            responsible_user_id: defaultResponsible.userId,
            responsible_assigned_at: new Date().toISOString(),
            responsible_assigned_by: defaultResponsible.userId,
          }
        : {}),
    }, {
      tenantId: tenantIdentity?.tenantId || null,
      artisanId,
    })

    if (!tenantIdentity?.tenantId) {
      throw new Error('Tenant requis pour créer un dossier Vapi.')
    }
    const creation = await createProjectWithCanonicalClient({
      tenantId: tenantIdentity.tenantId,
      artisanId,
      requestId: callId || `vapi_${randomBytes(16).toString('hex')}`,
      source: 'vapi',
      projectPayload: payload,
      client: {
        firstName: clientFirstName || null,
        lastName: clientName || null,
        email: clientEmail || null,
        phone: clientPhone || null,
        city: city || null,
        acquisitionSource: 'vapi',
      },
    })
    const result = { id: creation.projectId }
    const creationOk = true

    if (creation.idempotent) {
      console.log('[VAPI] Idempotent project creation retry - recordId:', result.id)
    } else {
      console.log('[VAPI] Project created - recordId:', result.id)
      console.log(`[VAPI_TIMING] project_created in ${Date.now() - processingStartTime}ms`)

      // Sur un runtime serverless strict (Vercel), le process peut être
      // gelé/tué dès que la réponse HTTP est envoyée, ce qui interromprait
      // ces traitements en arrière-plan avant qu'ils ne se terminent. On
      // utilise donc waitUntil() de `@vercel/functions` pour garantir leur
      // exécution complète après la réponse, sans jamais bloquer (await) la
      // réponse HTTP elle-même.
      waitUntil(Promise.allSettled([
        // Notification artisan (centre de notifications, best-effort).
        createProjectNotification(
          { id: result.id, artisanId },
          'new_project',
          {
            title: 'Nouveau dossier',
            message: `${clientName || 'Un prospect'} vient d'être créé.`,
            priority: 'high',
          },
        ).catch((err) => {
          console.error('[VAPI] Artisan notification fire-and-forget failed - projectId:', result.id, '-', err instanceof Error ? err.message : String(err))
        }),

        // SMS de complément (best-effort, n'affecte jamais la création du projet).
        // Fire-and-forget : ne bloque plus la réponse au tool call Vapi. Les
        // erreurs sont déjà loggées/tracées en base à l'intérieur de la
        // fonction ; le .catch() ici n'est qu'un filet de sécurité pour toute
        // rejection non attrapée.
        sendCompletionSmsBestEffort({ projectId: result.id, clientPhone }).catch((err) => {
          console.error('[VAPI] SMS fire-and-forget failed - projectId:', result.id, '-', err instanceof Error ? err.message : String(err))
        }),

        // Email de confirmation client (best-effort, n'affecte jamais la
        // création du projet). N'envoie rien si aucun email client valide
        // n'est disponible (cas actuel le plus fréquent côté Vapi).
        // Fire-and-forget : ne bloque plus la réponse au tool call Vapi.
        sendClientProjectConfirmationEmailBestEffort({
          projectId: result.id,
          artisanId,
          clientEmail,
          clientFirstName: clientFirstName || undefined,
          projectType,
          aiSummary,
          city,
          budget,
          desiredTimeline,
          clientPhone,
        }).catch((err) => {
          console.error('[VAPI] Client confirmation email fire-and-forget failed - projectId:', result.id, '-', err instanceof Error ? err.message : String(err))
        }),

        // Tracking usage "projet créé" (best-effort, non-bloquant).
        recordProjectCreatedUsage({
          artisanId,
          projectId: result.id,
          source: 'vapi',
        }).then((usageResult) => {
          if (!usageResult.success) {
            console.error('[VAPI] Project created but usage tracking failed:', usageResult.error || 'unknown error')
          }
        }).catch((err) => {
          console.error('[VAPI] Usage tracking fire-and-forget failed - projectId:', result.id, '-', err instanceof Error ? err.message : String(err))
        }),

        // Tracking usage appel Vapi + vérification de quota post-appel
        // (best-effort, non-bloquant). Le résultat n'est plus utilisé pour
        // construire la réponse HTTP (usageWarning n'est plus calculé de
        // façon synchrone) : il n'affecte que le logging et la notification
        // de dépassement de quota.
        (async () => {
          const durationSeconds = parseOptionalNumber(
            params.durationSeconds,
            params.duration_seconds,
            body?.durationSeconds,
            body?.duration_seconds,
            body?.call?.durationSeconds,
            body?.call?.duration_seconds,
          )
          const durationMinutes = parseOptionalNumber(
            params.durationMinutes,
            params.duration_minutes,
            body?.durationMinutes,
            body?.duration_minutes,
            body?.call?.durationMinutes,
            body?.call?.duration_minutes,
          )
          const estimatedCost = parseOptionalNumber(
            params.estimatedCost,
            params.estimated_cost,
            body?.estimatedCost,
            body?.estimated_cost,
            body?.call?.estimatedCost,
            body?.call?.estimated_cost,
          )
          const status =
            typeof params.status === 'string' ? params.status
              : typeof body?.status === 'string' ? body.status
              : typeof body?.call?.status === 'string' ? body.call.status
              : 'completed'

          const vapiUsageResult = await recordVapiCallUsage({
            artisanId,
            callId: callId || undefined,
            projectId: result.id,
            durationSeconds,
            durationMinutes,
            estimatedCost,
            status,
            rawPayload: body,
          })

          if (!vapiUsageResult.success) {
            console.error('[VAPI] Vapi call usage tracking failed:', vapiUsageResult.error || 'unknown error')
          }

          const quotaAfter = await canUseVapi(artisanId)
          if (quotaAfter.success && !quotaAfter.allowed) {
            console.warn('[VAPI] Vapi quota exceeded after call tracking', {
              artisan_id: artisanId,
              plan: quotaAfter.plan,
              used: quotaAfter.callsUsed,
              limit: quotaAfter.callsLimit,
              minutesUsed: quotaAfter.minutesUsed,
              minutesLimit: quotaAfter.minutesLimit,
              exceededReason: quotaAfter.exceededReason,
            })
            if (quotaBefore.success && quotaBefore.allowed) {
              await notifyArtisanQuotaReached({
                artisanId,
                quotaType: 'appels vocaux',
                used: quotaAfter.callsUsed,
                limit: quotaAfter.callsLimit ?? 0,
              })
            }
          }
        })().catch((err) => {
          console.error('[VAPI] Vapi usage/quota fire-and-forget failed - projectId:', result.id, '-', err instanceof Error ? err.message : String(err))
        }),
      ]).then((results) => {
        const failed = results.filter((r) => r.status === 'rejected')
        if (failed.length > 0) {
          console.error('[VAPI] Async follow-ups completed with failures - projectId:', result.id, '- failedCount:', failed.length)
        }
        console.log('[VAPI] async follow-ups completed', results.map((r) => r.status))
        console.log(`[VAPI_TIMING] async_followups_completed in ${Date.now() - processingStartTime}ms`)
      }).catch((error) => {
        console.error('[VAPI] async follow-ups failed', error)
      }))
      console.log(`[VAPI_TIMING] async_followups_scheduled in ${Date.now() - processingStartTime}ms`)
    }

    console.log(`[VAPI] create_project completed in ${Date.now() - processingStartTime}ms before async follow-ups`)
    console.log(`[VAPI_TIMING] response_returned in ${Date.now() - processingStartTime}ms`)

    if (isToolCallFormat && toolCallId) {
      return NextResponse.json({
        results: [
          {
            toolCallId,
            result: creationOk
              ? 'Dossier projet Kadria créé avec succès.'
              : 'Erreur lors de la création du dossier projet.',
          },
        ],
      })
    }

    return NextResponse.json({
      success: true,
      projectId: result.id,
      message: 'Dossier projet créé',
      callId,
      clientId: creation.clientId,
      clientResolutionOutcome: creation.clientResolutionOutcome,
      clientResolutionWarning: creation.clientResolutionWarning,
      idempotent: creation.idempotent,
    })
  } catch (error) {
    console.error('[VAPI] Unexpected error:', error)

    if (parsed?.isToolCallFormat && parsed.toolCallId) {
      return NextResponse.json({
        results: [
          {
            toolCallId: parsed.toolCallId,
            result: 'Erreur lors de la création du dossier projet.',
          },
        ],
      })
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

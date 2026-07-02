import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { TABLES } from '@/src/lib/airtable'
import { notifyArtisanQuotaReached } from '@/src/lib/artisan-notifications'
import { toSupabaseProjectInsert } from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { canUseVapi, recordProjectCreatedUsage, recordVapiCallUsage } from '@/src/lib/usage/quotas'
import { sendOvhSms } from '@/src/lib/sms/ovh-sms'
import { getBaseUrl } from '@/src/lib/base-url'

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
    parsed = parseIncomingPayload(body)

    const {
      isToolCallFormat,
      toolCallId,
      toolName,
      callId,
      assistantId,
      phoneNumberId,
      calledNumber,
      callerNumber,
      params,
    } = parsed

    console.log('[VAPI] Detected args source:', isToolCallFormat ? 'message.toolCalls[0].function.arguments' : 'root body')
    console.log('[VAPI] Parsed args:', JSON.stringify(params, null, 2))
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
    const clientPhone = String(
      params.clientPhone ||
      callerNumber ||
      body?.customer?.number ||
      body?.call?.customer?.number ||
      body?.phoneNumber ||
      '',
    )

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

    const payload = toSupabaseProjectInsert({
      artisanId,
      clientName,
      clientPhone,
      city,
      trade,
      projectType,
      budget,
      desiredTimeline,
      aiSummary,
      completenessScore,
      source: 'vapi',
      callId: callId || '',
    })

    const { data: result, error } = await supabaseAdmin
      .from(TABLES.projects)
      .insert(payload)
      .select('id')
      .single()

    const creationOk = !error
    let usageWarning: string | undefined

    if (error) {
      console.error('[VAPI] Supabase error:', error.message)
    } else {
      console.log('[VAPI] Project created - recordId:', result.id)

      // SMS de complément (best-effort, n'affecte jamais la création du projet).
      await sendCompletionSmsBestEffort({ projectId: result.id, clientPhone })

      const usageResult = await recordProjectCreatedUsage({
        artisanId,
        projectId: result.id,
        source: 'vapi',
      })

      if (!usageResult.success) {
        console.error('[VAPI] Project created but usage tracking failed:', usageResult.error || 'unknown error')
      }

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
        usageWarning = 'Quota Vapi dépassé'
        if (quotaBefore.success && quotaBefore.allowed) {
          await notifyArtisanQuotaReached({
            artisanId,
            quotaType: 'appels vocaux',
            used: quotaAfter.callsUsed,
            limit: quotaAfter.callsLimit ?? 0,
          })
        }
      } else if (quotaBefore.success && !quotaBefore.allowed) {
        usageWarning = 'Quota Vapi déjà dépassé'
      }
    }

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

    if (!creationOk) {
      return NextResponse.json(
        { success: false, error: 'Supabase creation failed', details: error?.message || null },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      projectId: result.id,
      message: 'Dossier projet créé',
      callId,
      ...(usageWarning ? { usageWarning } : {}),
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

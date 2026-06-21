import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { toSupabaseProjectInsert } from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { canUseVapi, recordProjectCreatedUsage, recordVapiCallUsage } from '@/src/lib/usage/quotas'

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

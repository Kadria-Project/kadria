import { NextRequest, NextResponse } from 'next/server'

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
    console.warn('[VAPI] VAPI_ARTISAN_MAPPING_JSON invalide — ignorée')
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

// Extrait les infos pertinentes, qu'il s'agisse du format plat de test
// ou du format Vapi Tool ({ message: { type: 'tool-calls', call, toolCallList } })
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
      callerNumber: body?.callerNumber,
      params: body ?? {},
    }
  }

  const call = message?.call ?? {}
  const toolCall = Array.isArray(message?.toolCallList) ? message.toolCallList[0] : undefined
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

export async function POST(request: NextRequest) {
  let parsed: ReturnType<typeof parseIncomingPayload> | undefined

  try {
    // ── Sécurité : clé secrète partagée ──
    const secret = request.headers.get('x-vapi-secret')
    if (secret !== process.env.VAPI_SHARED_SECRET) {
      console.warn('[VAPI] Unauthorized attempt — invalid or missing secret')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    parsed = parseIncomingPayload(body)
    const { isToolCallFormat, toolCallId, toolName, callId, assistantId, phoneNumberId, calledNumber, callerNumber, params } = parsed

    console.log(
      '[VAPI] Incoming payload —',
      'type:', isToolCallFormat ? 'tool-calls' : 'flat',
      'toolName:', toolName || '—',
      'callId:', callId || '—',
      'assistantId:', assistantId || '—',
      'phoneNumberId:', phoneNumberId || '—',
      'calledNumber:', maskPhone(calledNumber) || '—',
      'callerNumber:', maskPhone(callerNumber) || '—'
    )

    // ── Résolution de l'artisan : jamais décidée par l'IA vocale seule ──
    const explicitArtisanId = typeof params.artisanId === 'string' ? params.artisanId : undefined
    const artisanId = resolveArtisanId({
      phoneNumberId,
      calledNumber,
      assistantId,
      explicitArtisanId,
    })
    console.log('[VAPI] artisanId résolu:', artisanId)

    // ── Validation légère + valeurs par défaut ──
    const trade = String(params.trade || '') || 'Non précisé'
    const city = String(params.city || '')
    const projectType = String(params.projectType || '')
    const budget = String(params.budget || '')
    const desiredTimeline = String(params.desiredTimeline || '')
    const urgency = String(params.urgency || '')
    const clientName = String(params.clientName || '') || 'Prospect appel vocal'
    const clientPhone = String(params.clientPhone || callerNumber || '')

    let completenessScore = Number(params.completenessScore)
    if (isNaN(completenessScore)) completenessScore = 60
    completenessScore = Math.max(0, Math.min(100, completenessScore))

    const aiSummary = String(params.aiSummary || '') || [
      `Appel vocal — ${trade}`,
      city ? `à ${city}` : '',
      budget ? `budget ${budget}` : '',
      desiredTimeline ? `délai souhaité ${desiredTimeline}` : '',
      urgency ? `urgence: ${urgency}` : '',
    ].filter(Boolean).join(', ')

    // ── Création Airtable ──
    const apiKey = process.env.AIRTABLE_API_KEY
    const baseId = process.env.AIRTABLE_BASE_ID

    const fields: Record<string, unknown> = {
      'Client Name': clientName,
      'Client Phone': clientPhone,
      'City': city,
      'Trade': trade,
      'Project Type': projectType,
      'Budget': budget,
      'Desired Timeline': desiredTimeline,
      'AI Summary': aiSummary,
      'Completeness Score': completenessScore,
      'Artisan ID': artisanId,
      'Call ID': callId || '',
      'Status': 'Nouveau',
      'Source': 'vapi',
    }

    const createRecord = async (fieldsToSend: Record<string, unknown>) =>
      fetch(`https://api.airtable.com/v0/${baseId}/Projects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: fieldsToSend }),
      })

    const res = await createRecord(fields)
    let result = await res.json()
    let creationOk = res.ok

    if (!res.ok) {
      console.error('[VAPI] Airtable error:', res.status, JSON.stringify(result))
      // Retry sans le champ Source si Airtable le rejette (champ inexistant)
      if (JSON.stringify(result).includes('Source')) {
        delete fields['Source']
        const retryRes = await createRecord(fields)
        const retryResult = await retryRes.json()
        if (retryRes.ok) {
          result = retryResult
          creationOk = true
          console.log('[VAPI] Project created (retry without Source) — recordId:', retryResult.id)
        }
      }
    }

    console.log('[VAPI] Statut création Airtable:', creationOk ? 'success' : 'failed')

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
        { success: false, error: 'Airtable creation failed', details: result },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      projectId: result.id,
      message: 'Dossier projet créé',
      callId,
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
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { TABLES } from '@/src/lib/airtable'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { createInterventionId, type InterventionType } from '@/src/lib/kadria-assistant/intervention-identity'
import {
  ARBITRATION_TYPES,
  SNOOZE_OPTIONS,
  arbitrationActivity,
  arbitrationDescription,
  resolveSnoozeUntil,
  type InterventionArbitrationType,
  type SnoozeOption,
} from '@/src/lib/kadria-assistant/intervention-arbitration'

const allowedInterventionTypes = new Set<InterventionType>(['quote_followup', 'review_request', 'priority_project', 'configuration', 'delivery_error', 'tasks_overview'])
const allowedPayloadKeys = new Set(['interventionId', 'recommendationType', 'projectId', 'arbitrationType', 'snoozeOption'])

type ArbitrationPayload = {
  interventionId?: unknown
  recommendationType?: unknown
  projectId?: unknown
  arbitrationType?: unknown
  snoozeOption?: unknown
}

function parsePayload(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !allowedPayloadKeys.has(key))) return null
  const payload = body as ArbitrationPayload
  const recommendationType = typeof payload.recommendationType === 'string' && allowedInterventionTypes.has(payload.recommendationType as InterventionType)
    ? payload.recommendationType as InterventionType
    : null
  const arbitrationType = typeof payload.arbitrationType === 'string' && ARBITRATION_TYPES.includes(payload.arbitrationType as InterventionArbitrationType)
    ? payload.arbitrationType as InterventionArbitrationType
    : null
  const projectId = typeof payload.projectId === 'string' && payload.projectId.trim() ? payload.projectId.trim() : null
  const interventionId = typeof payload.interventionId === 'string' ? payload.interventionId : ''
  const snoozeOption = typeof payload.snoozeOption === 'string' && payload.snoozeOption in SNOOZE_OPTIONS ? payload.snoozeOption as SnoozeOption : undefined
  if (!recommendationType || !arbitrationType || !projectId || interventionId !== createInterventionId(recommendationType, projectId)) return null
  if ((arbitrationType === 'snoozed') !== !!snoozeOption) return null
  return { interventionId, recommendationType, projectId, arbitrationType, snoozeOption }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.artisanId) return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 })
    const payload = parsePayload(await request.json().catch(() => null))
    if (!payload) return NextResponse.json({ success: false, error: 'Arbitrage invalide.' }, { status: 400 })

    const { data: project, error: projectError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('id')
      .eq('id', payload.projectId)
      .eq('artisan_id', session.artisanId)
      .maybeSingle()
    if (projectError) throw projectError
    if (!project) return NextResponse.json({ success: false, error: 'Dossier introuvable.' }, { status: 404 })

    const snoozeUntil = payload.snoozeOption ? resolveSnoozeUntil(payload.snoozeOption) : undefined
    const description = arbitrationDescription(payload.arbitrationType, payload.interventionId, snoozeUntil)
    const { data: existing, error: existingError } = await supabaseAdmin
      .from(TABLES.activity)
      .select('created_at')
      .eq('project_id', payload.projectId)
      .eq('action', arbitrationActivity(payload.arbitrationType))
      .eq('description', description)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing?.created_at) return NextResponse.json({ success: true, idempotent: true, snoozeUntil: snoozeUntil || null })

    const { error: insertError } = await supabaseAdmin.from(TABLES.activity).insert({
      project_id: payload.projectId,
      action: arbitrationActivity(payload.arbitrationType),
      description,
      created_at: new Date().toISOString(),
    })
    if (insertError) throw insertError
    return NextResponse.json({ success: true, idempotent: false, snoozeUntil: snoozeUntil || null })
  } catch (error) {
    console.error('[KADRIA-ASSISTANT ARBITRATION]', { message: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ success: false, error: 'Impossible d’enregistrer votre choix.' }, { status: 500 })
  }
}

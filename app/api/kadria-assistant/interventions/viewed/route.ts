import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { TABLES } from '@/src/lib/airtable'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { createInterventionId, viewedInterventionDescription, type InterventionType } from '@/src/lib/kadria-assistant/intervention-identity'

const allowedTypes = new Set<InterventionType>(['quote_followup', 'review_request', 'priority_project', 'configuration', 'delivery_error', 'tasks_overview'])

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.artisanId) return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    const body = await request.json().catch(() => null) as { interventionId?: unknown; type?: unknown; projectId?: unknown } | null
    const type = typeof body?.type === 'string' && allowedTypes.has(body.type as InterventionType) ? body.type as InterventionType : null
    const projectId = typeof body?.projectId === 'string' && body.projectId.trim() ? body.projectId.trim() : null
    const interventionId = typeof body?.interventionId === 'string' ? body.interventionId : ''
    if (!type || !projectId || interventionId !== createInterventionId(type, projectId)) {
      return NextResponse.json({ success: false, error: 'Intervention invalide' }, { status: 400 })
    }
    const { data: project, error: projectError } = await supabaseAdmin.from(TABLES.projects).select('id').eq('id', projectId).eq('artisan_id', session.artisanId).maybeSingle()
    if (projectError) throw projectError
    if (!project) return NextResponse.json({ success: false, error: 'Dossier introuvable' }, { status: 404 })
    const description = viewedInterventionDescription(interventionId)
    const { data: existing, error: existingError } = await supabaseAdmin.from(TABLES.activity).select('created_at').eq('project_id', projectId).eq('action', 'KADRIA_INTERVENTION_VIEWED').eq('description', description).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (existingError) throw existingError
    if (existing?.created_at) return NextResponse.json({ success: true, viewedAt: existing.created_at, idempotent: true })
    const viewedAt = new Date().toISOString()
    const { error: insertError } = await supabaseAdmin.from(TABLES.activity).insert({ project_id: projectId, action: 'KADRIA_INTERVENTION_VIEWED', description, created_at: viewedAt })
    if (insertError) throw insertError
    return NextResponse.json({ success: true, viewedAt, idempotent: false })
  } catch (error) {
    console.error('[KADRIA-ASSISTANT VIEWED]', { message: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ success: false, error: 'Impossible d’enregistrer la consultation.' }, { status: 500 })
  }
}

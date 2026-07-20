import { NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { buildProjectWorkspaceBrief } from '@/src/lib/projects/project-workspace-builder'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { checkPermission, PermissionError } from '@/src/lib/team/access'

export const dynamic = 'force-dynamic'

type Row = Record<string, unknown>
const value = (row: Row | null, key: string) => typeof row?.[key] === 'string' ? row[key] as string : null
const truthy = (row: Row | null, key: string) => row?.[key] === true || row?.[key] === 'true'
const optionalFailure = (error: unknown) => {
  const code = error && typeof error === 'object' ? String((error as { code?: unknown }).code || '') : ''
  return ['42P01', '42703', '42501'].includes(code)
}

async function optionalSource<T>(label: string, load: () => Promise<T>) {
  try { return { value: await load(), reservation: null as string | null } }
  catch (error) {
    if (optionalFailure(error)) return { value: null, reservation: `${label} n’est pas disponible pour le moment.` }
    throw error
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  let stage = 'authorization'
  try {
    const { id } = await params
    const access = await authorizeProjectAccess({
      projectId: id,
      select: 'id, status, client_name, client_first_name, project_type, trade, city, budget, desired_timeline, completeness_score, callback_date',
      allowAppointmentAccess: true,
    })
    if (!access) return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })

    stage = 'data_load'
    const [quoteSource, appointmentSource, activitySource] = await Promise.all([
      optionalSource('Le dernier devis', async () => {
        const { data, error } = await supabaseAdmin.from(TABLES.devis).select('id, statut, sent, accepted, accepted_at, quote_sent_at, created_at').eq('project_id', access.projectId).eq('artisan_id', access.session.artisanId).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (error) throw error
        return data as Row | null
      }),
      optionalSource('Le prochain rendez-vous', async () => {
        let query = supabaseAdmin.from('project_appointments').select('start_time').eq('project_id', access.projectId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(1)
        query = access.tenantContext?.tenantId ? query.eq('tenant_id', access.tenantContext.tenantId) : query.eq('artisan_id', access.session.artisanId)
        const { data, error } = await query.maybeSingle()
        if (error) throw error
        return data as Row | null
      }),
      optionalSource('Les faits d’activité récents', async () => {
        const { data, error } = await supabaseAdmin.from(TABLES.activity).select('action, description, created_at').eq('project_id', access.projectId).order('created_at', { ascending: false }).limit(3)
        if (error) throw error
        return (data || []) as Row[]
      }),
    ])
    stage = 'build'
    const quote = quoteSource.value
    const activity = (activitySource.value || []).map((row) => ({ label: value(row, 'description') || value(row, 'action') || 'Un fait d’activité a été enregistré.', occurredAt: value(row, 'created_at') || undefined, source: 'Activité' }))
    const reservations = [quoteSource.reservation, appointmentSource.reservation, activitySource.reservation].filter((item): item is string => Boolean(item))
    const brief = buildProjectWorkspaceBrief({
      project: { id: access.projectId, status: value(access.project, 'status'), clientName: value(access.project, 'client_name'), clientFirstName: value(access.project, 'client_first_name'), projectType: value(access.project, 'project_type'), trade: value(access.project, 'trade'), city: value(access.project, 'city'), budget: value(access.project, 'budget'), desiredTimeline: value(access.project, 'desired_timeline'), completenessScore: Number(access.project.completeness_score), callbackDate: value(access.project, 'callback_date') },
      latestQuote: quote ? { id: value(quote, 'id') || '', status: value(quote, 'statut'), sent: truthy(quote, 'sent'), accepted: truthy(quote, 'accepted'), sentAt: value(quote, 'quote_sent_at'), acceptedAt: value(quote, 'accepted_at'), createdAt: value(quote, 'created_at') } : null,
      nextAppointment: appointmentSource.value ? { startsAt: value(appointmentSource.value, 'start_time') } : null,
      activity,
      reservations,
      capabilities: {
        canEditProject: !access.tenantContext?.tenantId || checkPermission(access.tenantContext, 'projects.update'),
        canManageQuote: !access.tenantContext?.tenantId || checkPermission(access.tenantContext, 'projects.manage_pipeline'),
        canPlanAppointment: !access.tenantContext?.tenantId || checkPermission(access.tenantContext, 'appointments.manage_team'),
      },
    })
    return NextResponse.json({ success: true, brief })
  } catch (error) {
    if (error instanceof PermissionError) return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message.replace(/[\r\n\t]/g, ' ').slice(0, 300) : 'Unknown error'
    console.error(`[PROJECT_WORKSPACE] requestId=${requestId} stage=${stage} message=${JSON.stringify(message)}`)
    return NextResponse.json({ success: false, error: 'La lecture du dossier est momentanément indisponible.', requestId }, { status: 500 })
  }
}

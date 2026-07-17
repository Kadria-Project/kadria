import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { serializeClientsListError, throwClientsListStage } from '@/src/lib/clients/client-list-route-utils'
import {
  buildClientAppointments,
  buildClientIdentity,
  buildClientProjects,
  buildClientQuotes,
  buildClientSummary,
  buildCommercialSummary,
  deriveClientNextAction,
} from '@/src/lib/clients/client-detail-aggregation'
import { CLIENT_ACTION_CONFIG } from '@/src/lib/clients/clients-action-config'
import { buildClientTimeline } from '@/src/lib/clients/client-timeline'
import type { ClientAppointment, ClientDetail } from '@/src/lib/clients/client-detail-types'
import { cleanClientText, normalizeClientEmail, normalizeClientPhone } from '@/src/lib/clients/client-normalization'

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now()
  const { id: clientId } = await params
  let tenantId: string | null = null
  try {
    const context = await getCurrentTenantContext()
    if (!context) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    tenantId = context.tenantId
    const supabase = getSupabaseAdmin()

    // The client must belong to the currently resolved tenant — the id in
    // the URL is never trusted for tenant scoping. A row from another
    // tenant is treated identically to a missing row (404), never a 403,
    // so the response never lets a caller distinguish "exists elsewhere"
    // from "does not exist".
    const clientResult = await supabase
      .from('clients')
      .select('id, tenant_id, first_name, last_name, company_name, email, phone, address_line1, address_line2, postal_code, city, status, archived_at, merged_into_client_id, created_at')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (clientResult.error) throwClientsListStage('client_read', clientResult.error)
    if (!clientResult.data) {
      console.info('[CLIENTS_V2][DETAIL_NOT_FOUND]', { tenantId, clientId, durationMs: Date.now() - startedAt })
      return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 })
    }
    const client = clientResult.data as Record<string, unknown>

    const projectsResult = await supabase
      .from('Projects')
      .select('id, client_id, project_title, status, created_at, updated_at, site_address')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
    if (projectsResult.error) throwClientsListStage('projects_read', projectsResult.error)
    const projects = asRows(projectsResult.data)
    const projectIds = projects.map((p) => String(p.id)).filter(Boolean)
    const projectTitleById = new Map(projects.map((p) => [String(p.id), (typeof p.project_title === 'string' && p.project_title.trim()) || 'Dossier']))

    const empty = { data: [] as Record<string, unknown>[], error: null }
    const [quotesResult, appointmentsResult, activitiesResult, eventsResult] = projectIds.length
      ? await Promise.all([
          supabase.from('Devis').select('id, project_id, numero, total_ttc, total_ht, statut, accepted, accepted_at, quote_sent_at, created_at').in('project_id', projectIds),
          supabase.from('project_appointments').select('id, project_id, title, start_time, status, confirmation_status, assigned_user_id, created_at').eq('tenant_id', tenantId).in('project_id', projectIds),
          supabase.from('Activity').select('id, project_id, created_at, updated_at, action, description').in('project_id', projectIds),
          supabase.from('ProjectClientEvents').select('id, project_id, created_at, event_type').in('project_id', projectIds),
        ])
      : [empty, empty, empty, empty]
    for (const [result, stage] of [[quotesResult, 'quotes_read'], [appointmentsResult, 'appointments_read'], [activitiesResult, 'activities_read'], [eventsResult, 'client_events_read']] as const) {
      if (result.error) throwClientsListStage(stage, result.error)
    }
    const quotes = asRows(quotesResult.data)
    const appointments = asRows(appointmentsResult.data)
    const activities = asRows(activitiesResult.data)
    const events = asRows(eventsResult.data)

    const toMap = (rows: Record<string, unknown>[]) => {
      const map = new Map<string, Record<string, unknown>[]>()
      for (const row of rows) {
        const id = typeof row.project_id === 'string' ? row.project_id : String(row.project_id || '')
        if (!id) continue
        map.set(id, [...(map.get(id) || []), row])
      }
      return map
    }
    const quotesByProject = toMap(quotes)
    const appointmentsByProject = toMap(appointments)
    const activitiesByProject = toMap(activities)

    const clientProjects = buildClientProjects(projects, quotesByProject, appointmentsByProject, activitiesByProject)
    const clientQuotes = buildClientQuotes(quotes, projectTitleById)
    const clientAppointments = buildClientAppointments(appointments, projectTitleById)

    let orphanCount = 0
    const timeline = buildClientTimeline({
      projects,
      activities,
      events,
      appointments,
      quotes,
      projectTitleById,
      projectHrefById: (projectId) => `/dashboard-v2/projet/${projectId}`,
      onOrphan: () => { orphanCount += 1 },
    })
    if (orphanCount > 0) {
      console.info('[CLIENTS_V2][ORPHAN_RELATED_ROW]', { tenantId, clientId, orphanCount })
    }

    const lastInteractionAt = timeline[0]?.occurredAt || null
    const summary = buildClientSummary(clientProjects, quotes, lastInteractionAt)
    const identity = buildClientIdentity(client, summary.projectCount)
    const commercialSummary = buildCommercialSummary(summary, identity.createdAt || summary.firstProjectAt)
    const nextActionCore = deriveClientNextAction({ projects, quotes, appointments })
    const nextAction = nextActionCore
      ? {
          ...nextActionCore,
          // Rebuild the description with the real client name — the pure
          // aggregation function has no identity context (it only knows
          // reason/dueAt), so it always seeds `clientName: ''`. Reusing the
          // exact same CLIENT_ACTION_CONFIG copy as the Action Center (Lot
          // 9.5) keeps the wording identical across both surfaces.
          description: CLIENT_ACTION_CONFIG[nextActionCore.reason].buildDescription({
            clientName: identity.displayName,
            dueLabel: nextActionCore.dueAt ? new Date(nextActionCore.dueAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null,
          }),
        }
      : null
    const upcoming = clientAppointments.filter((a) => !a.isPast).sort((a, b) => a.startTime.localeCompare(b.startTime))
    const nextAppointment: ClientAppointment | null = upcoming[0] || null

    const detail: ClientDetail = {
      client: identity,
      summary,
      commercialSummary,
      nextAction,
      nextAppointment,
      projects: clientProjects,
      quotes: clientQuotes,
      appointments: clientAppointments,
      timeline: timeline.slice(0, 200),
    }

    console.info('[CLIENTS_V2][DETAIL_LOADED]', { tenantId, clientId, projectCount: summary.projectCount, durationMs: Date.now() - startedAt })
    return NextResponse.json({ success: true, client: detail })
  } catch (error) {
    console.error('[CLIENTS_V2][DETAIL_FAILED]', serializeClientsListError(error), { tenantId, clientId })
    return NextResponse.json({ success: false, error: 'Impossible de charger la fiche client' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  try {
    const context = await getCurrentTenantContext()
    if (!context) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const supabase = getSupabaseAdmin()

    const existing = await supabase.from('clients').select('id, tenant_id').eq('id', clientId).eq('tenant_id', context.tenantId).maybeSingle()
    if (existing.error) throwClientsListStage('client_read', existing.error)
    if (!existing.data) return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 })

    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') return NextResponse.json({ success: false, error: 'Corps de requête invalide' }, { status: 400 })

    const update: Record<string, unknown> = {}
    if ('firstName' in body) update.first_name = cleanClientText(body.firstName, 120)
    if ('lastName' in body) update.last_name = cleanClientText(body.lastName, 120)
    if ('companyName' in body) update.company_name = cleanClientText(body.companyName, 180)
    if ('addressLine1' in body) update.address_line1 = cleanClientText(body.addressLine1, 255)
    if ('addressLine2' in body) update.address_line2 = cleanClientText(body.addressLine2, 255)
    if ('postalCode' in body) update.postal_code = cleanClientText(body.postalCode, 20)
    if ('city' in body) update.city = cleanClientText(body.city, 120)
    if ('status' in body) {
      const allowed = new Set(['prospect', 'customer', 'follow_up', 'lost', 'archived'])
      const status = cleanClientText(body.status, 30)
      if (status && !allowed.has(status)) return NextResponse.json({ success: false, error: 'Statut invalide' }, { status: 400 })
      if (status) update.status = status
    }
    if ('email' in body) {
      const normalizedEmail = normalizeClientEmail(body.email)
      if (normalizedEmail.raw && !normalizedEmail.valid) return NextResponse.json({ success: false, error: 'Adresse email invalide' }, { status: 400 })
      update.email = normalizedEmail.raw
      update.normalized_email = normalizedEmail.normalized
    }
    if ('phone' in body) {
      const normalizedPhone = normalizeClientPhone(body.phone)
      if (normalizedPhone.raw && !normalizedPhone.valid) return NextResponse.json({ success: false, error: 'Numéro de téléphone invalide' }, { status: 400 })
      update.phone = normalizedPhone.raw
      update.normalized_phone = normalizedPhone.normalized
    }

    if (!Object.keys(update).length) return NextResponse.json({ success: false, error: 'Aucune modification fournie' }, { status: 400 })

    if (!update.first_name && !update.last_name && !update.company_name) {
      // Preserve the identity constraint (`clients_identity_check`): don't
      // let a partial update blank out every identity field at once. Only
      // block when the incoming payload itself attempts to clear all three.
      const touchesIdentity = 'firstName' in body || 'lastName' in body || 'companyName' in body
      if (touchesIdentity) {
        const current = await supabase.from('clients').select('first_name, last_name, company_name').eq('id', clientId).eq('tenant_id', context.tenantId).maybeSingle()
        const currentRow = (current.data || {}) as Record<string, unknown>
        const firstName = 'firstName' in body ? update.first_name : currentRow.first_name
        const lastName = 'lastName' in body ? update.last_name : currentRow.last_name
        const companyName = 'companyName' in body ? update.company_name : currentRow.company_name
        if (!firstName && !lastName && !companyName) return NextResponse.json({ success: false, error: 'Un client doit conserver un nom, prénom ou une société' }, { status: 400 })
      }
    }

    if (update.normalized_email) {
      const conflict = await supabase.from('clients').select('id').eq('tenant_id', context.tenantId).eq('normalized_email', update.normalized_email).neq('id', clientId).is('archived_at', null).maybeSingle()
      if (conflict.data) return NextResponse.json({ success: false, error: 'Un autre client utilise déjà cet email' }, { status: 409 })
    }
    if (update.normalized_phone) {
      const conflict = await supabase.from('clients').select('id').eq('tenant_id', context.tenantId).eq('normalized_phone', update.normalized_phone).neq('id', clientId).is('archived_at', null).maybeSingle()
      if (conflict.data) return NextResponse.json({ success: false, error: 'Un autre client utilise déjà ce téléphone' }, { status: 409 })
    }

    // Deliberately never touches Projects: Projects.client_* fields are
    // historical snapshots at the time the dossier was created and must not
    // be mass-updated when the canonical client record changes later.
    const updated = await supabase.from('clients').update(update).eq('id', clientId).eq('tenant_id', context.tenantId).select('id').maybeSingle()
    if (updated.error) throwClientsListStage('client_update', updated.error)

    console.info('[CLIENTS_V2][DETAIL_UPDATED]', { tenantId: context.tenantId, clientId, fields: Object.keys(update) })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CLIENTS_V2][DETAIL_FAILED]', serializeClientsListError(error), { clientId, stage: 'patch' })
    return NextResponse.json({ success: false, error: 'Impossible de mettre à jour le client' }, { status: 500 })
  }
}

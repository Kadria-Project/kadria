import 'server-only'

import { TABLES } from '@/src/lib/airtable'
import { buildTrackingBrief, type TrackingProjectInput } from '@/src/components/workspace/tracking/tracking-brief-builder'
import type { TrackingBrief } from '@/src/components/workspace/tracking/tracking-contract'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { checkPermission } from '@/src/lib/team/access'
import { getCurrentTenantContext, tableHasColumn } from '@/src/lib/tenant-context'
import { getAssignedAppointmentProjectIds, projectResponsibilityColumnExists } from '@/src/lib/project-responsibility'
import { queryProjectsWithOptionalColumns } from '@/src/lib/briefs/optional-project-columns'
import type { AuthPayload } from '@/src/lib/auth-utils'

type Row = Record<string, unknown>
const requiredColumns = ['id', 'status', 'client_name', 'client_first_name', 'project_type', 'trade', 'budget', 'completeness_score', 'created_at', 'updated_at', 'callback_date']
const optionalColumns = ['devis_amount', 'quote_sent_at', 'accepted_at', 'last_follow_up_at']
const string = (row: Row, key: string) => typeof row[key] === 'string' ? row[key] : ''
const nullable = (row: Row, key: string) => typeof row[key] === 'string' ? row[key] : null
const numeric = (row: Row, key: string) => typeof row[key] === 'number' ? row[key] : Number(row[key]) || 0

function mapProject(row: Row): TrackingProjectInput {
  return { id: string(row, 'id'), status: string(row, 'status'), clientName: string(row, 'client_name'), clientFirstName: string(row, 'client_first_name'), projectType: string(row, 'project_type'), trade: string(row, 'trade'), budget: string(row, 'budget'), devisAmount: numeric(row, 'devis_amount'), completenessScore: numeric(row, 'completeness_score'), createdAt: string(row, 'created_at'), updatedAt: string(row, 'updated_at'), callbackDate: string(row, 'callback_date'), quoteSentAt: nullable(row, 'quote_sent_at'), acceptedAt: nullable(row, 'accepted_at'), lastFollowUpAt: nullable(row, 'last_follow_up_at') }
}

export type TrackingAssistantRead =
  | { kind: 'ok'; brief: TrackingBrief }
  | { kind: 'forbidden' }

// Mirrors the existing /api/tracking-brief access and scoring rules so the
// assistant cannot see a broader project set than the Suivi workspace.
export async function getTrackingBriefForAssistant(session: AuthPayload): Promise<TrackingAssistantRead> {
  const tenant = await getCurrentTenantContext({ session })
  const [supportsTenantId, supportsResponsibleUser] = await Promise.all([tableHasColumn(TABLES.projects, 'tenant_id'), projectResponsibilityColumnExists()])
  const canReadAll = checkPermission(tenant, 'projects.read_all')
  const canReadAssigned = checkPermission(tenant, 'projects.read_assigned')
  if (!canReadAll && (!canReadAssigned || !supportsResponsibleUser)) return { kind: 'forbidden' }

  const result = await queryProjectsWithOptionalColumns({
    requiredColumns,
    optionalColumns,
    hasColumn: tableHasColumn,
    table: TABLES.projects,
    execute: (columns) => {
      const selected = [...columns, ...(supportsResponsibleUser ? ['responsible_user_id'] : [])].join(', ')
      let query = supabaseAdmin.from(TABLES.projects).select(selected).order('updated_at', { ascending: false }).limit(120)
      query = supportsTenantId && tenant?.tenantId ? query.eq('tenant_id', tenant.tenantId) : query.eq('artisan_id', session.artisanId)
      return Promise.resolve(query)
    },
  })
  if (result.error) throw result.error
  const rows = (result.data || []) as Row[]
  let projects = rows.map(mapProject)
  let reservations = result.missing.length ? ['Certaines informations commerciales ne sont pas disponibles ; les résultats peuvent être incomplets.'] : []
  let insufficient = false
  if (tenant?.tenantId && (!canReadAll || !supportsResponsibleUser)) {
    const assigned = await getAssignedAppointmentProjectIds(tenant.tenantId, tenant.userId)
    projects = projects.filter((project) => {
      const row = rows.find((candidate) => String(candidate.id || '') === project.id)
      return string(row || {}, 'responsible_user_id') === tenant.userId || assigned.has(project.id)
    })
    reservations = ['Le suivi est limité aux dossiers qui vous sont affectés.']
    insufficient = !canReadAssigned
  }
  return { kind: 'ok', brief: buildTrackingBrief(projects, { reservations, insufficient }) }
}

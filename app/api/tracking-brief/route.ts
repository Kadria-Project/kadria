import { NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { buildTrackingBrief, type TrackingProjectInput } from '@/src/components/workspace/tracking/tracking-brief-builder'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { checkPermission } from '@/src/lib/team/access'
import { getCurrentTenantContext, tableHasColumn } from '@/src/lib/tenant-context'
import { getAssignedAppointmentProjectIds, projectResponsibilityColumnExists } from '@/src/lib/project-responsibility'
import { availableProjectColumns, logBriefError, type BriefErrorStage } from '@/src/lib/briefs/brief-error'

export const dynamic = 'force-dynamic'
const requiredColumns = ['id', 'status', 'client_name', 'client_first_name', 'project_type', 'trade', 'budget', 'completeness_score', 'created_at', 'updated_at', 'callback_date']
const optionalColumns = ['devis_amount', 'quote_sent_at', 'accepted_at', 'last_follow_up_at']
type Row = Record<string, unknown>
const string = (row: Row, key: string) => typeof row[key] === 'string' ? row[key] : ''
const nullable = (row: Row, key: string) => typeof row[key] === 'string' ? row[key] : null
const numeric = (row: Row, key: string) => typeof row[key] === 'number' ? row[key] : Number(row[key]) || 0
function mapProject(row: Row): TrackingProjectInput { return { id: string(row, 'id'), status: string(row, 'status'), clientName: string(row, 'client_name'), clientFirstName: string(row, 'client_first_name'), projectType: string(row, 'project_type'), trade: string(row, 'trade'), budget: string(row, 'budget'), devisAmount: numeric(row, 'devis_amount'), completenessScore: numeric(row, 'completeness_score'), createdAt: string(row, 'created_at'), updatedAt: string(row, 'updated_at'), callbackDate: string(row, 'callback_date'), quoteSentAt: nullable(row, 'quote_sent_at'), acceptedAt: nullable(row, 'accepted_at'), lastFollowUpAt: nullable(row, 'last_follow_up_at') } }

export async function GET() {
  const requestId = crypto.randomUUID().slice(0, 8)
  let stage: BriefErrorStage = 'session'
  try {
    const session = await getSession()
    if (!session?.artisanId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    stage = 'tenant'
    const tenant = await getCurrentTenantContext({ session })
    stage = 'schema'
    const [supportsTenantId, supportsResponsibleUser] = await Promise.all([tableHasColumn(TABLES.projects, 'tenant_id'), projectResponsibilityColumnExists()])
    const canReadAll = checkPermission(tenant, 'projects.read_all')
    const canReadAssigned = checkPermission(tenant, 'projects.read_assigned')
    const capabilities = await availableProjectColumns(requiredColumns, optionalColumns, tableHasColumn, TABLES.projects)
    const selectedColumns = [...capabilities.columns, ...(supportsResponsibleUser ? ['responsible_user_id'] : [])].join(', ')
    stage = 'projects_query'
    let query = supabaseAdmin.from(TABLES.projects).select(selectedColumns).order('updated_at', { ascending: false }).limit(120)
    query = supportsTenantId && tenant?.tenantId ? query.eq('tenant_id', tenant.tenantId) : query.eq('artisan_id', session.artisanId)
    const result = await query
    if (result.error) throw result.error
    stage = 'normalize'
    let projects = ((result.data || []) as unknown as Row[]).map(mapProject)
    let reservations: string[] = capabilities.missing.length ? ['Certaines dates ou montants facultatifs ne sont pas disponibles pour le suivi.'] : []
    let insufficient = false
    if (tenant?.tenantId && (!canReadAll || !supportsResponsibleUser)) {
      if (!canReadAssigned || !supportsResponsibleUser) { projects = []; reservations = ['Vos permissions ne permettent pas de vérifier les dossiers commerciaux disponibles.']; insufficient = true } else { const assigned = await getAssignedAppointmentProjectIds(tenant.tenantId, tenant.userId); projects = projects.filter((project) => { const row = (result.data || []).find((candidate) => String((candidate as unknown as Row).id || '') === project.id) as unknown as Row | undefined; return string(row || {}, 'responsible_user_id') === tenant.userId || assigned.has(project.id) }); reservations = ['Le suivi est limité aux dossiers qui vous sont affectés.'] }
    }
    stage = 'build'
    const brief = buildTrackingBrief(projects, { reservations, insufficient })
    stage = 'contract'
    return NextResponse.json({ success: true, brief })
  } catch (error) {
    logBriefError({ scope: 'TRACKING_BRIEF', requestId, stage, error })
    return NextResponse.json({ success: false, error: 'Unable to build tracking brief', requestId }, { status: 500 })
  }
}

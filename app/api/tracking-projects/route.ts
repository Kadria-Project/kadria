import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { TABLES } from '@/src/lib/airtable'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext, tableHasColumn } from '@/src/lib/tenant-context'
import { checkPermission } from '@/src/lib/team/access'
import { getAssignedAppointmentProjectIds, projectResponsibilityColumnExists } from '@/src/lib/project-responsibility'
import { queryProjectsWithOptionalColumns } from '@/src/lib/briefs/optional-project-columns'
import { buildTrackingExplorerItem, type TrackingProjectInput } from '@/src/components/workspace/tracking/tracking-brief-builder'

const PAGE_SIZE = 25
const stageStatus: Record<string, string[]> = { new: ['Nouveau'], qualification: ['À rappeler'], quote_to_prepare: ['Qualifié', 'En cours'], quote_sent: ['Devis envoyé'], won: ['Gagné', 'Devis accepté'], lost: ['Perdu'], archived: ['Archivé', 'Archive'] }
const safePage = (value: string | null) => Math.max(1, Math.min(10_000, Number.parseInt(value || '1', 10) || 1))
type Row = Record<string, unknown>
const string = (row: Row, key: string) => typeof row[key] === 'string' ? row[key] : ''
const nullable = (row: Row, key: string) => typeof row[key] === 'string' ? row[key] : null
const numeric = (row: Row, key: string) => typeof row[key] === 'number' ? row[key] : Number(row[key]) || 0
function mapProject(row: Row): TrackingProjectInput { return { id: string(row, 'id'), status: string(row, 'status'), clientName: string(row, 'client_name'), clientFirstName: string(row, 'client_first_name'), projectType: string(row, 'project_type'), trade: string(row, 'trade'), budget: string(row, 'budget'), devisAmount: numeric(row, 'devis_amount'), completenessScore: numeric(row, 'completeness_score'), createdAt: string(row, 'created_at'), updatedAt: string(row, 'updated_at'), callbackDate: string(row, 'callback_date'), quoteSentAt: nullable(row, 'quote_sent_at'), acceptedAt: nullable(row, 'accepted_at'), lastFollowUpAt: nullable(row, 'last_follow_up_at') } }

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.artisanId) return NextResponse.json({ success: false, error: 'Connexion requise.' }, { status: 401 })
    const context = await getCurrentTenantContext({ session })
    const canReadAll = checkPermission(context, 'projects.read_all')
    const canReadAssigned = checkPermission(context, 'projects.read_assigned')
    if (context?.tenantId && !canReadAll && !canReadAssigned) return NextResponse.json({ success: true, items: [], total: 0, page: 1, pageSize: PAGE_SIZE })
    const params = request.nextUrl.searchParams, page = safePage(params.get('page')), q = (params.get('q') || '').trim().slice(0, 100), stage = params.get('stage') || '', sort = params.get('sort') || 'activity'
    const supportsTenantId = await tableHasColumn(TABLES.projects, 'tenant_id')
    const supportsResponsible = await projectResponsibilityColumnExists()
    const requiredColumns = ['id', 'status', 'client_name', 'client_first_name', 'project_type', 'trade', 'budget', 'completeness_score', 'created_at', 'updated_at', 'callback_date']
    const optionalColumns = ['devis_amount', 'quote_sent_at', 'accepted_at', 'last_follow_up_at']
    const result = await queryProjectsWithOptionalColumns({ requiredColumns, optionalColumns, hasColumn: tableHasColumn, table: TABLES.projects, execute: (columns) => {
      let query = supabaseAdmin.from(TABLES.projects).select(columns.join(', '), { count: 'exact' })
      query = supportsTenantId && context?.tenantId ? query.eq('tenant_id', context.tenantId) : query.eq('artisan_id', session.artisanId)
      if (stageStatus[stage]) query = query.in('status', stageStatus[stage])
      if (q) query = query.or(`client_name.ilike.%${q}%,client_first_name.ilike.%${q}%,project_type.ilike.%${q}%,trade.ilike.%${q}%`)
      query = query.order(sort === 'value' && columns.includes('devis_amount') ? 'devis_amount' : 'created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
      return Promise.resolve(query)
    } })
    const { data, error } = result
    if (error) throw error
    let items = Array.isArray(data) ? data as Row[] : []
    if (context?.tenantId && !canReadAll && supportsResponsible) { const assigned = await getAssignedAppointmentProjectIds(context.tenantId, context.userId); items = items.filter((item) => assigned.has(String(item.id))) }
    return NextResponse.json({ success: true, items: items.map((item) => buildTrackingExplorerItem(mapProject(item))), total: Array.isArray(data) ? result.count || 0 : 0, page, pageSize: PAGE_SIZE })
  } catch (error) {
    console.error('[TRACKING_PROJECTS] list failed', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'Impossible de charger les projets.' }, { status: 500 })
  }
}

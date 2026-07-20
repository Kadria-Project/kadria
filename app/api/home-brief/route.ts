import { NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { buildOperationsCenter, type RecommendationProjectInput } from '@/src/lib/recommendations'
import { buildHomeBrief } from '@/src/components/workspace/home/home-brief-builder'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { checkPermission } from '@/src/lib/team/access'
import { getCurrentTenantContext, tableHasColumn } from '@/src/lib/tenant-context'
import { getAssignedAppointmentProjectIds, projectResponsibilityColumnExists } from '@/src/lib/project-responsibility'

type ProjectRow = Record<string, unknown>
type AppointmentRow = { id: string; project_id: string | null; start_time: string | null; end_time: string | null; title: string | null; location: string | null; assigned_user_id: string | null; qualification_status?: string | null; qualification_outcome?: string | null; confirmation_status?: string | null }

export const dynamic = 'force-dynamic'

const projectColumns = 'id, status, client_name, client_first_name, client_email, client_phone, city, trade, project_type, budget, desired_timeline, maturity, completeness_score, created_at, updated_at, callback_date, quote_sent_at, accepted_at, last_follow_up_at, deposit_status, completion_completed_at'

function string(row: ProjectRow, key: string) { return typeof row[key] === 'string' ? row[key] : '' }
function nullableString(row: ProjectRow, key: string) { return typeof row[key] === 'string' ? row[key] : null }
function number(row: ProjectRow, key: string) { const value = row[key]; return typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0 }

function mapProject(row: ProjectRow): RecommendationProjectInput {
  return {
    id: string(row, 'id'), status: string(row, 'status'), clientName: string(row, 'client_name'), clientFirstName: string(row, 'client_first_name'), clientEmail: string(row, 'client_email'), clientPhone: string(row, 'client_phone'), city: string(row, 'city'), trade: string(row, 'trade'), projectType: string(row, 'project_type'), budget: string(row, 'budget'), desiredTimeline: string(row, 'desired_timeline'), maturity: string(row, 'maturity'), completenessScore: number(row, 'completeness_score'), createdAt: string(row, 'created_at'), updatedAt: string(row, 'updated_at'), callbackDate: string(row, 'callback_date'), quoteSentAt: nullableString(row, 'quote_sent_at'), acceptedAt: nullableString(row, 'accepted_at'), lastFollowUpAt: nullableString(row, 'last_follow_up_at'), depositStatus: string(row, 'deposit_status'), responsibleUserId: nullableString(row, 'responsible_user_id'), completionCompletedAt: nullableString(row, 'completion_completed_at'),
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.artisanId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const tenant = await getCurrentTenantContext({ session })
    const [supportsTenantId, supportsResponsibleUser, supportsQualification, supportsConfirmation] = await Promise.all([
      tableHasColumn(TABLES.projects, 'tenant_id'), projectResponsibilityColumnExists(), tableHasColumn('project_appointments', 'qualification_status'), tableHasColumn('project_appointments', 'confirmation_status'),
    ])
    const canReadAll = checkPermission(tenant, 'projects.read_all')
    const canReadAssigned = checkPermission(tenant, 'projects.read_assigned')
    const selectedProjectColumns = supportsResponsibleUser ? `${projectColumns}, responsible_user_id` : projectColumns
    let projectsQuery = supabaseAdmin.from(TABLES.projects).select(selectedProjectColumns).order('updated_at', { ascending: false }).limit(80)
    projectsQuery = supportsTenantId && tenant?.tenantId ? projectsQuery.eq('tenant_id', tenant.tenantId) : projectsQuery.eq('artisan_id', session.artisanId)
    const appointmentColumns = ['id, project_id, start_time, end_time, title, location, assigned_user_id', supportsQualification ? 'qualification_status, qualification_outcome' : null, supportsConfirmation ? 'confirmation_status' : null].filter(Boolean).join(', ')
    let appointmentsQuery = supabaseAdmin.from('project_appointments').select(appointmentColumns).order('start_time', { ascending: true }).limit(80)
    appointmentsQuery = tenant?.tenantId ? appointmentsQuery.eq('tenant_id', tenant.tenantId) : appointmentsQuery.eq('artisan_id', session.artisanId)
    if (tenant?.tenantId && !checkPermission(tenant, 'planning.manage_team') && !checkPermission(tenant, 'appointments.manage_team')) appointmentsQuery = appointmentsQuery.eq('assigned_user_id', tenant.userId)
    const [projectsResult, appointmentsResult, activityResult] = await Promise.all([
      projectsQuery, appointmentsQuery,
      supabaseAdmin.from(TABLES.activity).select('project_id, action').in('action', ['GOOGLE_REVIEW_REQUEST_SENT']).order('created_at', { ascending: false }).limit(160),
    ])
    if (projectsResult.error) throw projectsResult.error
    if (appointmentsResult.error) throw appointmentsResult.error
    const rawProjects = (projectsResult.data || []) as unknown as ProjectRow[]
    let projects = rawProjects.map(mapProject)
    if (tenant?.tenantId && (!canReadAll || !supportsResponsibleUser)) {
      if (!canReadAssigned || !supportsResponsibleUser) projects = []
      else { const assigned = await getAssignedAppointmentProjectIds(tenant.tenantId, tenant.userId); projects = projects.filter((project) => project.responsibleUserId === tenant.userId || assigned.has(project.id)) }
    }
    const projectIds = new Set(projects.map((project) => project.id))
    const appointments = ((appointmentsResult.data || []) as unknown as AppointmentRow[]).filter((row) => !row.project_id || projectIds.has(row.project_id)).map((row) => ({ id: row.id, projectId: row.project_id, assignedUserId: row.assigned_user_id, assignedUserName: null, start: row.start_time, end: row.end_time, title: row.title, location: row.location, latitude: null, longitude: null, qualificationStatus: row.qualification_status || null, qualificationOutcome: row.qualification_outcome || null, confirmationStatus: row.confirmation_status || null }))
    const reviewRequestedProjectIds = new Set(((activityResult.data || []) as Array<{ project_id: string | null }>).map((row) => row.project_id).filter((id): id is string => typeof id === 'string' && projectIds.has(id)))
    const operations = buildOperationsCenter({ projects, appointments, members: [], config: { artisanConfig: null, businessProfile: null, serviceProfilesCount: 0, googleCalendarConnected: true }, reviewRequestedProjectIds })
    return NextResponse.json({ success: true, brief: buildHomeBrief(operations.recommendations, operations.generatedAt) })
  } catch (error) {
    console.error('[HOME_BRIEF] Unable to build home brief', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ success: false, error: 'Brief indisponible' }, { status: 500 })
  }
}

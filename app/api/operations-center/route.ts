import { NextResponse } from 'next/server'
import { TABLES, getArtisanConfig } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { getBusinessProfile } from '@/src/lib/business-profile'
import { getCalendarIntegration } from '@/src/lib/google-calendar'
import {
  buildOperationsCenter,
  type RecommendationAppointmentInput,
  type RecommendationConfigInput,
  type RecommendationMemberInput,
  type RecommendationProjectInput,
  type RecommendationItem,
} from '@/src/lib/recommendations'
import { listServiceProfiles } from '@/src/lib/service-profiles'
import { mapSupabaseProject } from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { checkPermission } from '@/src/lib/team/access'
import { listTeamMembers } from '@/src/lib/team/service'
import { getCurrentTenantContext, tableHasColumn } from '@/src/lib/tenant-context'
import { getAssignedAppointmentProjectIds, projectResponsibilityColumnExists } from '@/src/lib/project-responsibility'
import { buildAutomationMetadataForTenant } from '@/src/lib/automations'

type AppointmentRow = {
  id: string
  project_id: string | null
  tenant_id: string | null
  artisan_id?: string | null
  assigned_user_id: string | null
  start_time: string | null
  end_time: string | null
  title: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
}

type ActivityRow = {
  project_id: string | null
  action: string | null
}

function mapProjectForRecommendations(
  project: ReturnType<typeof mapSupabaseProject>,
  raw: Record<string, unknown>,
): RecommendationProjectInput {
  return {
    id: project.id,
    status: project.status || '',
    clientName: project.clientName || '',
    clientFirstName: project.clientFirstName || '',
    clientEmail: project.clientEmail || '',
    clientPhone: project.clientPhone || '',
    city: project.city || '',
    trade: project.trade || '',
    projectType: project.projectType || '',
    budget: project.budget || '',
    desiredTimeline: project.desiredTimeline || '',
    maturity: project.maturity || '',
    completenessScore: Number(project.completenessScore || 0),
    createdAt: project.createdAt || '',
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : '',
    callbackDate: project.callbackDate || '',
    quoteSentAt: typeof raw.quote_sent_at === 'string' ? raw.quote_sent_at : null,
    acceptedAt: typeof raw.accepted_at === 'string' ? raw.accepted_at : null,
    lastFollowUpAt: typeof raw.last_follow_up_at === 'string' ? raw.last_follow_up_at : null,
    depositStatus: project.depositStatus || '',
    responsibleUserId: project.responsibleUserId || null,
    completionCompletedAt: project.completionCompletedAt || null,
  }
}

function mapAppointmentForRecommendations(row: AppointmentRow, userNames: Map<string, string>): RecommendationAppointmentInput {
  return {
    id: row.id,
    projectId: row.project_id || null,
    assignedUserId: row.assigned_user_id || null,
    assignedUserName: row.assigned_user_id ? userNames.get(row.assigned_user_id) || null : null,
    start: row.start_time || null,
    end: row.end_time || null,
    title: row.title || null,
    location: row.location || null,
    latitude: typeof row.latitude === 'number' ? row.latitude : null,
    longitude: typeof row.longitude === 'number' ? row.longitude : null,
  }
}

function mapMemberForRecommendations(member: Awaited<ReturnType<typeof listTeamMembers>>[number]): RecommendationMemberInput {
  return {
    userId: member.userId,
    name: [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.email || 'Collaborateur',
    role: member.role,
    status: member.status,
  }
}

function mapConfigForRecommendations(input: {
  artisanConfig: Awaited<ReturnType<typeof getArtisanConfig>>
  businessProfile: Awaited<ReturnType<typeof getBusinessProfile>>
  serviceProfilesCount: number
  calendarConnected: boolean
}): RecommendationConfigInput {
  const artisanConfig = input.artisanConfig
  const businessProfile = input.businessProfile.row
  return {
    artisanConfig: artisanConfig
      ? {
          companyName: artisanConfig.companyName,
          phone: artisanConfig.phone,
          villePro: artisanConfig.villePro,
          address: artisanConfig.address,
          googleReviewUrl: artisanConfig.googleReviewUrl,
          businessConfig: artisanConfig.businessConfig as { calendarMode?: string | null; serviceCatalog?: unknown[] | null } | null,
        }
      : null,
    businessProfile: businessProfile
      ? {
          primaryTrade: businessProfile.primary_trade,
          baseCity: businessProfile.base_city,
          interventionRadiusKm: businessProfile.intervention_radius_km,
          hourlyRateHt: businessProfile.hourly_rate_ht,
          defaultVatRate: businessProfile.default_vat_rate,
          workingDays: businessProfile.working_days,
          workStartTime: businessProfile.work_start_time,
          workEndTime: businessProfile.work_end_time,
        }
      : null,
    serviceProfilesCount: input.serviceProfilesCount,
    googleCalendarConnected: input.calendarConnected,
  }
}

const RECOMMENDATION_TO_AUTOMATION: Partial<Record<string, string>> = {
  follow_up_quote: 'quote_followup',
  request_review: 'review_request',
  schedule_intervention: 'won_project_followup',
  assign_responsible: 'unassigned_project_alert',
}

function withAutomationMetadata(
  recommendations: RecommendationItem[],
  automationRows: Awaited<ReturnType<typeof buildAutomationMetadataForTenant>>['automations'],
  pendingRuns: Awaited<ReturnType<typeof buildAutomationMetadataForTenant>>['runs'],
): RecommendationItem[] {
  const automationByType = new Map(automationRows.map((row) => [row.type, row]))
  return recommendations.map((item) => {
    const automationType = RECOMMENDATION_TO_AUTOMATION[item.type]
    if (!automationType) return item
    const automation = automationByType.get(automationType as typeof automationRows[number]['type'])
    if (!automation) return item
    const pendingRun = pendingRuns.find(
      (run) => run.automationId === automation.id && run.entityType === item.entityType && run.entityId === (item.entityId || ''),
    )
    if (pendingRun && automation.mode === 'approval_required') {
      return {
        ...item,
        automationType,
        automationMode: automation.mode,
        automationRunId: pendingRun.id,
        automationStatus: pendingRun.status,
        automationLabel: 'A valider',
        actionType: 'execute_automation_run',
        actionLabel: 'Valider et executer',
        actionRoute: `/api/automations/runs/${pendingRun.id}/execute`,
        secondaryAction: 'ignore_automation_run',
        secondaryLabel: 'Ignorer',
        secondaryRoute: `/api/automations/runs/${pendingRun.id}/ignore`,
      }
    }
    return {
      ...item,
      automationType,
      automationMode: automation.mode,
      automationLabel: automation.mode === 'automatic' ? 'Automatique' : 'Manuel',
    }
  })
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.artisanId) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    const tenantContext = await getCurrentTenantContext()
    const supportsTenantId = await tableHasColumn(TABLES.projects, 'tenant_id')
    const supportsResponsibleUser = await projectResponsibilityColumnExists()
    const canReadAllProjects = checkPermission(tenantContext, 'projects.read_all')
    const canReadAssignedProjects = checkPermission(tenantContext, 'projects.read_assigned')

    let projectsQuery = supabaseAdmin
      .from(TABLES.projects)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(160)

    if (supportsTenantId && tenantContext?.tenantId) {
      projectsQuery = projectsQuery.eq('tenant_id', tenantContext.tenantId)
    } else {
      projectsQuery = projectsQuery.eq('artisan_id', session.artisanId)
    }

    const appointmentsQuery = supabaseAdmin
      .from('project_appointments')
      .select('id, project_id, tenant_id, artisan_id, assigned_user_id, start_time, end_time, title, location, latitude, longitude')
      .order('start_time', { ascending: true })
      .limit(240)

    const [projectsRes, artisanConfig, businessProfile, serviceProfiles, calendarResult, members, activityRes] = await Promise.all([
      projectsQuery,
      getArtisanConfig(session.artisanId).catch(() => null),
      getBusinessProfile(session.artisanId).catch(() => ({ row: null, tableMissing: true as const })),
      listServiceProfiles(session.artisanId).catch(() => ({ rows: [], tableMissing: true as const })),
      getCalendarIntegration(session.artisanId).catch(() => ({ row: null, tableMissing: true as const })),
      tenantContext?.tenantId ? listTeamMembers(tenantContext.tenantId).catch(() => []) : Promise.resolve([]),
      supabaseAdmin
        .from(TABLES.activity)
        .select('project_id, action')
        .in('action', ['GOOGLE_REVIEW_REQUEST_SENT', 'GOOGLE_REVIEW_REQUEST_FAILED'])
        .order('created_at', { ascending: false })
        .limit(400),
    ])

    if (projectsRes.error) throw projectsRes.error

    const rawProjectRows = (projectsRes.data || []) as Record<string, unknown>[]
    const rawProjects = rawProjectRows.map(mapSupabaseProject)
    let visibleProjects = rawProjects

    if (tenantContext?.tenantId && !canReadAllProjects && !canReadAssignedProjects) {
      visibleProjects = []
    } else if (tenantContext?.tenantId && !canReadAllProjects && canReadAssignedProjects) {
      const appointmentProjectIds = await getAssignedAppointmentProjectIds(tenantContext.tenantId, tenantContext.userId)
      visibleProjects = rawProjects.filter((project) =>
        project.responsibleUserId === tenantContext.userId || appointmentProjectIds.has(project.id),
      )
    }

    let appointmentsScoped = appointmentsQuery
    if (tenantContext?.tenantId) {
      appointmentsScoped = appointmentsScoped.eq('tenant_id', tenantContext.tenantId)
    } else {
      appointmentsScoped = appointmentsScoped.eq('artisan_id', session.artisanId)
    }
    if (tenantContext?.tenantId && !checkPermission(tenantContext, 'planning.manage_team') && !checkPermission(tenantContext, 'appointments.manage_team')) {
      appointmentsScoped = appointmentsScoped.eq('assigned_user_id', tenantContext.userId)
    }

    const appointmentsRes = await appointmentsScoped
    if (appointmentsRes.error) throw appointmentsRes.error

    const userNames = new Map(
      members
        .filter((member) => member.userId)
        .map((member) => [member.userId, [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.email || 'Collaborateur'] as const),
    )

    const visibleProjectIds = new Set(visibleProjects.map((project) => project.id))
    const appointments = ((appointmentsRes.data || []) as AppointmentRow[])
      .filter((row) => !row.project_id || visibleProjectIds.has(row.project_id))
      .map((row) => mapAppointmentForRecommendations(row, userNames))

    const activities = (activityRes.data || []) as ActivityRow[]
    const reviewRequestedProjectIds = new Set(
      activities
        .filter((activity) => activity.action === 'GOOGLE_REVIEW_REQUEST_SENT' && activity.project_id && visibleProjectIds.has(activity.project_id))
        .map((activity) => String(activity.project_id)),
    )

    let operationsCenter = buildOperationsCenter({
      projects: visibleProjects.map((project) => {
        const raw = rawProjectRows.find((row) => String(row.id || '') === project.id) || {}
        return mapProjectForRecommendations(project, raw)
      }),
      appointments,
      members: members
        .filter((member) => member.status === 'active')
        .map(mapMemberForRecommendations),
      config: mapConfigForRecommendations({
        artisanConfig,
        businessProfile,
        serviceProfilesCount: serviceProfiles.rows.length,
        calendarConnected: !!calendarResult.row?.is_connected,
      }),
      reviewRequestedProjectIds,
    })

    if (tenantContext?.tenantId) {
      const metadata = await buildAutomationMetadataForTenant(tenantContext.tenantId).catch(() => ({ automations: [], runs: [] }))
      operationsCenter = {
        ...operationsCenter,
        recommendations: withAutomationMetadata(operationsCenter.recommendations, metadata.automations, metadata.runs),
        todayFocus: withAutomationMetadata(operationsCenter.todayFocus, metadata.automations, metadata.runs),
        opportunities: withAutomationMetadata(operationsCenter.opportunities, metadata.automations, metadata.runs),
        risks: withAutomationMetadata(operationsCenter.risks, metadata.automations, metadata.runs),
        groupedActions: {
          relances: withAutomationMetadata(operationsCenter.groupedActions.relances, metadata.automations, metadata.runs),
          planifications: withAutomationMetadata(operationsCenter.groupedActions.planifications, metadata.automations, metadata.runs),
          affectations: withAutomationMetadata(operationsCenter.groupedActions.affectations, metadata.automations, metadata.runs),
          avis: withAutomationMetadata(operationsCenter.groupedActions.avis, metadata.automations, metadata.runs),
          configuration: withAutomationMetadata(operationsCenter.groupedActions.configuration, metadata.automations, metadata.runs),
        },
      }
    }

    return NextResponse.json({
      success: true,
      operationsCenter,
      viewerContext: {
        tenantId: tenantContext?.tenantId || null,
        currentUserId: tenantContext?.userId || null,
        supportsResponsibleUser,
        canReadAllProjects,
        canReadAssignedProjects,
      },
    })
  } catch (error) {
    console.error('[OPERATIONS_CENTER]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

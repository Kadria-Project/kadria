import { NextResponse } from 'next/server'
import { TABLES, getArtisanConfig } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { getBusinessProfile } from '@/src/lib/business-profile'
import { getCalendarIntegration } from '@/src/lib/google-calendar'
import {
  buildOperationsCenter,
  type OperationsWorkbenchItem,
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
import { buildAutomationMetadataForTenant, listAutomationRunsForCurrentTenant } from '@/src/lib/automations'

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
  latitude?: number | null
  longitude?: number | null
}

type ActivityRow = {
  project_id: string | null
  action: string | null
}

function isAppointmentRow(value: unknown): value is AppointmentRow {
  return typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string'
}

function isActivityRow(value: unknown): value is ActivityRow {
  return typeof value === 'object' && value !== null
}

function describeOperationsCenterError(error: unknown) {
  if (error instanceof Error) {
    const candidate = error as Error & {
      code?: string
      details?: string
      hint?: string
      status?: number
      digest?: string
    }
    return {
      type: error.constructor?.name || 'Error',
      name: error.name,
      message: error.message,
      code: candidate.code || null,
      details: candidate.details || null,
      hint: candidate.hint || null,
      status: candidate.status || null,
      digest: candidate.digest || null,
    }
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>
    return {
      type: 'Object',
      name: typeof record.name === 'string' ? record.name : null,
      message: typeof record.message === 'string' ? record.message : null,
      code: typeof record.code === 'string' ? record.code : null,
      details: typeof record.details === 'string' ? record.details : null,
      hint: typeof record.hint === 'string' ? record.hint : null,
      status: typeof record.status === 'number' ? record.status : null,
      keys: Object.keys(record),
    }
  }

  return {
    type: typeof error,
    message: error === undefined ? 'undefined' : String(error),
  }
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

function toRelativeDateLabel(value: string | null, now: Date) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 60000) return "à l'instant"
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`
  const diffHours = Math.floor(diffMs / 3600000)
  if (diffHours < 24) return `il y a ${diffHours} h`
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays < 7) return `il y a ${diffDays} j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function recommendationAutomationKey(item: RecommendationItem) {
  if (!item.automationType || !item.entityType || !item.entityId) return null
  return `${item.automationType}:${item.entityType}:${item.entityId}`
}

function historyAutomationKey(run: {
  automationType: string
  entityType: string
  entityId: string
}) {
  return `${run.automationType}:${run.entityType}:${run.entityId}`
}

function recommendationToWorkbenchItem(item: RecommendationItem, category: OperationsWorkbenchItem['category']): OperationsWorkbenchItem {
  const payload = item.actionPayload || {}
  return {
    id: item.id,
    category,
    title: item.title,
    description: item.description,
    reason: item.reason,
    priority: item.priority,
    statusLabel: category === 'approval' ? 'En attente de votre accord' : null,
    dateLabel: null,
    entityType: item.entityType,
    entityId: item.entityId,
    entityLabel: null,
    projectId: typeof payload.projectId === 'string' ? payload.projectId : item.entityType === 'project' ? item.entityId : null,
    quoteId: typeof payload.quoteId === 'string' ? payload.quoteId : null,
    appointmentId: typeof payload.appointmentId === 'string' ? payload.appointmentId : item.entityType === 'appointment' ? item.entityId : null,
    clientName: null,
    projectTitle: null,
    primaryActionLabel: item.actionLabel,
    primaryActionType: item.actionType,
    primaryActionRoute: item.actionRoute,
    primaryActionPayload: item.actionPayload,
    secondaryActionLabel: item.secondaryLabel,
    secondaryActionType: item.secondaryAction,
    secondaryActionRoute: item.secondaryRoute,
    secondaryActionPayload: item.secondaryPayload,
    canExecuteDirectly: item.actionType === 'execute_automation_run',
    source: 'recommendation',
    sourceType: item.type,
  }
}

function runToWorkbenchItem(
  run: Awaited<ReturnType<typeof listAutomationRunsForCurrentTenant>>['runs'][number],
  category: OperationsWorkbenchItem['category'],
  now: Date,
): OperationsWorkbenchItem {
  return {
    id: `run-${run.id}`,
    category,
    title: run.automationTitle,
    description: run.entityLabel,
    reason: run.errorLabel || run.triggerReason,
    priority: category === 'attention' ? 'high' : 'normal',
    statusLabel:
      category === 'completed'
        ? 'Terminé'
        : category === 'attention'
          ? 'À vérifier'
          : category === 'approval'
            ? 'En attente de votre accord'
            : null,
    dateLabel: toRelativeDateLabel(run.completedAt || run.createdAt, now),
    entityType: run.entityType,
    entityId: run.entityId,
    entityLabel: run.entityLabel,
    projectId: run.entityType === 'project' ? run.entityId : null,
    quoteId: null,
    appointmentId: run.entityType === 'appointment' ? run.entityId : null,
    clientName: null,
    projectTitle: run.entityLabel,
    primaryActionLabel: run.canRetry ? 'Réessayer' : run.entityHref ? 'Ouvrir le dossier' : null,
    primaryActionType: run.canRetry ? null : 'open_project',
    primaryActionRoute: run.canRetry ? `/api/automations/runs/${run.id}/retry` : run.entityHref,
    primaryActionPayload: null,
    secondaryActionLabel: run.canRetry && run.entityHref ? 'Ouvrir le dossier' : null,
    secondaryActionType: run.canRetry ? 'open_project' : null,
    secondaryActionRoute: run.canRetry ? run.entityHref : null,
    secondaryActionPayload: null,
    canExecuteDirectly: run.canRetry,
    source: 'automation_run',
    sourceType: run.automationType,
  }
}

function buildWorkbench(input: {
  recommendations: RecommendationItem[]
  runs: Awaited<ReturnType<typeof listAutomationRunsForCurrentTenant>>['runs']
  now: Date
  activeAutomationCount: number
  canReadAutomations: boolean
  canManageAutomations: boolean
}) {
  const approvalRuns = input.runs.filter((run) => run.status === 'prepared')
  const failedRuns = input.runs.filter((run) => run.status === 'failed')
  const succeededRuns = input.runs.filter((run) => run.status === 'succeeded').slice(0, 5)

  const runKeys = new Set(input.runs.map(historyAutomationKey))

  const waitingForApproval = input.recommendations
    .filter((item) => item.automationLabel === 'A valider')
    .filter((item) => {
      const key = recommendationAutomationKey(item)
      return key ? runKeys.has(key) : true
    })
    .map((item) => recommendationToWorkbenchItem(item, 'approval'))

  const todayActions = input.recommendations
    .filter((item) => item.automationLabel !== 'A valider')
    .filter((item) => {
      const key = recommendationAutomationKey(item)
      return key ? !runKeys.has(key) : true
    })
    .slice(0, 6)
    .map((item) => recommendationToWorkbenchItem(item, 'today'))

  const needsAttention = [
    ...failedRuns.map((run) => runToWorkbenchItem(run, 'attention', input.now)),
    ...input.recommendations
      .filter((item) => item.priority === 'critical' || item.priority === 'high')
      .filter((item) => item.automationLabel !== 'A valider')
      .filter((item) => {
        const key = recommendationAutomationKey(item)
        return key ? !runKeys.has(key) : true
      })
      .slice(0, 4)
      .map((item) => recommendationToWorkbenchItem(item, 'attention')),
  ]

  const recentlyCompleted = succeededRuns.map((run) => runToWorkbenchItem(run, 'completed', input.now))

  return {
    todayActions,
    waitingForApproval,
    recentlyCompleted,
    needsAttention,
    summary: {
      activeAutomationCount: input.activeAutomationCount,
      todayCount: todayActions.length,
      approvalCount: approvalRuns.length,
      completedTodayCount: succeededRuns.length,
      attentionCount: needsAttention.length,
    },
    permissions: {
      canReadAutomations: input.canReadAutomations,
      canManageAutomations: input.canManageAutomations,
    },
  }
}

export async function GET() {
  let stage = 'session'
  try {
    const now = new Date()
    const session = await getSession()
    if (!session?.artisanId) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    stage = 'tenant_context'
    const tenantContext = await getCurrentTenantContext()
    stage = 'schema_capabilities'
    const supportsTenantId = await tableHasColumn(TABLES.projects, 'tenant_id')
    const supportsResponsibleUser = await projectResponsibilityColumnExists()
    const canReadAllProjects = checkPermission(tenantContext, 'projects.read_all')
    const canReadAssignedProjects = checkPermission(tenantContext, 'projects.read_assigned')
    const canReadAutomations = checkPermission(tenantContext, 'automations.read')
    const canManageAutomations = checkPermission(tenantContext, 'automations.manage')

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
      .select('id, project_id, tenant_id, artisan_id, assigned_user_id, start_time, end_time, title, location')
      .order('start_time', { ascending: true })
      .limit(240)

    stage = 'parallel_queries'
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

    stage = 'projects_query_result'
    if (projectsRes.error) throw projectsRes.error

    const rawProjectRows = (projectsRes.data || []) as Record<string, unknown>[]
    const rawProjects = rawProjectRows.map(mapSupabaseProject)
    let visibleProjects = rawProjects

    if (tenantContext?.tenantId && !canReadAllProjects && !canReadAssignedProjects) {
      visibleProjects = []
    } else if (tenantContext?.tenantId && !canReadAllProjects && canReadAssignedProjects) {
      stage = 'assigned_project_scope'
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

    stage = 'appointments_query'
    const appointmentsRes = await appointmentsScoped
    stage = 'appointments_query_result'
    if (appointmentsRes.error) throw appointmentsRes.error

    stage = 'appointments_normalize'
    const userNames = new Map(
      members
        .filter((member) => member.userId)
        .map((member) => [member.userId, [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.email || 'Collaborateur'] as const),
    )

    const visibleProjectIds = new Set(visibleProjects.map((project) => project.id))
    const projectCoordinatesById = new Map(
      rawProjectRows
        .map((row) => {
          const id = typeof row.id === 'string' ? row.id : ''
          if (!id) return null
          return [
            id,
            {
              latitude: typeof row.latitude === 'number' ? row.latitude : null,
              longitude: typeof row.longitude === 'number' ? row.longitude : null,
            },
          ] as const
        })
        .filter((entry): entry is readonly [string, { latitude: number | null; longitude: number | null }] => entry !== null),
    )
    const appointments = ((appointmentsRes.data || []) as unknown[])
      .filter(isAppointmentRow)
      .filter((row) => !row.project_id || visibleProjectIds.has(row.project_id))
      .map((row) => {
        const coordinates = row.project_id ? projectCoordinatesById.get(row.project_id) : null
        return mapAppointmentForRecommendations(
          {
            ...row,
            latitude: coordinates?.latitude ?? null,
            longitude: coordinates?.longitude ?? null,
          },
          userNames,
        )
      })

    stage = 'activities_normalize'
    const activities = ((activityRes.data || []) as unknown[]).filter(isActivityRow)
    const reviewRequestedProjectIds = new Set(
      activities
        .filter((activity) => activity.action === 'GOOGLE_REVIEW_REQUEST_SENT' && activity.project_id && visibleProjectIds.has(activity.project_id))
        .map((activity) => String(activity.project_id)),
    )

    stage = 'build_operations_center'
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

    if (tenantContext?.tenantId && canReadAutomations) {
      stage = 'automation_metadata'
      const metadata = await buildAutomationMetadataForTenant(tenantContext.tenantId).catch(() => ({ automations: [], runs: [] }))
      const automationHistory = await listAutomationRunsForCurrentTenant(
        {
          page: 1,
          limit: 12,
          status: ['prepared', 'failed', 'succeeded'],
        },
        tenantContext,
      ).catch(() => ({ runs: [] as Awaited<ReturnType<typeof listAutomationRunsForCurrentTenant>>['runs'] }))
      stage = 'merge_automation_metadata'
      const recommendations = withAutomationMetadata(operationsCenter.recommendations, metadata.automations, metadata.runs)
      const todayFocus = withAutomationMetadata(operationsCenter.todayFocus, metadata.automations, metadata.runs)
      const opportunities = withAutomationMetadata(operationsCenter.opportunities, metadata.automations, metadata.runs)
      const risks = withAutomationMetadata(operationsCenter.risks, metadata.automations, metadata.runs)
      const groupedActions = {
        relances: withAutomationMetadata(operationsCenter.groupedActions.relances, metadata.automations, metadata.runs),
        planifications: withAutomationMetadata(operationsCenter.groupedActions.planifications, metadata.automations, metadata.runs),
        affectations: withAutomationMetadata(operationsCenter.groupedActions.affectations, metadata.automations, metadata.runs),
        avis: withAutomationMetadata(operationsCenter.groupedActions.avis, metadata.automations, metadata.runs),
        configuration: withAutomationMetadata(operationsCenter.groupedActions.configuration, metadata.automations, metadata.runs),
      }
      operationsCenter = {
        ...operationsCenter,
        recommendations,
        todayFocus,
        opportunities,
        risks,
        groupedActions,
        workbench: buildWorkbench({
          recommendations,
          runs: automationHistory.runs,
          now,
          activeAutomationCount: metadata.automations.filter((automation) => automation.enabled).length,
          canReadAutomations,
          canManageAutomations,
        }),
      }
    } else {
      operationsCenter = {
        ...operationsCenter,
        workbench: buildWorkbench({
          recommendations: operationsCenter.recommendations,
          runs: [],
          now,
          activeAutomationCount: 0,
          canReadAutomations: false,
          canManageAutomations: false,
        }),
      }
    }

    stage = 'response'
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
    console.error('[OPERATIONS_CENTER]', {
      stage,
      error: describeOperationsCenterError(error),
    })
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

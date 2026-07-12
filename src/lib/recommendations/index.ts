import { calculateOpportunityScore, getProjectRiskStatus, isHotLead } from '@/src/lib/commercial-actions'
import { computeSetupProgress } from '@/src/lib/setup-progress'

export type RecommendationPriority = 'critical' | 'high' | 'normal' | 'low'
export type RecommendationSeverity = 'critical' | 'high' | 'medium' | 'low'
export type RecommendationCategory =
  | 'Commercial'
  | 'Planning'
  | 'Devis'
  | 'Clients'
  | 'Chantiers'
  | 'Equipe'
  | 'Avis'
  | 'Configuration'

export type RecommendationEntityType = 'project' | 'appointment' | 'member' | 'configuration'
export type RecommendationActionType =
  | 'open_project'
  | 'open_project_callback'
  | 'open_quote_create'
  | 'open_quote_followup'
  | 'open_schedule_appointment'
  | 'open_review_request'
  | 'open_responsible_selector'
  | 'open_project_completion'
  | 'open_planning'
  | 'open_planning_conflict'
  | 'open_assign_appointment'
  | 'open_settings_company'
  | 'open_settings_profile'
  | 'open_settings_calendar'
  | 'open_settings_catalog'

export interface RecommendationActionDescriptor {
  actionType: RecommendationActionType
  actionLabel: string
  actionRoute: string
  actionPayload?: Record<string, string | number | boolean | null> | null
}

export interface RecommendationItem {
  id: string
  type: string
  priority: RecommendationPriority
  title: string
  description: string
  actionType: RecommendationActionType
  actionLabel: string
  actionRoute: string
  actionPayload: Record<string, string | number | boolean | null> | null
  secondaryAction: RecommendationActionType | null
  secondaryLabel: string | null
  secondaryRoute: string | null
  secondaryPayload: Record<string, string | number | boolean | null> | null
  isExecutable: boolean
  estimatedMinutes: number | null
  entityType: RecommendationEntityType
  entityId: string | null
  severity: RecommendationSeverity
  createdAt: string
  category: RecommendationCategory
  reason: string
  score: number
}

export interface OperationsHealthBreakdownItem {
  label: string
  value: string
  status: 'good' | 'warning' | 'critical'
}

export interface OperationsHealthSummary {
  score: number
  label: 'Excellent' | 'Bon' | 'A ameliorer' | 'Critique'
  breakdown: OperationsHealthBreakdownItem[]
}

export interface CommercialLoadItem {
  userId: string
  name: string
  role: string
  projectCount: number
  prospectsCount: number
  quotesCount: number
  wonCount: number
  lostCount: number
  estimatedRevenue: number
  commercialScore: number
}

export interface FieldLoadItem {
  userId: string
  name: string
  role: string
  appointmentCount: number
  plannedMinutes: number
  freeMinutes: number
  conflicts: number
  estimatedKm: number
  incoherentTravelCount: number
  availability: 'available' | 'soon' | 'busy'
}

export interface RecommendationBucket {
  relances: RecommendationItem[]
  planifications: RecommendationItem[]
  affectations: RecommendationItem[]
  avis: RecommendationItem[]
  configuration: RecommendationItem[]
}

export interface OperationsCenterResult {
  generatedAt: string
  recommendations: RecommendationItem[]
  todayFocus: RecommendationItem[]
  opportunities: RecommendationItem[]
  risks: RecommendationItem[]
  groupedActions: RecommendationBucket
  health: OperationsHealthSummary
  commercialLoad: CommercialLoadItem[]
  fieldLoad: FieldLoadItem[]
}

export interface RecommendationProjectInput {
  id: string
  status: string
  clientName: string
  clientFirstName: string
  clientEmail: string
  clientPhone: string
  city: string
  trade: string
  projectType: string
  budget: string
  desiredTimeline: string
  maturity: string
  completenessScore: number
  createdAt: string
  updatedAt: string
  callbackDate: string
  quoteSentAt: string | null
  acceptedAt: string | null
  lastFollowUpAt: string | null
  depositStatus: string
  responsibleUserId: string | null
  completionCompletedAt: string | null
}

export interface RecommendationAppointmentInput {
  id: string
  projectId: string | null
  assignedUserId: string | null
  assignedUserName: string | null
  start: string | null
  end: string | null
  title: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
}

export interface RecommendationMemberInput {
  userId: string
  name: string
  role: string
  status: string
}

export interface RecommendationConfigInput {
  artisanConfig: {
    companyName?: string | null
    phone?: string | null
    villePro?: string | null
    address?: string | null
    googleReviewUrl?: string | null
    businessConfig?: {
      calendarMode?: string | null
      serviceCatalog?: unknown[] | null
    } | null
  } | null
  businessProfile: {
    primaryTrade?: string | null
    baseCity?: string | null
    interventionRadiusKm?: string | number | null
    hourlyRateHt?: string | number | null
    defaultVatRate?: string | number | null
    workingDays?: string[] | null
    workStartTime?: string | null
    workEndTime?: string | null
  } | null
  serviceProfilesCount: number
  googleCalendarConnected: boolean
}

export interface BuildOperationsCenterInput {
  now?: Date
  projects: RecommendationProjectInput[]
  appointments: RecommendationAppointmentInput[]
  members: RecommendationMemberInput[]
  config: RecommendationConfigInput
  reviewRequestedProjectIds: Set<string>
}

function daysSince(value: string | null | undefined, now: Date) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000))
}

function minutesUntil(value: string | null | undefined, now: Date) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.round((date.getTime() - now.getTime()) / 60000)
}

function formatReasonDays(days: number, suffix: string) {
  return `${suffix} depuis ${days} jour${days > 1 ? 's' : ''}.`
}

function parseBudget(value: string) {
  const matches = value.match(/\d+[\s\d]*/g)
  if (!matches) return 0
  return (
    matches
      .map((chunk) => Number.parseInt(chunk.replace(/\s/g, ''), 10))
      .filter((amount) => Number.isFinite(amount) && amount > 0)
      .sort((a, b) => b - a)[0] || 0
  )
}

function priorityFromScore(score: number): RecommendationPriority {
  if (score >= 90) return 'critical'
  if (score >= 72) return 'high'
  if (score >= 48) return 'normal'
  return 'low'
}

function severityFromPriority(priority: RecommendationPriority): RecommendationSeverity {
  if (priority === 'critical') return 'critical'
  if (priority === 'high') return 'high'
  if (priority === 'normal') return 'medium'
  return 'low'
}

function recommendation(params: {
  id: string
  type: string
  score: number
  title: string
  description: string
  reason: string
  action: RecommendationActionDescriptor
  secondaryAction?: RecommendationActionDescriptor | null
  entityType: RecommendationEntityType
  entityId?: string | null
  category: RecommendationCategory
  createdAt: string
  estimatedMinutes?: number | null
}): RecommendationItem {
  const priority = priorityFromScore(params.score)
  return {
    id: params.id,
    type: params.type,
    priority,
    title: params.title,
    description: params.description,
    actionType: params.action.actionType,
    actionLabel: params.action.actionLabel,
    actionRoute: params.action.actionRoute,
    actionPayload: params.action.actionPayload || null,
    secondaryAction: params.secondaryAction?.actionType || null,
    secondaryLabel: params.secondaryAction?.actionLabel || null,
    secondaryRoute: params.secondaryAction?.actionRoute || null,
    secondaryPayload: params.secondaryAction?.actionPayload || null,
    isExecutable: true,
    estimatedMinutes: params.estimatedMinutes ?? null,
    entityType: params.entityType,
    entityId: params.entityId || null,
    severity: severityFromPriority(priority),
    createdAt: params.createdAt,
    category: params.category,
    reason: params.reason,
    score: params.score,
  }
}

function sameDay(value: string | null | undefined, date: Date) {
  if (!value) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date.toISOString().slice(0, 10)
}

function haversineDistanceKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRadians(latitudeB - latitudeA)
  const dLon = toRadians(longitudeB - longitudeA)
  const lat1 = toRadians(latitudeA)
  const lat2 = toRadians(latitudeB)
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

function projectRoute(projectId: string, focus?: string, extraParams?: Record<string, string | number | boolean | null>) {
  const params = new URLSearchParams()
  if (focus) params.set('focus', focus)
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value === null || value === undefined || value === false) continue
      params.set(key, String(value))
    }
  }
  const query = params.toString()
  return query ? `/dashboard-v2/projet/${projectId}?${query}` : `/dashboard-v2/projet/${projectId}`
}

function planningRoute(extraParams?: Record<string, string | number | boolean | null>) {
  const params = new URLSearchParams({ mode: 'calendar' })
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value === null || value === undefined || value === false) continue
      params.set(key, String(value))
    }
  }
  return `/dashboard-v2?${params.toString()}`
}

export function buildOperationsCenter(input: BuildOperationsCenterInput): OperationsCenterResult {
  const now = input.now || new Date()
  const recommendations: RecommendationItem[] = []

  const progress = computeSetupProgress({
    artisanConfig: input.config.artisanConfig,
    businessProfile: input.config.businessProfile,
    serviceProfiles: Array.from({ length: input.config.serviceProfilesCount }, (_, index) => ({ id: String(index) })),
    calendarIntegration: { connected: input.config.googleCalendarConnected },
  })

  for (const project of input.projects) {
    const ageDays = daysSince(project.createdAt, now) || 0
    const quoteAgeDays = daysSince(project.quoteSentAt, now)
    const inactivityDays = daysSince(project.lastFollowUpAt || project.updatedAt || project.callbackDate || project.createdAt, now)
    const opportunityScore = calculateOpportunityScore({
      id: project.id,
      status: project.status,
      completenessScore: project.completenessScore,
      budget: project.budget,
      desiredTimeline: project.desiredTimeline,
      maturity: project.maturity,
      createdAt: project.createdAt,
      callbackDate: project.callbackDate,
      updatedAt: project.updatedAt,
      lastFollowUpAt: project.lastFollowUpAt,
      city: project.city,
      projectType: project.projectType,
      trade: project.trade,
      clientFirstName: project.clientFirstName,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
    })
    const risk = getProjectRiskStatus({
      status: project.status,
      completenessScore: project.completenessScore,
      budget: project.budget,
      desiredTimeline: project.desiredTimeline,
      maturity: project.maturity,
      createdAt: project.createdAt,
      callbackDate: project.callbackDate,
      updatedAt: project.updatedAt,
      lastInteractionAt: project.lastFollowUpAt || project.updatedAt,
      quoteSentAt: project.quoteSentAt,
      city: project.city,
      projectType: project.projectType,
      trade: project.trade,
      clientFirstName: project.clientFirstName,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
    })

    if ((project.status === 'QualifiÃ©' || project.status === 'Ã€ rappeler') && !project.callbackDate) {
      recommendations.push(
        recommendation({
          id: `callback-${project.id}`,
          type: 'set_callback',
          score: 58 + Math.min(ageDays, 10),
          title: 'Definir un rappel',
          description: 'Le dossier est qualifie mais aucun rappel n est planifie.',
          reason: 'Prospect qualifie sans rappel defini.',
          action: {
            actionType: 'open_project_callback',
            actionLabel: 'Definir un rappel',
            actionRoute: projectRoute(project.id, 'callback'),
            actionPayload: { projectId: project.id, focus: 'callback' },
          },
          secondaryAction: {
            actionType: 'open_project',
            actionLabel: 'Voir dossier',
            actionRoute: projectRoute(project.id),
            actionPayload: { projectId: project.id },
          },
          entityType: 'project',
          entityId: project.id,
          category: 'Commercial',
          createdAt: project.createdAt || now.toISOString(),
          estimatedMinutes: 1,
        }),
      )
    }

    if (isHotLead(project) && !project.quoteSentAt && project.status !== 'GagnÃ©' && ageDays >= 2) {
      recommendations.push(
        recommendation({
          id: `prepare-quote-${project.id}`,
          type: 'prepare_quote',
          score: 72 + Math.min(opportunityScore / 5, 18),
          title: 'Preparer un devis',
          description: 'Le dossier montre des signaux commerciaux forts et peut etre chiffre.',
          reason: `Prospect chaud sans devis depuis ${ageDays} jour${ageDays > 1 ? 's' : ''}.`,
          action: {
            actionType: 'open_quote_create',
            actionLabel: 'Preparer un devis',
            actionRoute: `/dashboard-v2/projet/${project.id}/devis/new`,
            actionPayload: { projectId: project.id },
          },
          secondaryAction: {
            actionType: 'open_project',
            actionLabel: 'Voir dossier',
            actionRoute: projectRoute(project.id),
            actionPayload: { projectId: project.id },
          },
          entityType: 'project',
          entityId: project.id,
          category: 'Devis',
          createdAt: project.createdAt || now.toISOString(),
          estimatedMinutes: 3,
        }),
      )
    }

    if (quoteAgeDays !== null && quoteAgeDays >= 5 && !project.acceptedAt && project.status !== 'Perdu') {
      recommendations.push(
        recommendation({
          id: `followup-${project.id}`,
          type: 'follow_up_quote',
          score: 76 + Math.min(quoteAgeDays, 14),
          title: 'Relancer le client',
          description: 'Le devis a ete envoye et merite une relance.',
          reason: `Le devis est envoye depuis ${quoteAgeDays} jours.`,
          action: {
            actionType: 'open_quote_followup',
            actionLabel: 'Relancer',
            actionRoute: projectRoute(project.id, 'quote_followup', { tab: 'devis' }),
            actionPayload: { projectId: project.id, tab: 'devis', focus: 'quote_followup' },
          },
          secondaryAction: {
            actionType: 'open_project',
            actionLabel: 'Voir dossier',
            actionRoute: projectRoute(project.id),
            actionPayload: { projectId: project.id },
          },
          entityType: 'project',
          entityId: project.id,
          category: 'Devis',
          createdAt: project.quoteSentAt || now.toISOString(),
          estimatedMinutes: 2,
        }),
      )
    }

    if ((project.status === 'GagnÃ©' || Boolean(project.acceptedAt)) && !input.appointments.some((appointment) => appointment.projectId === project.id)) {
      recommendations.push(
        recommendation({
          id: `plan-won-${project.id}`,
          type: 'schedule_intervention',
          score: 82,
          title: 'Planifier une intervention',
          description: 'Le dossier est gagne mais aucun rendez-vous terrain n est encore planifie.',
          reason: 'Projet gagne sans intervention programmee.',
          action: {
            actionType: 'open_schedule_appointment',
            actionLabel: 'Planifier',
            actionRoute: projectRoute(project.id, 'appointment', { openAppointment: 1 }),
            actionPayload: { projectId: project.id, openAppointment: true },
          },
          secondaryAction: {
            actionType: 'open_planning',
            actionLabel: 'Voir planning',
            actionRoute: planningRoute({ projectId: project.id }),
            actionPayload: { projectId: project.id },
          },
          entityType: 'project',
          entityId: project.id,
          category: 'Planning',
          createdAt: project.acceptedAt || project.createdAt || now.toISOString(),
          estimatedMinutes: 1,
        }),
      )
    }

    if (project.completionCompletedAt && !input.reviewRequestedProjectIds.has(project.id)) {
      recommendations.push(
        recommendation({
          id: `review-${project.id}`,
          type: 'request_review',
          score: 64,
          title: 'Envoyer une demande d avis',
          description: 'Le chantier semble termine et aucun avis n a encore ete demande.',
          reason: 'Projet termine sans demande d avis envoyee.',
          action: {
            actionType: 'open_review_request',
            actionLabel: 'Envoyer avis',
            actionRoute: projectRoute(project.id, 'review'),
            actionPayload: { projectId: project.id, focus: 'review' },
          },
          secondaryAction: {
            actionType: 'open_project',
            actionLabel: 'Voir dossier',
            actionRoute: projectRoute(project.id),
            actionPayload: { projectId: project.id },
          },
          entityType: 'project',
          entityId: project.id,
          category: 'Avis',
          createdAt: project.completionCompletedAt,
          estimatedMinutes: 2,
        }),
      )
    }

    if (!project.responsibleUserId) {
      recommendations.push(
        recommendation({
          id: `assign-responsible-${project.id}`,
          type: 'assign_responsible',
          score: 68 + Math.min(ageDays, 10),
          title: 'Affecter un responsable',
          description: 'Le dossier n a pas encore de responsable commercial.',
          reason: 'Projet sans responsable commercial.',
          action: {
            actionType: 'open_responsible_selector',
            actionLabel: 'Affecter',
            actionRoute: projectRoute(project.id, 'responsible', { openResponsible: 1 }),
            actionPayload: { projectId: project.id, openResponsible: true },
          },
          secondaryAction: {
            actionType: 'open_project',
            actionLabel: 'Voir dossier',
            actionRoute: projectRoute(project.id),
            actionPayload: { projectId: project.id },
          },
          entityType: 'project',
          entityId: project.id,
          category: 'Equipe',
          createdAt: project.createdAt || now.toISOString(),
          estimatedMinutes: 1,
        }),
      )
    }

    if (inactivityDays !== null && inactivityDays >= 10 && project.status !== 'GagnÃ©' && project.status !== 'Perdu') {
      recommendations.push(
        recommendation({
          id: `inactive-${project.id}`,
          type: 'inactive_project',
          score: 70 + Math.min(inactivityDays, 12),
          title: 'Le dossier semble abandonne',
          description: 'Aucune activite recente visible sur ce dossier.',
          reason: formatReasonDays(inactivityDays, 'Aucune activite'),
          action: {
            actionType: 'open_project',
            actionLabel: 'Reouvrir le dossier',
            actionRoute: projectRoute(project.id, 'activity'),
            actionPayload: { projectId: project.id, focus: 'activity' },
          },
          entityType: 'project',
          entityId: project.id,
          category: 'Clients',
          createdAt: project.updatedAt || project.createdAt || now.toISOString(),
          estimatedMinutes: 2,
        }),
      )
    }

    if (project.completenessScore < 60 && project.status !== 'GagnÃ©' && project.status !== 'Perdu') {
      recommendations.push(
        recommendation({
          id: `complete-${project.id}`,
          type: 'complete_information',
          score: 52 + Math.max(0, 60 - project.completenessScore) / 2,
          title: 'Completer les informations',
          description: 'Le dossier manque encore d elements pour etre exploitable rapidement.',
          reason: `Completude du dossier a ${project.completenessScore}%.`,
          action: {
            actionType: 'open_project_completion',
            actionLabel: 'Completer',
            actionRoute: projectRoute(project.id, 'completion'),
            actionPayload: { projectId: project.id, focus: 'completion' },
          },
          entityType: 'project',
          entityId: project.id,
          category: 'Chantiers',
          createdAt: project.createdAt || now.toISOString(),
          estimatedMinutes: 3,
        }),
      )
    }

    if (risk.status === 'followUp') {
      recommendations.push(
        recommendation({
          id: `risk-followup-${project.id}`,
          type: 'risk_followup',
          score: 66,
          title: 'Relancer ce dossier',
          description: 'Le suivi commercial montre un risque de refroidissement.',
          reason: risk.reason,
          action: {
            actionType: 'open_project',
            actionLabel: 'Voir dossier',
            actionRoute: projectRoute(project.id, 'actions'),
            actionPayload: { projectId: project.id, focus: 'actions' },
          },
          entityType: 'project',
          entityId: project.id,
          category: 'Commercial',
          createdAt: project.updatedAt || project.createdAt || now.toISOString(),
          estimatedMinutes: 2,
        }),
      )
    }
  }

  const appointmentsByMember = new Map<string, RecommendationAppointmentInput[]>()
  for (const appointment of input.appointments) {
    const key = appointment.assignedUserId || '__unassigned__'
    if (!appointmentsByMember.has(key)) appointmentsByMember.set(key, [])
    appointmentsByMember.get(key)!.push(appointment)

    if (!appointment.assignedUserId) {
      recommendations.push(
        recommendation({
          id: `appointment-unassigned-${appointment.id}`,
          type: 'assign_collaborator',
          score: 73,
          title: 'Affecter un collaborateur',
          description: 'Ce rendez-vous est planifie sans personne affectee.',
          reason: 'Rendez-vous sans collaborateur.',
          action: {
            actionType: 'open_assign_appointment',
            actionLabel: 'Affecter',
            actionRoute: planningRoute({ focus: 'assign', appointmentId: appointment.id }),
            actionPayload: { appointmentId: appointment.id, focus: 'assign' },
          },
          entityType: 'appointment',
          entityId: appointment.id,
          category: 'Planning',
          createdAt: appointment.start || now.toISOString(),
          estimatedMinutes: 1,
        }),
      )
    }
  }

  const fieldLoad: FieldLoadItem[] = input.members
    .filter((member) => member.status === 'active' && member.role !== 'viewer')
    .map((member) => {
      const appointments = (appointmentsByMember.get(member.userId) || [])
        .filter((appointment) => sameDay(appointment.start, now))
        .sort((a, b) => new Date(a.start || '').getTime() - new Date(b.start || '').getTime())

      let plannedMinutes = 0
      let conflicts = 0
      let estimatedKm = 0
      let incoherentTravelCount = 0

      for (let index = 0; index < appointments.length; index += 1) {
        const appointment = appointments[index]
        const start = appointment.start ? new Date(appointment.start) : null
        const end = appointment.end ? new Date(appointment.end) : null
        if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
          plannedMinutes += Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
        }

        const previous = index > 0 ? appointments[index - 1] : null
        if (previous?.end && appointment.start) {
          const previousEnd = new Date(previous.end)
          const currentStart = new Date(appointment.start)
          if (previousEnd > currentStart) {
            conflicts += 1
            recommendations.push(
              recommendation({
                id: `conflict-${previous.id}-${appointment.id}`,
                type: 'planning_conflict',
                score: 88,
                title: 'Deux rendez-vous se chevauchent',
                description: 'Deux interventions sont superposees pour le meme collaborateur.',
                reason: `${member.name} a un chevauchement entre ${previous.title || 'un rendez-vous'} et ${appointment.title || 'un rendez-vous'}.`,
                action: {
                  actionType: 'open_planning_conflict',
                  actionLabel: 'Voir conflit',
                  actionRoute: planningRoute({
                    focus: 'conflict',
                    appointmentId: appointment.id,
                    conflictingAppointmentId: previous.id,
                    assignedUserId: member.userId,
                  }),
                  actionPayload: {
                    appointmentId: appointment.id,
                    conflictingAppointmentId: previous.id,
                    assignedUserId: member.userId,
                  },
                },
                entityType: 'appointment',
                entityId: appointment.id,
                category: 'Planning',
                createdAt: appointment.start || now.toISOString(),
                estimatedMinutes: 2,
              }),
            )
          }

          const gapMinutes = Math.round((currentStart.getTime() - previousEnd.getTime()) / 60000)
          if (
            gapMinutes < 30 &&
            typeof previous.latitude === 'number' &&
            typeof previous.longitude === 'number' &&
            typeof appointment.latitude === 'number' &&
            typeof appointment.longitude === 'number'
          ) {
            const distanceKm = haversineDistanceKm(previous.latitude, previous.longitude, appointment.latitude, appointment.longitude)
            estimatedKm += distanceKm
            if (distanceKm > 15) {
              incoherentTravelCount += 1
              recommendations.push(
                recommendation({
                  id: `travel-${previous.id}-${appointment.id}`,
                  type: 'travel_warning',
                  score: 74,
                  title: 'Verifier l ordre des interventions',
                  description: 'Le temps entre deux rendez-vous semble trop court pour le trajet prevu.',
                  reason: `${member.name} dispose de ${gapMinutes} min pour environ ${distanceKm.toFixed(1)} km.`,
                  action: {
                    actionType: 'open_planning_conflict',
                    actionLabel: 'Verifier ordre',
                    actionRoute: planningRoute({
                      focus: 'travel',
                      appointmentId: appointment.id,
                      conflictingAppointmentId: previous.id,
                      assignedUserId: member.userId,
                    }),
                    actionPayload: {
                      appointmentId: appointment.id,
                      conflictingAppointmentId: previous.id,
                      assignedUserId: member.userId,
                    },
                  },
                  entityType: 'appointment',
                  entityId: appointment.id,
                  category: 'Planning',
                  createdAt: appointment.start || now.toISOString(),
                  estimatedMinutes: 2,
                }),
              )
            }
          }
        }
      }

      const upcomingMinutes = appointments.map((appointment) => minutesUntil(appointment.start, now)).filter((value): value is number => value !== null)
      const hasCurrentAppointment = appointments.some((appointment) => {
        if (!appointment.start || !appointment.end) return false
        const start = new Date(appointment.start)
        const end = new Date(appointment.end)
        return start <= now && end >= now
      })
      const availability: FieldLoadItem['availability'] =
        hasCurrentAppointment ? 'busy' : upcomingMinutes.some((value) => value >= 0 && value <= 60) ? 'soon' : 'available'

      if (appointments.length >= 6 || plannedMinutes >= 420) {
        recommendations.push(
          recommendation({
            id: `load-${member.userId}`,
            type: 'member_overloaded',
            score: 69 + Math.min(conflicts * 4, 12),
            title: 'Repartir la charge',
            description: 'La journee de ce collaborateur semble deja tres dense.',
            reason: `${member.name} a ${appointments.length} rendez-vous et ${plannedMinutes} minutes planifiees aujourd'hui.`,
            action: {
              actionType: 'open_planning',
              actionLabel: 'Voir planning',
              actionRoute: planningRoute({ filter: member.userId }),
              actionPayload: { assignedUserId: member.userId },
            },
            entityType: 'member',
            entityId: member.userId,
            category: 'Equipe',
            createdAt: now.toISOString(),
            estimatedMinutes: 2,
          }),
        )
      }

      if (appointments.length === 0) {
        recommendations.push(
          recommendation({
            id: `available-${member.userId}`,
            type: 'member_available',
            score: 42,
            title: 'Disponible aujourd hui',
            description: 'Ce collaborateur n a aucune intervention planifiee aujourd hui.',
            reason: `${member.name} n a aucun rendez-vous aujourd hui.`,
            action: {
              actionType: 'open_planning',
              actionLabel: 'Voir planning',
              actionRoute: planningRoute({ filter: member.userId }),
              actionPayload: { assignedUserId: member.userId },
            },
            entityType: 'member',
            entityId: member.userId,
            category: 'Equipe',
            createdAt: now.toISOString(),
            estimatedMinutes: 1,
          }),
        )
      }

      return {
        userId: member.userId,
        name: member.name,
        role: member.role,
        appointmentCount: appointments.length,
        plannedMinutes,
        freeMinutes: Math.max(0, 480 - plannedMinutes),
        conflicts,
        estimatedKm: Number(estimatedKm.toFixed(1)),
        incoherentTravelCount,
        availability,
      }
    })

  if (!input.config.googleCalendarConnected) {
    recommendations.push(
      recommendation({
        id: 'config-calendar',
        type: 'connect_google_calendar',
        score: 49,
        title: 'Connecter Google Calendar',
        description: 'La connexion Google Calendar ameliore le suivi de vos rendez-vous.',
        reason: 'Agenda Google non connecte.',
        action: {
          actionType: 'open_settings_calendar',
          actionLabel: 'Connecter',
          actionRoute: '/dashboard-v2?mode=calendar',
          actionPayload: { mode: 'calendar', focus: 'google_connect' },
        },
        entityType: 'configuration',
        category: 'Configuration',
        createdAt: now.toISOString(),
        estimatedMinutes: 3,
      }),
    )
  }

  const missingConfigSteps = progress.steps.filter((step) => step.status === 'todo').sort((a, b) => a.priority - b.priority)
  const businessIncomplete = missingConfigSteps.find((step) => step.key === 'entreprise')
  if (businessIncomplete) {
    recommendations.push(
      recommendation({
        id: 'config-company',
        type: 'complete_company',
        score: 60,
        title: 'Completer les informations entreprise',
        description: 'Certaines informations de base manquent encore pour fiabiliser votre cockpit.',
        reason: 'Entreprise incomplete.',
        action: {
          actionType: 'open_settings_company',
          actionLabel: 'Completer',
          actionRoute: businessIncomplete.href,
          actionPayload: { section: 'entreprise' },
        },
        entityType: 'configuration',
        category: 'Configuration',
        createdAt: now.toISOString(),
        estimatedMinutes: 3,
      }),
    )
  }

  const profileIncomplete = missingConfigSteps.find((step) => step.key === 'metier' || step.key === 'prestations' || step.key === 'tarifs')
  if (profileIncomplete) {
    recommendations.push(
      recommendation({
        id: 'config-profile',
        type: 'complete_business_profile',
        score: 58,
        title: 'Finaliser le profil metier',
        description: 'Le profil metier n est pas encore complet pour alimenter correctement les automatisations.',
        reason: `${profileIncomplete.label} reste a completer.`,
        action: {
          actionType: profileIncomplete.key === 'prestations' ? 'open_settings_catalog' : 'open_settings_profile',
          actionLabel: 'Completer',
          actionRoute: profileIncomplete.href,
          actionPayload: { step: profileIncomplete.key },
        },
        entityType: 'configuration',
        category: 'Configuration',
        createdAt: now.toISOString(),
        estimatedMinutes: 3,
      }),
    )
  }

  const commercialLoad: CommercialLoadItem[] = input.members
    .filter((member) => member.status === 'active' && member.role !== 'viewer')
    .map((member) => {
      const assignedProjects = input.projects.filter((project) => project.responsibleUserId === member.userId)
      const prospectsCount = assignedProjects.filter((project) => !project.quoteSentAt && project.status !== 'GagnÃ©' && project.status !== 'Perdu').length
      const quotesCount = assignedProjects.filter((project) => Boolean(project.quoteSentAt) && !project.acceptedAt).length
      const wonCount = assignedProjects.filter((project) => project.status === 'GagnÃ©' || Boolean(project.acceptedAt)).length
      const lostCount = assignedProjects.filter((project) => project.status === 'Perdu').length
      const estimatedRevenue = assignedProjects.reduce((sum, project) => sum + Math.max(0, parseBudget(project.budget)), 0)
      const averageScore = assignedProjects.length
        ? Math.round(
            assignedProjects.reduce(
              (sum, project) =>
                sum +
                calculateOpportunityScore({
                  id: project.id,
                  status: project.status,
                  completenessScore: project.completenessScore,
                  budget: project.budget,
                  desiredTimeline: project.desiredTimeline,
                  maturity: project.maturity,
                  createdAt: project.createdAt,
                  callbackDate: project.callbackDate,
                  updatedAt: project.updatedAt,
                  lastFollowUpAt: project.lastFollowUpAt,
                  city: project.city,
                  projectType: project.projectType,
                  trade: project.trade,
                  clientFirstName: project.clientFirstName,
                  clientName: project.clientName,
                  clientEmail: project.clientEmail,
                }),
              0,
            ) / assignedProjects.length,
          )
        : 0

      return {
        userId: member.userId,
        name: member.name,
        role: member.role,
        projectCount: assignedProjects.length,
        prospectsCount,
        quotesCount,
        wonCount,
        lostCount,
        estimatedRevenue,
        commercialScore: averageScore,
      }
    })

  const recommendationMap = new Map<string, RecommendationItem>()
  for (const item of recommendations) {
    const existing = recommendationMap.get(item.id)
    if (!existing || item.score > existing.score) recommendationMap.set(item.id, item)
  }

  const uniqueRecommendations = Array.from(recommendationMap.values()).sort((a, b) => b.score - a.score)
  const todayFocus = uniqueRecommendations.slice(0, 10)
  const opportunities = uniqueRecommendations.filter((item) => item.category === 'Commercial' || item.category === 'Devis' || item.category === 'Avis').slice(0, 6)
  const risks = uniqueRecommendations.filter((item) => item.priority === 'critical' || item.priority === 'high' || item.category === 'Planning' || item.category === 'Clients').slice(0, 6)

  const groupedActions: RecommendationBucket = {
    relances: uniqueRecommendations.filter((item) => item.type.includes('follow') || item.type.includes('callback')).slice(0, 6),
    planifications: uniqueRecommendations.filter((item) => item.type.includes('schedule') || item.type.includes('planning')).slice(0, 6),
    affectations: uniqueRecommendations.filter((item) => item.type.includes('assign')).slice(0, 6),
    avis: uniqueRecommendations.filter((item) => item.category === 'Avis').slice(0, 6),
    configuration: uniqueRecommendations.filter((item) => item.category === 'Configuration').slice(0, 6),
  }

  let healthScore = 100
  healthScore -= uniqueRecommendations.filter((item) => item.priority === 'critical').length * 8
  healthScore -= uniqueRecommendations.filter((item) => item.priority === 'high').length * 4
  healthScore -= fieldLoad.reduce((sum, member) => sum + member.conflicts * 4 + member.incoherentTravelCount * 3, 0)
  healthScore -= input.projects.filter((project) => !project.responsibleUserId).length * 3
  healthScore -= input.projects.filter((project) => project.completenessScore < 60).length * 2
  healthScore -= missingConfigSteps.length * 3
  healthScore = Math.max(0, Math.min(100, healthScore))

  const healthLabel: OperationsHealthSummary['label'] =
    healthScore >= 85 ? 'Excellent' : healthScore >= 65 ? 'Bon' : healthScore >= 40 ? 'A ameliorer' : 'Critique'

  return {
    generatedAt: now.toISOString(),
    recommendations: uniqueRecommendations,
    todayFocus,
    opportunities,
    risks,
    groupedActions,
    health: {
      score: healthScore,
      label: healthLabel,
      breakdown: [
        {
          label: 'Dossiers oublies',
          value: String(uniqueRecommendations.filter((item) => item.type === 'inactive_project').length),
          status: uniqueRecommendations.some((item) => item.type === 'inactive_project') ? 'warning' : 'good',
        },
        {
          label: 'Devis sans reponse',
          value: String(uniqueRecommendations.filter((item) => item.type === 'follow_up_quote').length),
          status: uniqueRecommendations.some((item) => item.type === 'follow_up_quote') ? 'warning' : 'good',
        },
        {
          label: 'Conflits planning',
          value: String(fieldLoad.reduce((sum, member) => sum + member.conflicts, 0)),
          status: fieldLoad.some((member) => member.conflicts > 0) ? 'critical' : 'good',
        },
        {
          label: 'Configuration',
          value: `${progress.percent}%`,
          status: progress.percent >= 80 ? 'good' : progress.percent >= 50 ? 'warning' : 'critical',
        },
      ],
    },
    commercialLoad,
    fieldLoad,
  }
}

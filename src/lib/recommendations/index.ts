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

export interface RecommendationAction {
  label: string
  href: string
}

export interface RecommendationItem {
  id: string
  type: string
  priority: RecommendationPriority
  title: string
  description: string
  action: RecommendationAction
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
  label: 'Excellent' | 'Bon' | 'À améliorer' | 'Critique'
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
  return matches
    .map((chunk) => Number.parseInt(chunk.replace(/\s/g, ''), 10))
    .filter((amount) => Number.isFinite(amount) && amount > 0)
    .sort((a, b) => b - a)[0] || 0
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
  action: RecommendationAction
  entityType: RecommendationEntityType
  entityId?: string | null
  category: RecommendationCategory
  createdAt: string
}): RecommendationItem {
  const priority = priorityFromScore(params.score)
  return {
    id: params.id,
    type: params.type,
    priority,
    title: params.title,
    description: params.description,
    action: params.action,
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

function haversineDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRadians(latitudeB - latitudeA)
  const dLon = toRadians(longitudeB - longitudeA)
  const lat1 = toRadians(latitudeA)
  const lat2 = toRadians(latitudeB)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
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

  const projectMap = new Map(input.projects.map((project) => [project.id, project] as const))
  const teamMap = new Map(input.members.map((member) => [member.userId, member] as const))

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

    if ((project.status === 'Qualifié' || project.status === 'À rappeler') && !project.callbackDate) {
      recommendations.push(recommendation({
        id: `callback-${project.id}`,
        type: 'set_callback',
        score: 58 + Math.min(ageDays, 10),
        title: 'Définir un rappel',
        description: 'Le dossier est qualifié mais aucun rappel n’est planifié.',
        reason: 'Prospect qualifié sans rappel défini.',
        action: { label: 'Ouvrir le dossier', href: `/dashboard-v2/projet/${project.id}` },
        entityType: 'project',
        entityId: project.id,
        category: 'Commercial',
        createdAt: project.createdAt || now.toISOString(),
      }))
    }

    if (isHotLead(project) && !project.quoteSentAt && project.status !== 'Gagné' && ageDays >= 2) {
      recommendations.push(recommendation({
        id: `prepare-quote-${project.id}`,
        type: 'prepare_quote',
        score: 72 + Math.min(opportunityScore / 5, 18),
        title: 'Préparer un devis',
        description: 'Le dossier montre des signaux commerciaux forts et peut être chiffré.',
        reason: `Prospect chaud sans devis depuis ${ageDays} jour${ageDays > 1 ? 's' : ''}.`,
        action: { label: 'Créer le devis', href: `/dashboard-v2/projet/${project.id}/devis/new` },
        entityType: 'project',
        entityId: project.id,
        category: 'Devis',
        createdAt: project.createdAt || now.toISOString(),
      }))
    }

    if (quoteAgeDays !== null && quoteAgeDays >= 5 && !project.acceptedAt && project.status !== 'Perdu') {
      recommendations.push(recommendation({
        id: `followup-${project.id}`,
        type: 'follow_up_quote',
        score: 76 + Math.min(quoteAgeDays, 14),
        title: 'Relancer le client',
        description: 'Le devis a été envoyé et mérite une relance pour éviter qu’il ne refroidisse.',
        reason: `Le devis est envoyé depuis ${quoteAgeDays} jours.`,
        action: { label: 'Ouvrir le dossier', href: `/dashboard-v2/projet/${project.id}` },
        entityType: 'project',
        entityId: project.id,
        category: 'Devis',
        createdAt: project.quoteSentAt || now.toISOString(),
      }))
    }

    if ((project.status === 'Gagné' || Boolean(project.acceptedAt)) && !input.appointments.some((appointment) => appointment.projectId === project.id)) {
      recommendations.push(recommendation({
        id: `plan-won-${project.id}`,
        type: 'schedule_intervention',
        score: 82,
        title: 'Planifier une intervention',
        description: 'Le dossier est gagné mais aucun rendez-vous terrain n’est encore planifié.',
        reason: 'Projet gagné sans intervention programmée.',
        action: { label: 'Ouvrir le planning', href: '/dashboard-v2?mode=calendar' },
        entityType: 'project',
        entityId: project.id,
        category: 'Planning',
        createdAt: project.acceptedAt || project.createdAt || now.toISOString(),
      }))
    }

    if (project.completionCompletedAt && !input.reviewRequestedProjectIds.has(project.id)) {
      recommendations.push(recommendation({
        id: `review-${project.id}`,
        type: 'request_review',
        score: 64,
        title: 'Envoyer une demande d’avis',
        description: 'Le chantier semble terminé et aucun avis n’a encore été demandé.',
        reason: 'Projet terminé sans demande d’avis envoyée.',
        action: { label: 'Ouvrir le dossier', href: `/dashboard-v2/projet/${project.id}` },
        entityType: 'project',
        entityId: project.id,
        category: 'Avis',
        createdAt: project.completionCompletedAt,
      }))
    }

    if (!project.responsibleUserId) {
      recommendations.push(recommendation({
        id: `assign-responsible-${project.id}`,
        type: 'assign_responsible',
        score: 68 + Math.min(ageDays, 10),
        title: 'Affecter un responsable',
        description: 'Le dossier est visible mais n’a pas encore de responsable commercial.',
        reason: 'Projet sans responsable commercial.',
        action: { label: 'Ouvrir le dossier', href: `/dashboard-v2/projet/${project.id}` },
        entityType: 'project',
        entityId: project.id,
        category: 'Equipe',
        createdAt: project.createdAt || now.toISOString(),
      }))
    }

    if (inactivityDays !== null && inactivityDays >= 10 && project.status !== 'Gagné' && project.status !== 'Perdu') {
      recommendations.push(recommendation({
        id: `inactive-${project.id}`,
        type: 'inactive_project',
        score: 70 + Math.min(inactivityDays, 12),
        title: 'Le dossier semble abandonné',
        description: 'Aucune activité récente visible sur ce dossier.',
        reason: formatReasonDays(inactivityDays, 'Aucune activité'),
        action: { label: 'Réouvrir le dossier', href: `/dashboard-v2/projet/${project.id}` },
        entityType: 'project',
        entityId: project.id,
        category: 'Clients',
        createdAt: project.updatedAt || project.createdAt || now.toISOString(),
      }))
    }

    if (project.completenessScore < 60 && project.status !== 'Gagné' && project.status !== 'Perdu') {
      recommendations.push(recommendation({
        id: `complete-${project.id}`,
        type: 'complete_information',
        score: 52 + Math.max(0, 60 - project.completenessScore) / 2,
        title: 'Compléter les informations',
        description: 'Le dossier manque encore d’éléments pour être exploitable rapidement.',
        reason: `Complétude du dossier à ${project.completenessScore}%.`,
        action: { label: 'Compléter le dossier', href: `/dashboard-v2/projet/${project.id}` },
        entityType: 'project',
        entityId: project.id,
        category: 'Chantiers',
        createdAt: project.createdAt || now.toISOString(),
      }))
    }

    if (risk.status === 'followUp') {
      recommendations.push(recommendation({
        id: `risk-followup-${project.id}`,
        type: 'risk_followup',
        score: 66,
        title: 'Relancer ce dossier',
        description: 'Le suivi commercial montre un risque de refroidissement.',
        reason: risk.reason,
        action: { label: 'Ouvrir le dossier', href: `/dashboard-v2/projet/${project.id}` },
        entityType: 'project',
        entityId: project.id,
        category: 'Commercial',
        createdAt: project.updatedAt || project.createdAt || now.toISOString(),
      }))
    }
  }

  const appointmentsByMember = new Map<string, RecommendationAppointmentInput[]>()
  for (const appointment of input.appointments) {
    const key = appointment.assignedUserId || '__unassigned__'
    if (!appointmentsByMember.has(key)) appointmentsByMember.set(key, [])
    appointmentsByMember.get(key)!.push(appointment)

    if (!appointment.assignedUserId) {
      recommendations.push(recommendation({
        id: `appointment-unassigned-${appointment.id}`,
        type: 'assign_collaborator',
        score: 73,
        title: 'Affecter un collaborateur',
        description: 'Ce rendez-vous est planifié sans personne affectée.',
        reason: 'Rendez-vous sans collaborateur.',
        action: { label: 'Ouvrir le planning', href: '/dashboard-v2?mode=calendar' },
        entityType: 'appointment',
        entityId: appointment.id,
        category: 'Planning',
        createdAt: appointment.start || now.toISOString(),
      }))
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
            recommendations.push(recommendation({
              id: `conflict-${previous.id}-${appointment.id}`,
              type: 'planning_conflict',
              score: 88,
              title: 'Deux rendez-vous se chevauchent',
              description: 'Deux interventions sont superposées pour le même collaborateur.',
              reason: `${member.name} a un chevauchement entre ${previous.title || 'un rendez-vous'} et ${appointment.title || 'un rendez-vous'}.`,
              action: { label: 'Voir le planning', href: '/dashboard-v2?mode=calendar' },
              entityType: 'appointment',
              entityId: appointment.id,
              category: 'Planning',
              createdAt: appointment.start || now.toISOString(),
            }))
          }

          const gapMinutes = Math.round((currentStart.getTime() - previousEnd.getTime()) / 60000)
          if (
            gapMinutes < 30 &&
            typeof previous.latitude === 'number' &&
            typeof previous.longitude === 'number' &&
            typeof appointment.latitude === 'number' &&
            typeof appointment.longitude === 'number'
          ) {
            const distanceKm = haversineDistanceKm(
              previous.latitude,
              previous.longitude,
              appointment.latitude,
              appointment.longitude,
            )
            estimatedKm += distanceKm
            if (distanceKm > 15) {
              incoherentTravelCount += 1
              recommendations.push(recommendation({
                id: `travel-${previous.id}-${appointment.id}`,
                type: 'travel_warning',
                score: 74,
                title: 'Vérifier l’ordre des interventions',
                description: 'Le temps entre deux rendez-vous semble trop court pour le trajet prévu.',
                reason: `${member.name} dispose de ${gapMinutes} min pour environ ${distanceKm.toFixed(1)} km.`,
                action: { label: 'Ouvrir le planning', href: '/dashboard-v2?mode=calendar' },
                entityType: 'appointment',
                entityId: appointment.id,
                category: 'Planning',
                createdAt: appointment.start || now.toISOString(),
              }))
            }
          }
        }
      }

      const upcomingMinutes = appointments
        .map((appointment) => minutesUntil(appointment.start, now))
        .filter((value): value is number => value !== null)
      const hasCurrentAppointment = appointments.some((appointment) => {
        if (!appointment.start || !appointment.end) return false
        const start = new Date(appointment.start)
        const end = new Date(appointment.end)
        return start <= now && end >= now
      })
      const availability: FieldLoadItem['availability'] =
        hasCurrentAppointment ? 'busy' : upcomingMinutes.some((value) => value >= 0 && value <= 60) ? 'soon' : 'available'

      if (appointments.length >= 6 || plannedMinutes >= 420) {
        recommendations.push(recommendation({
          id: `load-${member.userId}`,
          type: 'member_overloaded',
          score: 69 + Math.min(conflicts * 4, 12),
          title: 'Répartir la charge',
          description: 'La journée de ce collaborateur semble déjà très dense.',
          reason: `${member.name} a ${appointments.length} rendez-vous et ${plannedMinutes} minutes planifiées aujourd’hui.`,
          action: { label: 'Voir le planning', href: '/dashboard-v2?mode=calendar' },
          entityType: 'member',
          entityId: member.userId,
          category: 'Equipe',
          createdAt: now.toISOString(),
        }))
      }

      if (appointments.length === 0) {
        recommendations.push(recommendation({
          id: `available-${member.userId}`,
          type: 'member_available',
          score: 42,
          title: 'Disponible aujourd’hui',
          description: 'Ce collaborateur n’a aucune intervention planifiée aujourd’hui.',
          reason: `${member.name} n’a aucun rendez-vous aujourd’hui.`,
          action: { label: 'Ouvrir le planning', href: '/dashboard-v2?mode=calendar' },
          entityType: 'member',
          entityId: member.userId,
          category: 'Equipe',
          createdAt: now.toISOString(),
        }))
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
    recommendations.push(recommendation({
      id: 'config-calendar',
      type: 'connect_google_calendar',
      score: 49,
      title: 'Connecter Google Calendar',
      description: 'La connexion Google Calendar améliore le suivi de vos rendez-vous.',
      reason: 'Agenda Google non connecté.',
      action: { label: 'Ouvrir le planning', href: '/dashboard-v2?mode=calendar' },
      entityType: 'configuration',
      category: 'Configuration',
      createdAt: now.toISOString(),
    }))
  }

  const missingConfigSteps = progress.steps
    .filter((step) => step.status === 'todo')
    .sort((a, b) => a.priority - b.priority)

  const businessIncomplete = missingConfigSteps.find((step) => step.key === 'entreprise')
  if (businessIncomplete) {
    recommendations.push(recommendation({
      id: 'config-company',
      type: 'complete_company',
      score: 60,
      title: 'Compléter les informations entreprise',
      description: 'Certaines informations de base manquent encore pour fiabiliser votre cockpit.',
      reason: 'Entreprise incomplète.',
      action: { label: 'Ouvrir les paramètres', href: businessIncomplete.href },
      entityType: 'configuration',
      category: 'Configuration',
      createdAt: now.toISOString(),
    }))
  }

  const profileIncomplete = missingConfigSteps.find((step) => step.key === 'metier' || step.key === 'prestations' || step.key === 'tarifs')
  if (profileIncomplete) {
    recommendations.push(recommendation({
      id: 'config-profile',
      type: 'complete_business_profile',
      score: 58,
      title: 'Finaliser le profil métier',
      description: 'Le profil métier n’est pas encore complet pour alimenter correctement les automatisations.',
      reason: `${profileIncomplete.label} reste à compléter.`,
      action: { label: 'Compléter le profil', href: profileIncomplete.href },
      entityType: 'configuration',
      category: 'Configuration',
      createdAt: now.toISOString(),
    }))
  }

  const commercialLoad: CommercialLoadItem[] = input.members
    .filter((member) => member.status === 'active' && member.role !== 'viewer')
    .map((member) => {
      const assignedProjects = input.projects.filter((project) => project.responsibleUserId === member.userId)
      const prospectsCount = assignedProjects.filter((project) => !project.quoteSentAt && project.status !== 'Gagné' && project.status !== 'Perdu').length
      const quotesCount = assignedProjects.filter((project) => Boolean(project.quoteSentAt) && !project.acceptedAt).length
      const wonCount = assignedProjects.filter((project) => project.status === 'Gagné' || Boolean(project.acceptedAt)).length
      const lostCount = assignedProjects.filter((project) => project.status === 'Perdu').length
      const estimatedRevenue = assignedProjects.reduce((sum, project) => sum + Math.max(0, parseBudget(project.budget)), 0)
      const averageScore = assignedProjects.length
        ? Math.round(
            assignedProjects.reduce((sum, project) => sum + calculateOpportunityScore({
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
            }), 0) / assignedProjects.length,
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
  const opportunities = uniqueRecommendations
    .filter((item) => item.category === 'Commercial' || item.category === 'Devis' || item.category === 'Avis')
    .slice(0, 6)
  const risks = uniqueRecommendations
    .filter((item) => item.priority === 'critical' || item.priority === 'high' || item.category === 'Planning' || item.category === 'Clients')
    .slice(0, 6)

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
    healthScore >= 85 ? 'Excellent' : healthScore >= 65 ? 'Bon' : healthScore >= 40 ? 'À améliorer' : 'Critique'

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
          label: 'Dossiers oubliés',
          value: String(uniqueRecommendations.filter((item) => item.type === 'inactive_project').length),
          status: uniqueRecommendations.some((item) => item.type === 'inactive_project') ? 'warning' : 'good',
        },
        {
          label: 'Devis sans réponse',
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

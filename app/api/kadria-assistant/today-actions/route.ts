import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { TABLES, getArtisanConfig, getDevisByArtisan } from '@/src/lib/airtable'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getBusinessProfile } from '@/src/lib/business-profile'
import { listServiceProfiles } from '@/src/lib/service-profiles'
import { getCalendarIntegration } from '@/src/lib/google-calendar'
import { computeSetupProgress } from '@/src/lib/setup-progress'
import { getQuoteFollowupState } from '@/src/lib/quote-followup'
import { buildAutomaticTasks, calculateOpportunityScore } from '@/src/lib/commercial-actions'
import { prioritizeInterventions, type CollaboratorInterventionLevel } from '@/src/lib/kadria-assistant/intervention-priority'
import { describeQuoteRecommendation, type RecommendationLifecycle } from '@/src/lib/kadria-assistant/recommendation-lifecycle'
import { createInterventionId, interventionIdFromViewedDescription } from '@/src/lib/kadria-assistant/intervention-identity'
import { buildQuoteInterventionMemory, type InterventionContinuity, type InterventionMemory } from '@/src/lib/kadria-assistant/intervention-memory'
import { ARBITRATION_ACTIVITY_TYPES, readActiveInterventionArbitration, type ActiveInterventionArbitration } from '@/src/lib/kadria-assistant/intervention-arbitration'

type TodayActionPriority = 'high' | 'medium' | 'low'
type TodayActionType =
  | 'quote_followup'
  | 'review_request'
  | 'priority_project'
  | 'configuration'
  | 'delivery_error'
  | 'tasks_overview'

interface TodayAction {
  id: string
  type: TodayActionType
  priority: TodayActionPriority
  level?: CollaboratorInterventionLevel
  observedFact?: string
  priorityReason?: string
  isPrimary?: boolean
  interventionId: string
  arbitration?: ActiveInterventionArbitration
  viewedAt?: string
  memory?: InterventionMemory
  continuity?: InterventionContinuity
  status: 'ready' | 'blocked' | 'observed'
  lifecycle: RecommendationLifecycle
  expectedObservation: string
  executionEvidence?: string
  title: string
  description: string
  reason: string
  projectId?: string
  devisId?: string
  clientName?: string
  eligible?: boolean
  googleReviewConfigured?: boolean
  clientEmailPresent?: boolean
  primaryActionLabel: string
  primaryActionHref: string
  secondaryActionLabel?: string
  secondaryActionHref?: string
}

interface ProjectCandidateRow {
  id: string
  status: string | null
  client_first_name: string | null
  client_name: string | null
  client_email: string | null
  budget: string | null
  desired_timeline: string | null
  maturity: string | null
  created_at: string | null
  callback_date: string | null
  city: string | null
  project_type: string | null
  trade: string | null
  completeness_score: number | null
}

interface ActivityRow {
  project_id: string | null
  action: string | null
  description: string | null
  created_at: string | null
}

function hasText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

function formatClientName(project?: ProjectCandidateRow | null) {
  if (!project) return 'Dossier'
  return [project.client_first_name, project.client_name].filter(Boolean).join(' ').trim() || project.project_type || 'Dossier'
}

function sanitizeActionText(value: string | null | undefined, fallback: string) {
  const text = String(value || '').trim()
  if (!text) return fallback
  const lower = text.toLowerCase()
  const looksTechnical = lower.includes('stack')
    || lower.includes('trace')
    || lower.includes('provider_message_id')
    || lower.includes('resend')
    || text.includes('{')
    || text.includes('[')
  if (looksTechnical) return fallback
  return text.length > 160 ? `${text.slice(0, 157)}...` : text
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.artisanId) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    const artisanId = session.artisanId

    const [artisanConfig, businessProfileResult, serviceProfilesResult, calendarResult, devisList, projectsRes] = await Promise.all([
      getArtisanConfig(artisanId).catch(() => null),
      getBusinessProfile(artisanId).catch(() => ({ row: null, tableMissing: true as const })),
      listServiceProfiles(artisanId).catch(() => ({ rows: [], tableMissing: true as const })),
      getCalendarIntegration(artisanId).catch(() => ({ row: null, tableMissing: true as const })),
      getDevisByArtisan(artisanId).catch(() => []),
      supabaseAdmin
        .from(TABLES.projects)
        .select('id,status,client_first_name,client_name,client_email,budget,desired_timeline,maturity,created_at,callback_date,city,project_type,trade,completeness_score')
        .eq('artisan_id', artisanId)
        .limit(120),
    ])

    if (projectsRes.error) {
      throw projectsRes.error
    }

    const projects = (projectsRes.data || []) as ProjectCandidateRow[]
    const projectIds = projects.map((project) => project.id).filter(Boolean)

    let activities: ActivityRow[] = []
    if (projectIds.length > 0) {
      const activityRes = await supabaseAdmin
        .from(TABLES.activity)
        .select('project_id,action,description,created_at')
        .in('project_id', projectIds)
        .in('action', [
          'DEVIS_FOLLOW_UP_FAILED',
          'DEVIS_FOLLOW_UP_SENT',
          'GOOGLE_REVIEW_REQUEST_FAILED',
          'GOOGLE_REVIEW_REQUEST_SENT',
          'KADRIA_INTERVENTION_VIEWED',
          ...ARBITRATION_ACTIVITY_TYPES,
        ])
        .order('created_at', { ascending: false })
        .limit(200)

      if (!activityRes.error) {
        activities = (activityRes.data || []) as ActivityRow[]
      }
    }

    const projectById = new Map(projects.map((project) => [project.id, project]))
    const viewedAtByIntervention = new Map(
      activities
        .filter((activity) => activity.action === 'KADRIA_INTERVENTION_VIEWED' && interventionIdFromViewedDescription(activity.description))
        .map((activity) => [interventionIdFromViewedDescription(activity.description) as string, activity.created_at || ''] as const)
    )
    const reviewSentProjectIds = new Set(
      activities
        .filter((activity) => activity.action === 'GOOGLE_REVIEW_REQUEST_SENT' && hasText(activity.project_id))
      .map((activity) => String(activity.project_id))
    )
    const arbitrationActivities = activities.filter((activity) => ARBITRATION_ACTIVITY_TYPES.includes(activity.action || ''))

    const progress = computeSetupProgress({
      businessProfile: businessProfileResult.row
        ? {
            primaryTrade: businessProfileResult.row.primary_trade,
            baseCity: businessProfileResult.row.base_city,
            interventionRadiusKm: businessProfileResult.row.intervention_radius_km,
            hourlyRateHt: businessProfileResult.row.hourly_rate_ht,
            defaultVatRate: businessProfileResult.row.default_vat_rate,
            workingDays: businessProfileResult.row.working_days,
            workStartTime: businessProfileResult.row.work_start_time,
            workEndTime: businessProfileResult.row.work_end_time,
          }
        : null,
      serviceProfiles: serviceProfilesResult.rows.map((profile) => ({ id: profile.id })),
      calendarIntegration: calendarResult.tableMissing ? null : { connected: !!calendarResult.row?.is_connected },
      artisanConfig: artisanConfig
        ? {
            companyName: artisanConfig.companyName,
            phone: artisanConfig.phone,
            villePro: artisanConfig.villePro,
            address: artisanConfig.address,
            businessConfig: artisanConfig.businessConfig as { calendarMode?: string | null } | null,
          }
        : null,
    })

    const todoStep = [...progress.steps]
      .filter((step) => step.status === 'todo')
      .sort((a, b) => a.priority - b.priority)[0]

    const actions: TodayAction[] = []
    const withIntervention = (action: Omit<TodayAction, 'interventionId' | 'viewedAt'>): TodayAction => {
      const interventionId = createInterventionId(action.type, action.projectId)
      const viewedAt = viewedAtByIntervention.get(interventionId)
      return { ...action, interventionId, ...(viewedAt ? { viewedAt } : {}) }
    }

    if (!hasText(artisanConfig?.googleReviewUrl)) {
      actions.push(withIntervention({
        id: 'configuration-google-review',
        type: 'configuration',
        priority: 'high',
        status: 'blocked',
        lifecycle: 'blocked',
        expectedObservation: "Je vérifierai que l'URL est enregistrée avant de proposer un envoi.",
        title: "Ajouter l'URL avis Google",
        description: "Ajoutez votre lien d'avis Google pour pouvoir envoyer une demande d'avis depuis vos dossiers.",
        reason: "URL avis Google absente.",
        eligible: false,
        googleReviewConfigured: false,
        primaryActionLabel: 'Configurer',
        primaryActionHref: '/parametres?section=entreprise',
      }))
    } else if (progress.percent < 100 && todoStep) {
      actions.push(withIntervention({
        id: 'configuration-progress',
        type: 'configuration',
        priority: 'medium',
        status: 'ready',
        lifecycle: 'proposed',
        expectedObservation: 'Je vérifierai la configuration enregistrée avant de recommander la prochaine étape.',
        title: 'Completer la configuration Kadria',
        description: sanitizeActionText(todoStep.description, `${todoStep.label} a completer.`),
        reason: `${todoStep.label} reste a completer.`,
        eligible: true,
        googleReviewConfigured: true,
        primaryActionLabel: 'Completer',
        primaryActionHref: todoStep.href || '/parametres',
      }))
    }

    const failedActions = activities
      .filter((activity) => activity.action === 'DEVIS_FOLLOW_UP_FAILED' || activity.action === 'GOOGLE_REVIEW_REQUEST_FAILED')
      .slice(0, 1)

    failedActions.forEach((activity, index) => {
      const projectId = String(activity.project_id || '')
      const project = projectById.get(projectId)
      if (!project) return
      actions.push(withIntervention({
        id: `failed-${projectId}-${index}`,
        type: 'delivery_error',
        priority: 'high',
        status: 'ready',
        lifecycle: 'proposed',
        expectedObservation: "Je vérifierai si l'envoi peut être repris ou si les coordonnées doivent être corrigées.",
        title: activity.action === 'DEVIS_FOLLOW_UP_FAILED' ? 'Verifier une relance devis en echec' : "Verifier une demande d'avis en echec",
        description: sanitizeActionText(activity.description, "Une erreur d'envoi recente merite votre attention."),
        reason: 'Une action precedente a echoue et demande une verification manuelle.',
        projectId,
        clientName: formatClientName(project),
        eligible: true,
        googleReviewConfigured: hasText(artisanConfig?.googleReviewUrl),
        clientEmailPresent: hasText(project.client_email),
        primaryActionLabel: 'Ouvrir le dossier',
        primaryActionHref: `/dashboard-v2/projet/${projectId}`,
      }))
    })

    const quoteRecommendations = devisList
      .map((devis) => {
        const state = getQuoteFollowupState(devis)
        return {
          devis,
          state,
          recommendation: describeQuoteRecommendation({
            state,
            hasClientEmail: hasText(devis.clientEmail),
            lastFollowUpAt: devis.lastFollowUpAt,
            followUpCount: devis.followUpCount,
          }),
        }
      })
      .filter((candidate) => candidate.recommendation && candidate.recommendation.lifecycle !== 'resolved')
      .sort((a, b) => {
        const weightA = a.recommendation?.lifecycle === 'follow_up_required' || a.recommendation?.lifecycle === 'proposed'
          ? (a.state.stage === 'j10_final' ? 0 : a.state.stage === 'j5_opened_no_decision' ? 1 : 2)
          : 3
        const weightB = b.recommendation?.lifecycle === 'follow_up_required' || b.recommendation?.lifecycle === 'proposed'
          ? (b.state.stage === 'j10_final' ? 0 : b.state.stage === 'j5_opened_no_decision' ? 1 : 2)
          : 3
        return weightA - weightB
      })
      .filter(({ devis }, index, candidates) => candidates.findIndex((candidate) => candidate.devis.projectId === devis.projectId) === index)

    quoteRecommendations.forEach(({ devis, state, recommendation }) => {
      const project = projectById.get(devis.projectId)
      if (!recommendation) return
      const interventionId = createInterventionId('quote_followup', devis.projectId)
      const outcomeObservedAt = devis.acceptedAt || devis.declinedAt || undefined
      const arbitration = readActiveInterventionArbitration(arbitrationActivities, interventionId, {
        observedAt: outcomeObservedAt || devis.lastFollowUpAt || devis.quoteSentAt,
        hasSignificantEscalation: state.stage === 'j10_final',
      })
      const suppressForArbitration = arbitration?.isActive && (
        arbitration.arbitrationType === 'snoozed'
        || arbitration.arbitrationType === 'not_relevant'
        || arbitration.arbitrationType === 'declined'
      )
      if (suppressForArbitration) return
      const needsContactDetails = recommendation.lifecycle === 'inconclusive' && !hasText(devis.clientEmail) && state.canFollowUp
      const isInformational = recommendation.lifecycle === 'executed' || recommendation.lifecycle === 'observing' || recommendation.lifecycle === 'inconclusive'
      const isPriorityDisputed = arbitration?.isActive && arbitration.arbitrationType === 'priority_disputed' && state.stage !== 'j10_final'
      const isAlreadyHandledWithoutEvidence = arbitration?.isActive && arbitration.arbitrationType === 'already_handled' && !devis.lastFollowUpAt && !outcomeObservedAt
      actions.push(withIntervention({
        id: `quote-followup-${recommendation.lifecycle}-${devis.id}`,
        type: 'quote_followup',
        priority: isPriorityDisputed || isInformational ? 'low' : state.stage === 'j10_final' ? 'high' : 'medium',
        status: needsContactDetails ? 'blocked' : isInformational || isAlreadyHandledWithoutEvidence ? 'observed' : 'ready',
        lifecycle: isAlreadyHandledWithoutEvidence ? 'inconclusive' : viewedAtByIntervention.has(interventionId) && recommendation.lifecycle === 'proposed' ? 'viewed' : recommendation.lifecycle,
        expectedObservation: recommendation.expectedObservation,
        executionEvidence: recommendation.executionEvidence,
        title: isAlreadyHandledWithoutEvidence
          ? 'Action à confirmer'
          : needsContactDetails
          ? "Compléter l'e-mail client"
          : recommendation.lifecycle === 'follow_up_required'
            ? 'Réévaluer le devis'
            : isInformational
              ? 'Relance enregistrée'
              : 'Relancer un devis',
        description: isAlreadyHandledWithoutEvidence
          ? 'Vous avez indiqué que ce sujet était déjà traité. Kadria attend une preuve métier avant de le considérer comme exécuté.'
          : needsContactDetails
          ? "Complétez l'e-mail client dans le dossier avant de pouvoir envoyer une relance."
          : recommendation.lifecycle === 'follow_up_required'
            ? 'La période d’observation est terminée : ouvrez le dossier pour décider de la suite, sans répéter mécaniquement la relance.'
            : isInformational
              ? 'Le dossier reste sous observation : aucune relance identique immédiate n’est proposée.'
          : 'La relance se fera depuis la fiche projet avec confirmation avant envoi.',
        reason: recommendation.explanation,
        projectId: devis.projectId,
        devisId: devis.id,
        clientName: devis.clientName || formatClientName(project),
        eligible: !isInformational,
        clientEmailPresent: hasText(devis.clientEmail),
        primaryActionLabel: needsContactDetails
          ? "Ouvrir le dossier pour compléter l'e-mail"
          : recommendation.lifecycle === 'follow_up_required'
            ? 'Ouvrir le dossier pour décider de la suite'
            : isInformational
              ? 'Ouvrir le dossier pour suivre la réponse'
              : 'Ouvrir le dossier pour préparer la relance',
        primaryActionHref: `/dashboard-v2/projet/${devis.projectId}`,
      }))
      const lastAction = actions[actions.length - 1]
      if (lastAction) {
        const resolvedAt = recommendation.lifecycle === 'resolved' ? (devis.acceptedAt || devis.declinedAt || undefined) : undefined
        const outcome = devis.acceptedAt || devis.accepted ? 'accepted' : devis.declinedAt ? 'declined' : undefined
        const built = buildQuoteInterventionMemory({ interventionId: lastAction.interventionId, projectId: devis.projectId, lifecycle: lastAction.lifecycle, loop: recommendation, quoteSentAt: devis.quoteSentAt, viewedAt: lastAction.viewedAt, lastFollowUpAt: devis.lastFollowUpAt, followUpCount: devis.followUpCount, resolvedAt, outcome, arbitration })
        lastAction.memory = built.memory
        lastAction.continuity = built.continuity
        if (arbitration) lastAction.arbitration = arbitration
      }
    })

    if (hasText(artisanConfig?.googleReviewUrl)) {
      const reviewProject = projects.find((project) =>
        project.status === 'Gagné' &&
        hasText(project.client_email) &&
        !reviewSentProjectIds.has(project.id)
      )

      if (reviewProject) {
        actions.push(withIntervention({
          id: `review-${reviewProject.id}`,
          type: 'review_request',
          priority: 'medium',
          status: 'ready',
          lifecycle: 'proposed',
          expectedObservation: "Je vérifierai que la demande d'avis est enregistrée avant de recommander une nouvelle action.",
          title: 'Demander un avis Google',
          description: "L'envoi se fera depuis la fiche projet avec confirmation.",
          reason: 'Projet gagne, email client present, aucune demande envoyee.',
          projectId: reviewProject.id,
          clientName: formatClientName(reviewProject),
          eligible: true,
          googleReviewConfigured: true,
          clientEmailPresent: true,
          primaryActionLabel: "Ouvrir le dossier et demander l'avis",
          primaryActionHref: `/dashboard-v2/projet/${reviewProject.id}`,
        }))
      }
    }

    const priorityProject = [...projects]
      .filter((project) => project.status !== 'Gagné' && project.status !== 'Perdu')
      .map((project) => ({
        project,
        score: calculateOpportunityScore({
          id: project.id,
          status: project.status || '',
          completenessScore: project.completeness_score || 0,
          budget: project.budget || '',
          desiredTimeline: project.desired_timeline || '',
          maturity: project.maturity || '',
          createdAt: project.created_at || '',
          callbackDate: project.callback_date || '',
          city: project.city || '',
          projectType: project.project_type || '',
          trade: project.trade || '',
          clientFirstName: project.client_first_name || '',
          clientName: project.client_name || '',
          clientEmail: project.client_email || '',
        }),
      }))
      .sort((a, b) => b.score - a.score)[0]

    if (priorityProject && priorityProject.score >= 70) {
      actions.push(withIntervention({
        id: `priority-${priorityProject.project.id}`,
        type: 'priority_project',
        priority: 'medium',
        status: 'ready',
        lifecycle: 'proposed',
        expectedObservation: 'Je vérifierai les prochaines activités du dossier avant de recommander une action.',
        title: 'Ouvrir un dossier prioritaire',
        description: `Signal commercial fort detecte sur ${formatClientName(priorityProject.project)}.`,
        reason: `Score commercial estime a ${priorityProject.score}.`,
        projectId: priorityProject.project.id,
        clientName: formatClientName(priorityProject.project),
        eligible: true,
        clientEmailPresent: hasText(priorityProject.project.client_email),
        primaryActionLabel: 'Ouvrir le dossier',
        primaryActionHref: `/dashboard-v2/projet/${priorityProject.project.id}`,
      }))
    }

    const todayTasks = buildAutomaticTasks(
      projects.map((project) => ({
        id: project.id,
        status: project.status || '',
        completenessScore: project.completeness_score || 0,
        budget: project.budget || '',
        desiredTimeline: project.desired_timeline || '',
        maturity: project.maturity || '',
        createdAt: project.created_at || '',
        callbackDate: project.callback_date || '',
        city: project.city || '',
        projectType: project.project_type || '',
        trade: project.trade || '',
        clientFirstName: project.client_first_name || '',
        clientName: project.client_name || '',
        clientEmail: project.client_email || '',
      }))
    )

    if (todayTasks.length > 0) {
      actions.push(withIntervention({
        id: 'tasks-overview',
        type: 'tasks_overview',
        priority: 'low',
        status: 'ready',
        lifecycle: 'proposed',
        expectedObservation: 'Je vérifierai les tâches traitées avant de proposer une nouvelle priorité.',
        title: 'Voir mes taches a faire',
        description: `${todayTasks.length} action(s) a traiter aujourd'hui dans le suivi commercial.`,
        reason: 'Regroupe les priorites detectees dans votre suivi commercial.',
        eligible: true,
        primaryActionLabel: 'Ouvrir le tableau de bord',
        primaryActionHref: '/dashboard-v2',
      }))
    }

    const uniqueActions = actions.filter(
      (action, index, array) => array.findIndex((candidate) => candidate.id === action.id) === index
    )

    const prioritizedActions = prioritizeInterventions(uniqueActions)

    return NextResponse.json({
      success: true,
      actions: prioritizedActions.slice(0, 3),
    })
  } catch (error) {
    console.error('[KADRIA-ASSISTANT TODAY ACTIONS]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: 'Impossible de charger les actions du jour pour le moment.' },
      { status: 500 }
    )
  }
}

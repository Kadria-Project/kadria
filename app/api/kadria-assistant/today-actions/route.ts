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
  title: string
  description: string
  projectId?: string
  clientName?: string
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

function getPriorityWeight(priority: TodayActionPriority) {
  if (priority === 'high') return 0
  if (priority === 'medium') return 1
  return 2
}

function hasText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

function formatClientName(project: ProjectCandidateRow) {
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
        ])
        .order('created_at', { ascending: false })
        .limit(200)

      if (!activityRes.error) {
        activities = (activityRes.data || []) as ActivityRow[]
      }
    }

    const projectById = new Map(projects.map((project) => [project.id, project]))
    const reviewSentProjectIds = new Set(
      activities
        .filter((activity) => activity.action === 'GOOGLE_REVIEW_REQUEST_SENT' && hasText(activity.project_id))
        .map((activity) => String(activity.project_id))
    )

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

    if (!hasText(artisanConfig?.googleReviewUrl)) {
      actions.push({
        id: 'configuration-google-review',
        type: 'configuration',
        priority: 'high',
        title: 'Finaliser la configuration',
        description: "URL avis Google manquante pour activer les demandes d'avis.",
        primaryActionLabel: 'Completer',
        primaryActionHref: '/parametres?section=entreprise',
      })
    } else if (progress.percent < 100 && todoStep) {
      actions.push({
        id: 'configuration-progress',
        type: 'configuration',
        priority: 'medium',
        title: 'Completer la configuration Kadria',
        description: sanitizeActionText(todoStep.description, `${todoStep.label} a completer.`),
        primaryActionLabel: 'Completer',
        primaryActionHref: todoStep.href || '/parametres',
      })
    }

    const failedActions = activities
      .filter((activity) => activity.action === 'DEVIS_FOLLOW_UP_FAILED' || activity.action === 'GOOGLE_REVIEW_REQUEST_FAILED')
      .slice(0, 2)

    failedActions.forEach((activity, index) => {
      const projectId = String(activity.project_id || '')
      const project = projectById.get(projectId)
      if (!project) return
      actions.push({
        id: `failed-${projectId}-${index}`,
        type: 'delivery_error',
        priority: 'high',
        title: activity.action === 'DEVIS_FOLLOW_UP_FAILED' ? 'Verifier une relance devis en echec' : "Verifier une demande d'avis en echec",
        description: sanitizeActionText(activity.description, "Une erreur d'envoi recente merite votre attention."),
        projectId,
        clientName: formatClientName(project),
        primaryActionLabel: 'Ouvrir le dossier',
        primaryActionHref: `/dashboard-v2/projet/${projectId}`,
      })
    })

    const followupCandidates = devisList
      .map((devis) => ({ devis, state: getQuoteFollowupState(devis) }))
      .filter(({ state }) => state.canFollowUp && state.stage !== 'none')
      .sort((a, b) => {
        const weightA = a.state.stage === 'j10_final' ? 0 : a.state.stage === 'j5_opened_no_decision' ? 1 : 2
        const weightB = b.state.stage === 'j10_final' ? 0 : b.state.stage === 'j5_opened_no_decision' ? 1 : 2
        return weightA - weightB
      })
      .slice(0, 2)

    followupCandidates.forEach(({ devis, state }) => {
      const project = projectById.get(devis.projectId)
      actions.push({
        id: `quote-followup-${devis.id}`,
        type: 'quote_followup',
        priority: state.stage === 'j10_final' ? 'high' : 'medium',
        title: 'Relancer un devis',
        description: sanitizeActionText(state.reason, 'Devis envoye sans reponse recente.'),
        projectId: devis.projectId,
        clientName: devis.clientName || project ? formatClientName(project as ProjectCandidateRow) : 'Dossier',
        primaryActionLabel: 'Ouvrir le dossier',
        primaryActionHref: `/dashboard-v2/projet/${devis.projectId}`,
      })
    })

    if (hasText(artisanConfig?.googleReviewUrl)) {
      const reviewProject = projects.find((project) =>
        project.status === 'Gagné' &&
        hasText(project.client_email) &&
        !reviewSentProjectIds.has(project.id)
      )

      if (reviewProject) {
        actions.push({
          id: `review-${reviewProject.id}`,
          type: 'review_request',
          priority: 'medium',
          title: 'Demander un avis Google',
          description: 'Projet gagne, email client present, aucune demande envoyee.',
          projectId: reviewProject.id,
          clientName: formatClientName(reviewProject),
          primaryActionLabel: 'Ouvrir le dossier',
          primaryActionHref: `/dashboard-v2/projet/${reviewProject.id}`,
        })
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
      actions.push({
        id: `priority-${priorityProject.project.id}`,
        type: 'priority_project',
        priority: 'medium',
        title: 'Ouvrir un dossier prioritaire',
        description: `Signal commercial fort detecte sur ${formatClientName(priorityProject.project)}.`,
        projectId: priorityProject.project.id,
        clientName: formatClientName(priorityProject.project),
        primaryActionLabel: 'Ouvrir le dossier',
        primaryActionHref: `/dashboard-v2/projet/${priorityProject.project.id}`,
      })
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
      actions.push({
        id: 'tasks-overview',
        type: 'tasks_overview',
        priority: 'low',
        title: 'Voir mes taches a faire',
        description: `${todayTasks.length} action(s) a traiter aujourd'hui dans le suivi commercial.`,
        primaryActionLabel: 'Ouvrir le tableau de bord',
        primaryActionHref: '/dashboard-v2',
      })
    }

    const uniqueActions = actions.filter(
      (action, index, array) => array.findIndex((candidate) => candidate.id === action.id) === index
    )

    uniqueActions.sort((a, b) => getPriorityWeight(a.priority) - getPriorityWeight(b.priority))

    return NextResponse.json({
      success: true,
      actions: uniqueActions.slice(0, 6),
    })
  } catch (error) {
    console.error('[KADRIA-ASSISTANT TODAY ACTIONS]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: 'Impossible de charger les actions du jour pour le moment.' },
      { status: 500 }
    )
  }
}

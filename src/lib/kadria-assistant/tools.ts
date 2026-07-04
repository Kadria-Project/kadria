import 'server-only'

import { TABLES, getDevisByArtisan } from '@/src/lib/airtable'
import { getArtisanTimelineEvents } from '@/src/lib/client-events'
import { buildAutomaticTasks, calculateOpportunityScore } from '@/src/lib/commercial-actions'
import { normalizeDepositStatus } from '@/src/lib/deposit'
import { getProjectLifecycle } from '@/src/lib/project-lifecycle'
import { getQuoteFollowupState } from '@/src/lib/quote-followup'
import { mapSupabaseDevis, mapSupabaseProject } from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'

interface AppointmentRow {
  id: string
  project_id: string
  artisan_id: string
  start_time: string
  end_time: string
  location: string | null
  status: string | null
  created_at: string
}

interface ActivityRow {
  action: string | null
  description: string | null
  created_at: string | null
}

export interface AssistantProjectSearchResult {
  id: string
  projectNumber: string
  recordId: string
  projectTitle: string
  clientName: string
  city: string
  status: string
  trade: string
  projectType: string
  score: number
}

export interface AssistantTaskSummary {
  id: string
  projectId: string
  clientName: string
  projectTitle: string
  status: string
  type: 'call' | 'quote' | 'followUp' | 'email'
  title: string
  priority: 'high' | 'medium' | 'low'
  dueDate: string
}

export interface AssistantUpcomingAppointment {
  id: string
  projectId: string
  projectNumber: string
  clientName: string
  projectTitle: string
  start: string
  end: string
  location: string | null
  status: string | null
}

export interface AssistantProjectSummary {
  projectId: string
  projectNumber: string
  recordId: string
  projectTitle: string
  clientName: string
  city: string
  siteAddress: string
  status: string
  lifecycleStage: string
  recommendedAction: string
  recommendedActionMeta: string
  opportunityScore: number
  budget: string
  desiredTimeline: string
  urgency: string
  description: string
  quote: {
    status: string
    amount: number | null
    sentAt: string | null
    acceptedAt: string | null
    declinedAt: string | null
    declineReason: string | null
    followUpReason: string | null
  }
  deposit: {
    status: string
    amount: number | null
    requestedAt: string | null
    paidAt: string | null
  }
  appointment: {
    present: boolean
    start: string | null
    end: string | null
    location: string | null
  }
  photos: {
    count: number
  }
  clientMessages: {
    count: number
    latestAt: string | null
  }
  activity: Array<{
    title: string
    description: string
    createdAt: string | null
  }>
  missingItems: string[]
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function tableMissing(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message || ''
  return /relation .* does not exist/i.test(message) || (error as { code?: string } | null)?.code === '42P01'
}

async function getOwnedProjectRecord(projectId: string, artisanId: string) {
  const direct = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('id', projectId)
    .limit(1)
    .maybeSingle()

  if (direct.error) throw direct.error
  if (direct.data) {
    return direct.data.artisan_id === artisanId ? direct.data : null
  }

  const legacy = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('record_id', projectId)
    .limit(1)
    .maybeSingle()

  if (legacy.error) throw legacy.error
  if (!legacy.data) return null
  return legacy.data.artisan_id === artisanId ? legacy.data : null
}

async function getLatestProjectAppointment(projectId: string, artisanId: string) {
  const { data, error } = await supabaseAdmin
    .from('project_appointments')
    .select('id, project_id, artisan_id, start_time, end_time, location, status, created_at')
    .eq('project_id', projectId)
    .eq('artisan_id', artisanId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (tableMissing(error)) return null
    throw error
  }

  return (data as AppointmentRow | null) || null
}

async function getLatestProjectDevis(projectId: string, artisanId: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLES.devis)
    .select('*')
    .eq('project_id', projectId)
    .eq('artisan_id', artisanId)
    .order('date_emission', { ascending: false })
    .limit(5)

  if (error) throw error

  const list = (data || []).map(mapSupabaseDevis)
  return list[0] || null
}

async function getProjectActivities(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLES.activity)
    .select('action, description, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) return []
  return (data || []) as ActivityRow[]
}

function buildClientName(project: ReturnType<typeof mapSupabaseProject>) {
  return [project.clientFirstName, project.clientName].filter(Boolean).join(' ').trim() || project.projectTitle || 'Client non renseigne'
}

function buildMissingItems(project: ReturnType<typeof mapSupabaseProject>, appointment: AppointmentRow | null, latestDevis: ReturnType<typeof mapSupabaseDevis> | null) {
  const missing: string[] = []
  if (!hasText(project.clientPhone) && !hasText(project.clientEmail)) missing.push('coordonnees client')
  if (!hasText(project.siteAddress) && !hasText(project.city)) missing.push('adresse chantier')
  if (!hasText(project.budget)) missing.push('budget')
  if (!hasText(project.desiredTimeline)) missing.push('delai souhaite')
  if (!project.photos?.length) missing.push('photos')
  if (!appointment) missing.push('rendez-vous')
  if (!latestDevis) missing.push('devis')
  if (!hasText(project.aiSummary) && !hasText(project.tradeAnswers)) missing.push('description du besoin')
  return missing
}

function getQuoteStatusLabel(latestDevis: ReturnType<typeof mapSupabaseDevis> | null) {
  if (!latestDevis) return 'aucun devis'
  if (latestDevis.declinedAt || latestDevis.declineReason) return 'devis refuse'
  if (latestDevis.accepted) return 'devis accepte'
  if (latestDevis.sent || latestDevis.statut?.toLowerCase().startsWith('envoy')) return 'devis envoye'
  return 'devis en preparation'
}

export async function getProjectForAssistant(projectId: string, artisanId: string) {
  const record = await getOwnedProjectRecord(projectId, artisanId)
  if (!record) return null
  return mapSupabaseProject(record)
}

export async function getProjectSummaryForAssistant(projectId: string, artisanId: string): Promise<AssistantProjectSummary | null> {
  const project = await getProjectForAssistant(projectId, artisanId)
  if (!project) return null

  const [appointment, latestDevis, timeline, activities] = await Promise.all([
    getLatestProjectAppointment(project.id, artisanId),
    getLatestProjectDevis(project.id, artisanId),
    getArtisanTimelineEvents(project.id),
    getProjectActivities(project.id),
  ])

  const lifecycle = getProjectLifecycle({
    status: project.status,
    completenessScore: project.completenessScore,
    clientUpdateCount: project.clientUpdateCount,
    clientLastUpdateAt: project.clientLastUpdateAt,
    callbackDate: project.callbackDate,
    desiredTimeline: project.desiredTimeline,
    quoteSentAt: latestDevis?.quoteSentAt || null,
    acceptedAt: latestDevis?.acceptedAt || null,
    depositStatus: project.depositStatus,
    depositAmount: project.depositAmount,
    depositPaymentUrl: project.depositPaymentUrl,
    depositPaidAt: project.depositPaidAt,
    appointment: appointment ? { start: appointment.start_time } : null,
    latestDevis: latestDevis
      ? {
          sent: latestDevis.sent,
          statut: latestDevis.statut,
          accepted: latestDevis.accepted,
          accepted_at: latestDevis.acceptedAt,
          declined: Boolean(latestDevis.declinedAt || latestDevis.declineReason),
          declined_at: latestDevis.declinedAt,
          decline_reason: latestDevis.declineReason,
          date_validite: latestDevis.dateValidite,
          quote_sent_at: latestDevis.quoteSentAt,
          first_opened_at: latestDevis.firstOpenedAt,
          last_follow_up_at: latestDevis.lastFollowUpAt,
          follow_up_count: latestDevis.followUpCount,
          follow_up_disabled: latestDevis.followUpDisabled,
          client_email: latestDevis.clientEmail,
        }
      : null,
    actionEngineInput: {
      status: project.status,
      clientName: project.clientName,
      clientFirstName: project.clientFirstName,
      clientPhone: project.clientPhone,
      clientEmail: project.clientEmail,
      trade: project.trade,
      projectType: project.projectType,
      aiSummary: project.aiSummary,
      tradeAnswers: project.tradeAnswers,
      budget: project.budget,
      desiredTimeline: project.desiredTimeline,
      city: project.city,
      siteAddress: project.siteAddress,
      photos: project.photos,
      completenessScore: project.completenessScore,
      appointment: appointment ? { start: appointment.start_time } : null,
      latestDevis: latestDevis
        ? {
            sent: latestDevis.sent,
            accepted: latestDevis.accepted,
            declined: Boolean(latestDevis.declinedAt || latestDevis.declineReason),
            sentAt: latestDevis.quoteSentAt || null,
            declineReason: latestDevis.declineReason || null,
          }
        : null,
    },
  })

  const latestClientMessage = [...timeline]
    .reverse()
    .find((event) => event.type === 'client_message' || event.source === 'client')
  const clientMessageCount = timeline.filter((event) => event.type === 'client_message' || event.source === 'client').length
  const followUpState = latestDevis ? getQuoteFollowupState(latestDevis) : null

  return {
    projectId: project.id,
    projectNumber: project.projectNumber,
    recordId: project.recordId,
    projectTitle: project.projectTitle || project.projectType || project.trade || 'Projet sans titre',
    clientName: buildClientName(project),
    city: project.city || '',
    siteAddress: project.siteAddress || '',
    status: project.status,
    lifecycleStage: lifecycle.stage,
    recommendedAction: lifecycle.recommendedAction.title,
    recommendedActionMeta: lifecycle.recommendedAction.meta,
    opportunityScore: calculateOpportunityScore({
      id: project.id,
      status: project.status,
      completenessScore: project.completenessScore,
      budget: project.budget,
      desiredTimeline: project.desiredTimeline,
      maturity: project.maturity,
      createdAt: project.createdAt,
      callbackDate: project.callbackDate,
      city: project.city,
      projectType: project.projectType,
      trade: project.trade,
      clientFirstName: project.clientFirstName,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
    }),
    budget: project.budget || '',
    desiredTimeline: project.desiredTimeline || '',
    urgency: project.maturity || '',
    description: project.aiSummary || '',
    quote: {
      status: getQuoteStatusLabel(latestDevis),
      amount: latestDevis?.totalTTC ?? (project.devisAmount > 0 ? project.devisAmount : null),
      sentAt: latestDevis?.quoteSentAt || null,
      acceptedAt: latestDevis?.acceptedAt || null,
      declinedAt: latestDevis?.declinedAt || null,
      declineReason: latestDevis?.declineReason || null,
      followUpReason: followUpState?.reason || null,
    },
    deposit: {
      status: normalizeDepositStatus(project.depositStatus),
      amount: project.depositAmount,
      requestedAt: project.depositRequestedAt,
      paidAt: project.depositPaidAt,
    },
    appointment: {
      present: Boolean(appointment),
      start: appointment?.start_time || null,
      end: appointment?.end_time || null,
      location: appointment?.location || null,
    },
    photos: {
      count: Array.isArray(project.photos) ? project.photos.length : 0,
    },
    clientMessages: {
      count: clientMessageCount,
      latestAt: latestClientMessage?.createdAt || null,
    },
    activity: [
      ...activities.map((activity) => ({
        title: activity.action || 'Activite',
        description: activity.description || 'Evenement enregistre',
        createdAt: activity.created_at,
      })),
      ...timeline
        .slice(-4)
        .reverse()
        .map((event) => ({
          title: event.title || event.type || 'Timeline',
          description: event.message || 'Mise a jour du dossier',
          createdAt: event.createdAt,
        })),
    ].slice(0, 6),
    missingItems: buildMissingItems(project, appointment, latestDevis),
  }
}

export function formatProjectSummaryForAssistant(summary: AssistantProjectSummary): string {
  const lines = [
    `Projet courant : ${summary.projectTitle}`,
    `Client : ${summary.clientName}`,
    `Statut : ${summary.status}`,
    `Etape lifecycle : ${summary.lifecycleStage}`,
    `Action recommandee : ${summary.recommendedAction}`,
    `Pourquoi : ${summary.recommendedActionMeta}`,
    `Budget : ${summary.budget || 'non renseigne'}`,
    `Delai : ${summary.desiredTimeline || 'non renseigne'}`,
    `Devis : ${summary.quote.status}${summary.quote.amount ? ` (${summary.quote.amount} EUR)` : ''}`,
    `Acompte : ${summary.deposit.status}${summary.deposit.amount ? ` (${summary.deposit.amount} EUR)` : ''}`,
    `Photos : ${summary.photos.count}`,
    `Messages client : ${summary.clientMessages.count}`,
    `Rendez-vous : ${summary.appointment.start || 'non planifie'}`,
  ]

  if (summary.missingItems.length > 0) {
    lines.push(`Elements manquants : ${summary.missingItems.join(', ')}`)
  }

  return lines.join('\n')
}

function scoreProjectMatch(project: ReturnType<typeof mapSupabaseProject>, query: string): number {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return 0

  const values = [
    project.projectTitle,
    project.clientFirstName,
    project.clientName,
    project.projectType,
    project.trade,
    project.recordId,
    project.id,
    project.projectNumber,
    project.city,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())

  let score = 0
  for (const value of values) {
    if (value === normalized) score = Math.max(score, 120)
    else if (value.startsWith(normalized)) score = Math.max(score, 100)
    else if (value.includes(normalized)) score = Math.max(score, 80)
  }

  const fullClientName = [project.clientFirstName, project.clientName].filter(Boolean).join(' ').trim().toLowerCase()
  if (fullClientName === normalized) score = Math.max(score, 130)
  else if (fullClientName.includes(normalized)) score = Math.max(score, 110)

  return score
}

export async function searchProjectsForAssistant(query: string, artisanId: string): Promise<AssistantProjectSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const { data, error } = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('artisan_id', artisanId)
    .order('created_at', { ascending: false })
    .limit(150)

  if (error) throw error

  return (data || [])
    .map(mapSupabaseProject)
    .map((project) => ({
      project,
      score: scoreProjectMatch(project, trimmed),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ project, score }) => ({
      id: project.id,
      projectNumber: project.projectNumber,
      recordId: project.recordId,
      projectTitle: project.projectTitle || project.projectType || project.trade || 'Projet sans titre',
      clientName: buildClientName(project),
      city: project.city,
      status: project.status,
      trade: project.trade,
      projectType: project.projectType,
      score,
    }))
}

export async function listTasksToDoForAssistant(artisanId: string): Promise<AssistantTaskSummary[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('artisan_id', artisanId)
    .order('created_at', { ascending: false })
    .limit(120)

  if (error) throw error

  const projects = (data || []).map(mapSupabaseProject)
  const byId = new Map(projects.map((project) => [project.id, project]))
  const tasks = buildAutomaticTasks(
    projects.map((project) => ({
      id: project.id,
      status: project.status,
      completenessScore: project.completenessScore,
      budget: project.budget,
      desiredTimeline: project.desiredTimeline,
      maturity: project.maturity,
      createdAt: project.createdAt,
      callbackDate: project.callbackDate,
      city: project.city,
      projectType: project.projectType,
      trade: project.trade,
      clientFirstName: project.clientFirstName,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
    })),
  )

  return tasks.slice(0, 6).map((task) => {
    const project = byId.get(task.projectId)
    return {
      id: task.id,
      projectId: task.projectId,
      clientName: project ? buildClientName(project) : 'Client',
      projectTitle: project?.projectTitle || project?.projectType || project?.trade || 'Projet sans titre',
      status: project?.status || 'Inconnu',
      type: task.type,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
    }
  })
}

export async function listProjectsWithDepositPaidForAssistant(artisanId: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('artisan_id', artisanId)
    .order('deposit_paid_at', { ascending: false })
    .limit(120)

  if (error) throw error

  return (data || [])
    .map(mapSupabaseProject)
    .filter((project) => normalizeDepositStatus(project.depositStatus) === 'paid')
    .slice(0, 6)
}

export async function listProjectsWithoutAppointmentForAssistant(artisanId: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('artisan_id', artisanId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  const projects = (data || []).map(mapSupabaseProject)
  if (projects.length === 0) return []
  const projectIds = projects.map((project) => project.id)

  const { data: appointments, error: appointmentsError } = await supabaseAdmin
    .from('project_appointments')
    .select('project_id, artisan_id')
    .eq('artisan_id', artisanId)
    .in('project_id', projectIds)

  if (appointmentsError && !tableMissing(appointmentsError)) throw appointmentsError

  const withAppointment = new Set(
    ((appointments || []) as Array<{ project_id?: string }>).map((row) => String(row.project_id || '')).filter(Boolean),
  )

  return projects.filter((project) => !withAppointment.has(project.id)).slice(0, 6)
}

export async function listUpcomingAppointmentsForAssistant(artisanId: string): Promise<AssistantUpcomingAppointment[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('project_appointments')
    .select('id, project_id, artisan_id, start_time, end_time, location, status, created_at')
    .eq('artisan_id', artisanId)
    .gte('start_time', now)
    .order('start_time', { ascending: true })
    .limit(8)

  if (error) {
    if (tableMissing(error)) return []
    throw error
  }

  const rows = (data || []) as AppointmentRow[]
  if (rows.length === 0) return []
  const projectIds = rows.map((row) => row.project_id).filter(Boolean)

  const { data: projects, error: projectsError } = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('artisan_id', artisanId)
    .in('id', projectIds)

  if (projectsError) throw projectsError

  const projectById = new Map((projects || []).map((row) => {
    const project = mapSupabaseProject(row)
    return [project.id, project] as const
  }))

  return rows
    .filter((row) => projectById.has(row.project_id))
    .map((row) => {
      const project = projectById.get(row.project_id)!
      return {
        id: row.id,
        projectId: project.id,
        projectNumber: project.projectNumber,
        clientName: buildClientName(project),
        projectTitle: project.projectTitle || project.projectType || project.trade || 'Projet sans titre',
        start: row.start_time,
        end: row.end_time,
        location: row.location,
        status: row.status,
      }
    })
}

export async function listQuoteFollowUpsForAssistant(artisanId: string) {
  const [projectsRes, devisList] = await Promise.all([
    supabaseAdmin
      .from(TABLES.projects)
      .select('*')
      .eq('artisan_id', artisanId)
      .order('created_at', { ascending: false })
      .limit(120),
    getDevisByArtisan(artisanId).catch(() => []),
  ])

  if (projectsRes.error) throw projectsRes.error

  const projectById = new Map((projectsRes.data || []).map((row) => {
    const project = mapSupabaseProject(row)
    return [project.id, project] as const
  }))

  return devisList
    .map((devis) => ({
      devis,
      state: getQuoteFollowupState(devis),
      project: projectById.get(devis.projectId),
    }))
    .filter((entry) => entry.state.canFollowUp && entry.state.stage !== 'none' && entry.project)
    .slice(0, 6)
    .map((entry) => ({
      projectId: entry.devis.projectId,
      projectNumber: entry.project!.projectNumber,
      clientName: entry.devis.clientName || buildClientName(entry.project!),
      projectTitle: entry.project!.projectTitle || entry.project!.projectType || entry.project!.trade || 'Projet sans titre',
      status: entry.project!.status,
      quoteNumber: entry.devis.devisNumber,
      amount: entry.devis.totalTTC,
      reason: entry.state.reason,
    }))
}

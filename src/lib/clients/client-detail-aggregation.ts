import { CLIENT_ACTION_CONFIG, CLIENT_ACTION_PRIORITY_ORDER } from './clients-action-config'
import type { ClientActionPriority, ClientActionReason } from './clients-action-types'
import { buildClientTimeline } from './client-timeline'
import type {
  ClientAppointment,
  ClientCommercialSummary,
  ClientDetailIdentity,
  ClientDetailSummary,
  ClientNextAction,
  ClientProjectStatusGroup,
  ClientProjectSummary,
  ClientQuoteSummary,
} from './client-detail-types'

type Row = Record<string, unknown>

const ACTIVE_PROJECT_STATUSES = new Set(['nouveau', 'à rappeler', 'a rappeler', 'qualifié', 'qualifie', 'en cours', 'devis envoyé', 'devis envoye'])
const WON_STATUSES = new Set(['gagné', 'gagne', 'won'])
const LOST_STATUSES = new Set(['perdu', 'lost'])
const ACCEPTED_QUOTE_STATUSES = new Set(['accepté', 'accepte', 'accepted'])
const PENDING_QUOTE_STATUSES = new Set(['envoyé', 'envoye', 'sent', 'pending', 'en attente'])
const STALE_PROJECT_MS = 21 * 24 * 60 * 60 * 1000
const PENDING_QUOTE_MS = 14 * 24 * 60 * 60 * 1000
const IMMINENT_APPOINTMENT_MS = 48 * 60 * 60 * 1000

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0)
const toDate = (value: unknown) => { const d = new Date(String(value || '')); return Number.isNaN(d.getTime()) ? null : d }
const toIso = (value: unknown) => toDate(value)?.toISOString() || null
const normalizedStatus = (value: unknown) => (text(value) || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function projectHref(projectId: string) { return `/dashboard-v2/projet/${projectId}` }

const isAcceptedQuote = (quote: Row) => quote.accepted === true || Boolean(text(quote.accepted_at)) || ACCEPTED_QUOTE_STATUSES.has(normalizedStatus(quote.statut || quote.status))
const isPendingQuote = (quote: Row) => !isAcceptedQuote(quote)
const quoteAmount = (quote: Row) => num(quote.total_ttc ?? quote.total_ht ?? 0)
const isCancelledAppointment = (appointment: Row) => normalizedStatus(appointment.status) === 'cancelled' || normalizedStatus(appointment.confirmation_status) === 'cancelled'

function statusGroup(status: unknown): ClientProjectStatusGroup {
  const value = normalizedStatus(status)
  if (WON_STATUSES.has(value)) return 'won'
  if (LOST_STATUSES.has(value)) return 'lost'
  if (ACTIVE_PROJECT_STATUSES.has(value)) return 'active'
  return 'other'
}

function quoteStatusLabel(quote: Row): string {
  if (isAcceptedQuote(quote)) return 'Accepté'
  const status = normalizedStatus(quote.statut || quote.status)
  if (status === 'refuse' || status === 'refusé' || status === 'declined') return 'Refusé'
  if (PENDING_QUOTE_STATUSES.has(status)) return 'En attente'
  if (!status) return 'Brouillon'
  return text(quote.statut as string) || 'Brouillon'
}

export function buildClientIdentity(client: Row, projectCount: number): ClientDetailIdentity {
  const firstName = text(client.first_name)
  const lastName = text(client.last_name)
  const companyName = text(client.company_name)
  const contactName = [firstName, lastName].filter(Boolean).join(' ') || null
  const isCompany = Boolean(companyName)
  const displayName = companyName || contactName || 'Client sans nom'
  return {
    id: String(client.id),
    firstName,
    lastName,
    companyName,
    displayName,
    // Never show the same label twice: only surface a distinct contact name.
    contactName: isCompany && contactName && contactName !== companyName ? contactName : null,
    isCompany,
    email: text(client.email),
    phone: text(client.phone),
    addressLine1: text(client.address_line1),
    addressLine2: text(client.address_line2),
    postalCode: text(client.postal_code),
    city: text(client.city),
    status: text(client.status) || 'prospect',
    createdAt: toIso(client.created_at),
    isRecurring: projectCount >= 2,
  }
}

export function buildClientProjects(projects: Row[], quotesByProject: Map<string, Row[]>, appointmentsByProject: Map<string, Row[]>, activitiesByProject: Map<string, Row[]>): ClientProjectSummary[] {
  return projects
    .map((project) => {
      const id = String(project.id)
      const quotes = quotesByProject.get(id) || []
      const accepted = quotes.filter(isAcceptedQuote)
      const appointments = (appointmentsByProject.get(id) || []).filter((a) => !isCancelledAppointment(a))
      const now = new Date()
      const nextAppointment = appointments
        .map((a) => toDate(a.start_time))
        .filter((d): d is Date => Boolean(d) && d! >= now)
        .sort((a, b) => a.getTime() - b.getTime())[0]
      const activities = activitiesByProject.get(id) || []
      const lastActivity = [...activities, ...appointments, ...quotes]
        .map((row) => toDate((row as Row).updated_at || (row as Row).created_at))
        .filter((d): d is Date => Boolean(d))
        .sort((a, b) => b.getTime() - a.getTime())[0]
      return {
        id,
        title: text(project.project_title) || 'Dossier',
        status: text(project.status) || 'Nouveau',
        statusGroup: statusGroup(project.status),
        createdAt: toIso(project.created_at),
        updatedAt: toIso(project.updated_at),
        siteAddress: text(project.site_address),
        acceptedAmount: accepted.length ? accepted.reduce((sum, q) => sum + quoteAmount(q), 0) : null,
        quoteCount: quotes.length,
        nextAppointmentAt: nextAppointment ? nextAppointment.toISOString() : null,
        lastActivityAt: lastActivity ? lastActivity.toISOString() : null,
        href: projectHref(id),
      }
    })
    .sort((a, b) => {
      if ((a.statusGroup === 'active') !== (b.statusGroup === 'active')) return a.statusGroup === 'active' ? -1 : 1
      return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
    })
}

export function buildClientQuotes(quotes: Row[], projectTitleById: Map<string, string>): ClientQuoteSummary[] {
  return quotes
    .filter((quote) => projectTitleById.has(String(quote.project_id)))
    .map((quote) => {
      const projectId = String(quote.project_id)
      return {
        id: String(quote.id ?? `${projectId}-${text(quote.numero) || text(quote.created_at)}`),
        numero: text(quote.numero),
        projectId,
        projectTitle: projectTitleById.get(projectId) || 'Dossier',
        status: normalizedStatus(quote.statut || quote.status) || 'draft',
        statusLabel: quoteStatusLabel(quote),
        totalTtc: quoteAmount(quote),
        sentAt: toIso(quote.quote_sent_at),
        acceptedAt: toIso(quote.accepted_at),
        createdAt: toIso(quote.created_at),
        href: projectHref(projectId),
      }
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export function buildClientAppointments(appointments: Row[], projectTitleById: Map<string, string>): ClientAppointment[] {
  const now = new Date()
  return appointments
    .filter((appointment) => projectTitleById.has(String(appointment.project_id)))
    .map((appointment) => {
      const projectId = String(appointment.project_id)
      const start = toDate(appointment.start_time)
      return {
        id: String(appointment.id),
        title: text(appointment.title) || 'Rendez-vous',
        startTime: toIso(appointment.start_time) || '',
        status: text(appointment.status),
        confirmationStatus: text(appointment.confirmation_status) || 'pending',
        assignedUserId: text(appointment.assigned_user_id),
        projectId,
        projectTitle: projectTitleById.get(projectId) || 'Dossier',
        href: projectHref(projectId),
        isPast: Boolean(start && start < now),
      }
    })
    .sort((a, b) => (b.startTime || '').localeCompare(a.startTime || ''))
}

export function buildClientSummary(projects: ClientProjectSummary[], quotes: Row[], lastInteractionAt: string | null): ClientDetailSummary {
  const acceptedAmount = quotes.filter(isAcceptedQuote).reduce((sum, q) => sum + quoteAmount(q), 0)
  const wonProjectCount = projects.filter((p) => p.statusGroup === 'won').length
  const createdDates = projects.map((p) => p.createdAt).filter((v): v is string => Boolean(v)).sort()
  return {
    projectCount: projects.length,
    activeProjectCount: projects.filter((p) => p.statusGroup === 'active').length,
    wonProjectCount,
    lostProjectCount: projects.filter((p) => p.statusGroup === 'lost').length,
    quoteCount: quotes.length,
    pendingQuoteCount: quotes.filter(isPendingQuote).length,
    acceptedQuoteCount: quotes.filter(isAcceptedQuote).length,
    totalQuotedAmount: quotes.reduce((sum, q) => sum + quoteAmount(q), 0),
    acceptedAmount,
    averageProjectValue: wonProjectCount > 0 ? acceptedAmount / wonProjectCount : null,
    firstProjectAt: createdDates[0] || null,
    lastProjectAt: createdDates[createdDates.length - 1] || null,
    lastInteractionAt,
  }
}

export function buildCommercialSummary(summary: ClientDetailSummary, relationshipStartAt: string | null): ClientCommercialSummary {
  return {
    totalQuotedAmount: summary.totalQuotedAmount,
    acceptedAmount: summary.acceptedAmount,
    conversionRate: summary.quoteCount > 0 ? summary.acceptedQuoteCount / summary.quoteCount : null,
    wonProjectCount: summary.wonProjectCount,
    averageWonProjectValue: summary.wonProjectCount > 0 ? summary.acceptedAmount / summary.wonProjectCount : null,
    relationshipStartAt,
    lastInteractionAt: summary.lastInteractionAt,
  }
}

/**
 * Reuses the exact CRM action-center reason hierarchy (Lot 9.5) at the scale
 * of a single client's projects/quotes/appointments, so the "next action"
 * shown on the client fiche is never a different rule set than the Action
 * Center list.
 */
export function deriveClientNextAction(input: { projects: Row[]; quotes: Row[]; appointments: Row[]; now?: Date }): ClientNextAction | null {
  const now = input.now || new Date()
  const activeAppointments = input.appointments.filter((a) => !isCancelledAppointment(a))
  const latestProject = [...input.projects].sort((a, b) => (text(b.updated_at || b.created_at) || '').localeCompare(text(a.updated_at || a.created_at) || ''))[0]

  const pick = (): { reason: ClientActionReason; dueAt: string | null; projectId: string | null; projectTitle: string | null } | null => {
    const changeRequested = activeAppointments.find((a) => normalizedStatus(a.confirmation_status) === 'change_requested')
    if (changeRequested) return { reason: 'appointment_change_requested', dueAt: toIso(changeRequested.start_time), projectId: text(changeRequested.project_id), projectTitle: null }
    const toCallBack = input.projects.find((p) => ['a rappeler', 'à rappeler'].includes(normalizedStatus(p.status)))
    if (toCallBack) return { reason: 'project_to_call_back', dueAt: null, projectId: text(toCallBack.id), projectTitle: text(toCallBack.project_title) }
    const pendingConfirmation = activeAppointments.find((a) => normalizedStatus(a.confirmation_status) === 'pending')
    if (pendingConfirmation) return { reason: 'appointment_awaiting_confirmation', dueAt: toIso(pendingConfirmation.start_time), projectId: text(pendingConfirmation.project_id), projectTitle: null }
    const stalePendingQuote = input.quotes.find((q) => isPendingQuote(q) && PENDING_QUOTE_STATUSES.has(normalizedStatus(q.statut || q.status)) && (() => { const sent = toDate(q.quote_sent_at || q.created_at); return sent ? now.getTime() - sent.getTime() > PENDING_QUOTE_MS : false })())
    if (stalePendingQuote) return { reason: 'quote_pending_too_long', dueAt: toIso(stalePendingQuote.quote_sent_at || stalePendingQuote.created_at), projectId: text(stalePendingQuote.project_id), projectTitle: null }
    const staleActive = input.projects.find((p) => ACTIVE_PROJECT_STATUSES.has(normalizedStatus(p.status)) && (() => { const changed = toDate(p.updated_at || p.created_at); return changed ? now.getTime() - changed.getTime() > STALE_PROJECT_MS : false })())
    if (staleActive) return { reason: 'stale_active_project', dueAt: null, projectId: text(staleActive.id), projectTitle: text(staleActive.project_title) }
    return null
  }

  const picked = pick()
  if (!picked) return null
  const config = CLIENT_ACTION_CONFIG[picked.reason]
  const projectId = picked.projectId || text(latestProject?.id)
  const projectTitle = picked.projectTitle || text(latestProject?.project_title)
  const priority: ClientActionPriority = (() => {
    if (picked.reason === 'appointment_awaiting_confirmation' && picked.dueAt) {
      const start = toDate(picked.dueAt)
      if (start && start.getTime() - now.getTime() <= IMMINENT_APPOINTMENT_MS) return 'critical'
    }
    return config.basePriority
  })()
  return {
    reason: picked.reason,
    label: config.label,
    description: config.buildDescription({ clientName: '', dueLabel: null }),
    priority,
    dueAt: picked.dueAt,
    projectId,
    projectTitle,
    ctaLabel: config.ctaLabel,
    href: projectId ? projectHref(projectId) : null,
  }
}

export { CLIENT_ACTION_PRIORITY_ORDER, buildClientTimeline }

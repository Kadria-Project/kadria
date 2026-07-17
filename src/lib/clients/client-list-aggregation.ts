import { createHash } from 'crypto'
import type { ClientListItem } from './client-list-types'

type Row = Record<string, unknown>
export type ClientListSort = 'attention' | 'lastInteraction' | 'name' | 'acceptedValue' | 'projectCount' | 'nextAppointment'

const ACTIVE_PROJECT_STATUSES = new Set(['nouveau', 'à rappeler', 'a rappeler', 'qualifié', 'qualifie', 'en cours', 'devis envoyé', 'devis envoye'])
const ACCEPTED_QUOTE_STATUSES = new Set(['accepté', 'accepte', 'accepted'])
const PENDING_QUOTE_STATUSES = new Set(['envoyé', 'envoye', 'sent', 'pending', 'en attente'])
const STALE_PROJECT_MS = 21 * 24 * 60 * 60 * 1000
const PENDING_QUOTE_MS = 14 * 24 * 60 * 60 * 1000

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
const date = (value: unknown) => {
  const result = new Date(String(value || ''))
  return Number.isNaN(result.getTime()) ? null : result
}
const normalized = (value: unknown) => (text(value) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const phone = (value: unknown) => {
  const digits = (text(value) || '').replace(/\D/g, '')
  return digits.startsWith('33') ? `0${digits.slice(2)}` : digits
}
const normalizedStatus = (value: unknown) => normalized(value)
const isAcceptedQuote = (quote: Row) => quote.accepted === true || normalizedStatus(quote.accepted) === 'true' || text(quote.accepted_at) !== null || ACCEPTED_QUOTE_STATUSES.has(normalizedStatus(quote.statut || quote.status))
const quoteAmount = (quote: Row) => Number(quote.total_ttc ?? quote.total_ht ?? quote.devis_amount ?? 0) || 0
const isCancelledAppointment = (appointment: Row) => normalizedStatus(appointment.status) === 'cancelled' || normalizedStatus(appointment.confirmation_status) === 'cancelled'

function legacyKey(project: Row) {
  const email = normalized(project.client_email)
  if (email) return `email:${email}`
  const normalizedPhone = phone(project.client_phone)
  if (normalizedPhone) return `phone:${normalizedPhone}`
  const nameAndCity = `${normalized(project.client_first_name)} ${normalized(project.client_name)}`.trim()
  const city = normalized(project.city)
  if (nameAndCity && city) return `name-city:${nameAndCity}:${city}`
  return `project:${String(project.id)}`
}

function legacyId(key: string) {
  return `legacy:${createHash('sha256').update(key).digest('base64url').slice(0, 24)}`
}

function interactionLabel(row: Row, source: 'event' | 'activity' | 'project') {
  const value = normalized(row.event_type || row.action || row.type || row.description)
  if (value.includes('devis') && value.includes('accep')) return 'Devis accepté'
  if (value.includes('devis') && (value.includes('envoy') || value.includes('send'))) return 'Devis envoyé'
  if (value.includes('rendez') || value.includes('appointment')) return 'Rendez-vous planifié'
  if (value.includes('message')) return value.includes('artisan') ? 'Réponse artisan' : 'Message client'
  if (value.includes('information') || value.includes('complet')) return 'Informations complétées'
  return source === 'project' ? (row.updated_at ? 'Projet mis à jour' : 'Projet créé') : source === 'event' ? 'Message client' : 'Projet mis à jour'
}

function chooseAttention(input: { source: 'canonical' | 'legacy'; possibleDuplicate: boolean; projects: Row[]; appointments: Row[]; quotes: Row[]; now: Date }) {
  if (input.possibleDuplicate) return 'possible_duplicate'
  if (input.source === 'legacy') return 'legacy_unlinked'
  if (input.appointments.some((item) => normalizedStatus(item.confirmation_status) === 'change_requested')) return 'appointment_change_requested'
  if (input.appointments.some((item) => normalizedStatus(item.confirmation_status) === 'pending')) return 'appointment_awaiting_confirmation'
  // A quote without quote_sent_at has no proven follow-up start. Its creation
  // time is used only as an explicit legacy proxy, never an update timestamp.
  if (input.quotes.some((item) => !isAcceptedQuote(item) && PENDING_QUOTE_STATUSES.has(normalizedStatus(item.statut || item.status)) && (() => { const sent = date(item.quote_sent_at || item.created_at); return sent ? input.now.getTime() - sent.getTime() > PENDING_QUOTE_MS : false })())) return 'quote_pending_too_long'
  if (input.projects.some((item) => ['à rappeler', 'a rappeler'].includes(normalizedStatus(item.status)))) return 'project_to_call_back'
  if (input.projects.some((item) => ACTIVE_PROJECT_STATUSES.has(normalizedStatus(item.status)) && (() => { const changed = date(item.updated_at || item.created_at); return changed ? input.now.getTime() - changed.getTime() > STALE_PROJECT_MS : false })())) return 'stale_active_project'
  return null
}

function clientStatus(source: 'canonical' | 'legacy', identity: Row, projects: Row[], attentionReason: string | null) {
  if (source === 'legacy') return 'legacy'
  const explicit = text(identity.status)
  if (explicit) return explicit.toLowerCase()
  if (projects.some((project) => ['gagné', 'gagne', 'won'].includes(normalizedStatus(project.status)))) return 'customer'
  if (projects.every((project) => ['perdu', 'lost'].includes(normalizedStatus(project.status))) && projects.length) return 'lost'
  return attentionReason ? 'follow_up' : 'prospect'
}

export function aggregateClientList(input: { clients: Row[]; projects: Row[]; quotes: Row[]; appointments: Row[]; activities: Row[]; events: Row[]; now?: Date; includeArchived?: boolean }): ClientListItem[] {
  const now = input.now || new Date()
  const canonicalProjects = new Map<string, Row[]>()
  const legacyProjects = new Map<string, Row[]>()
  for (const project of input.projects) {
    const clientId = text(project.client_id)
    const target = clientId ? canonicalProjects : legacyProjects
    const key = clientId || legacyKey(project)
    target.set(key, [...(target.get(key) || []), project])
  }

  const make = (id: string, source: 'canonical' | 'legacy', identity: Row, projects: Row[]): ClientListItem => {
    const projectIds = new Set(projects.map((project) => String(project.id)))
    const quotes = input.quotes.filter((quote) => projectIds.has(String(quote.project_id)))
    const linkedAppointments = input.appointments.filter((appointment) => projectIds.has(String(appointment.project_id)) && !isCancelledAppointment(appointment))
    const nextAppointment = linkedAppointments
      .filter((appointment) => { const start = date(appointment.start_time); return Boolean(start && start >= now) })
      .sort((left, right) => (date(left.start_time)?.getTime() || 0) - (date(right.start_time)?.getTime() || 0))[0]
    const interactions = [
      ...input.events.filter((event) => projectIds.has(String(event.project_id))).map((event) => ({ value: event, source: 'event' as const, at: date(event.created_at) })),
      ...input.activities.filter((activity) => projectIds.has(String(activity.project_id))).map((activity) => ({ value: activity, source: 'activity' as const, at: date(activity.created_at) })),
      ...projects.flatMap((project) => [
        { value: { ...project, updated_at: project.updated_at }, source: 'project' as const, at: date(project.updated_at) },
        { value: { ...project, created_at: project.created_at }, source: 'project' as const, at: date(project.created_at) },
      ]),
    ].filter((interaction) => interaction.at).sort((left, right) => (right.at?.getTime() || 0) - (left.at?.getTime() || 0))
    const latestProject = [...projects].sort((left, right) => (date(right.updated_at || right.created_at)?.getTime() || 0) - (date(left.updated_at || left.created_at)?.getTime() || 0))[0]
    const email = text(identity.email) || text(identity.client_email)
    const tel = text(identity.phone) || text(identity.client_phone)
    const possibleCanonical = source === 'legacy'
      ? input.clients.find((client) => (email && normalized(client.email) === normalized(email)) || (phone(client.phone) && phone(client.phone) === phone(tel)))
      : undefined
    const attentionReason = chooseAttention({ source, possibleDuplicate: Boolean(possibleCanonical), projects, appointments: linkedAppointments, quotes, now })
    const firstName = text(identity.first_name) || text(identity.client_first_name)
    const lastName = text(identity.last_name) || text(identity.client_name)
    const companyName = text(identity.company_name)
    return {
      id,
      source,
      possibleCanonicalClientId: possibleCanonical ? String(possibleCanonical.id) : null,
      displayName: companyName || [firstName, lastName].filter(Boolean).join(' ') || 'Client sans nom',
      firstName,
      lastName,
      companyName,
      email,
      phone: tel,
      city: text(identity.city),
      status: clientStatus(source, identity, projects, attentionReason),
      projectCount: projects.length,
      activeProjectCount: projects.filter((project) => ACTIVE_PROJECT_STATUSES.has(normalizedStatus(project.status))).length,
      wonProjectCount: projects.filter((project) => ['gagné', 'gagne', 'won'].includes(normalizedStatus(project.status))).length,
      lostProjectCount: projects.filter((project) => ['perdu', 'lost'].includes(normalizedStatus(project.status))).length,
      quoteCount: quotes.length,
      acceptedQuoteCount: quotes.filter(isAcceptedQuote).length,
      pendingQuoteCount: quotes.filter((quote) => !isAcceptedQuote(quote)).length,
      totalQuotedAmount: quotes.reduce((sum, quote) => sum + quoteAmount(quote), 0),
      acceptedAmount: quotes.filter(isAcceptedQuote).reduce((sum, quote) => sum + quoteAmount(quote), 0),
      latestProject: latestProject ? { id: String(latestProject.id), title: text(latestProject.project_title) || 'Dossier', status: text(latestProject.status) || 'Nouveau', createdAt: text(latestProject.created_at) || '' } : null,
      nextAppointment: nextAppointment ? { id: String(nextAppointment.id), title: text(nextAppointment.title) || 'Rendez-vous', startTime: text(nextAppointment.start_time) || '', confirmationStatus: text(nextAppointment.confirmation_status) || 'pending', assignedUserId: text(nextAppointment.assigned_user_id) } : null,
      lastInteractionAt: interactions[0]?.at?.toISOString() || null,
      lastInteractionLabel: interactions[0] ? interactionLabel(interactions[0].value, interactions[0].source) : null,
      needsAttention: Boolean(attentionReason),
      attentionReason,
    }
  }

  const canonical = input.clients
    .filter((client) => input.includeArchived || (!client.archived_at && !client.merged_into_client_id))
    .map((client) => make(String(client.id), 'canonical', client, canonicalProjects.get(String(client.id)) || []))
  const legacy = [...legacyProjects.entries()].map(([key, projects]) => make(legacyId(key), 'legacy', projects[0], projects))
  return [...canonical, ...legacy]
}

export function filterClientList(items: ClientListItem[], params: { q?: string; source?: string; active?: boolean; attention?: boolean; recurring?: boolean; hasAppointment?: boolean; status?: string; attentionReason?: string }) {
  const query = normalized(params.q)
  const queryPhone = phone(params.q)
  return items.filter((item) => {
    if (params.source && item.source !== params.source) return false
    if (params.status && normalized(item.status) !== normalized(params.status)) return false
    if (params.active !== undefined && (item.activeProjectCount > 0) !== params.active) return false
    if (params.attention !== undefined && item.needsAttention !== params.attention) return false
    if (params.attentionReason && item.attentionReason !== params.attentionReason) return false
    if (params.recurring !== undefined && (item.projectCount >= 2) !== params.recurring) return false
    if (params.hasAppointment !== undefined && Boolean(item.nextAppointment) !== params.hasAppointment) return false
    if (!query) return true
    const haystack = normalized([item.displayName, item.firstName, item.lastName, item.companyName, item.email, item.city, item.latestProject?.title].filter(Boolean).join(' '))
    return haystack.includes(query) || (queryPhone.length >= 6 && phone(item.phone).includes(queryPhone))
  })
}

function compareNullable(left: string | null, right: string | null, direction: 'asc' | 'desc') {
  if (left === right) return 0
  if (!left) return 1
  if (!right) return -1
  return direction === 'asc' ? left.localeCompare(right) : right.localeCompare(left)
}

export function sortAndPaginateClientList(items: ClientListItem[], page: number, pageSize: number, sort: ClientListSort = 'attention', order: 'asc' | 'desc' = 'desc') {
  const sorted = [...items].sort((left, right) => {
    let comparison = 0
    if (sort === 'attention') comparison = Number(right.needsAttention) - Number(left.needsAttention) || compareNullable(left.lastInteractionAt, right.lastInteractionAt, 'desc')
    if (sort === 'lastInteraction') comparison = compareNullable(left.lastInteractionAt, right.lastInteractionAt, order)
    if (sort === 'name') comparison = left.displayName.localeCompare(right.displayName, 'fr', { sensitivity: 'base' }) * (order === 'asc' ? 1 : -1)
    if (sort === 'acceptedValue') comparison = (left.acceptedAmount - right.acceptedAmount) * (order === 'asc' ? 1 : -1)
    if (sort === 'projectCount') comparison = (left.projectCount - right.projectCount) * (order === 'asc' ? 1 : -1)
    if (sort === 'nextAppointment') comparison = compareNullable(left.nextAppointment?.startTime || null, right.nextAppointment?.startTime || null, order)
    return comparison || left.displayName.localeCompare(right.displayName, 'fr', { sensitivity: 'base' }) || left.id.localeCompare(right.id)
  })
  const safePage = Math.max(1, page)
  const safePageSize = Math.min(100, Math.max(1, pageSize))
  return { total: sorted.length, page: safePage, pageSize: safePageSize, items: sorted.slice((safePage - 1) * safePageSize, safePage * safePageSize) }
}

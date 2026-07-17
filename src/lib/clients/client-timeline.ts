import type { ClientDetailTone, ClientTimelineEvent } from './client-detail-types'

/**
 * Pure normalizer for the client timeline. Takes already tenant-scoped,
 * already batch-loaded rows from Projects / Activity / ProjectClientEvents /
 * Devis / project_appointments and turns them into a common, human,
 * deduplicated, sorted `ClientTimelineEvent[]`. Never depends on the order
 * Supabase returns rows in — always sorts explicitly.
 */

type Row = Record<string, unknown>

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)

function toIso(value: unknown): string | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const normalized = (value: unknown) =>
  (text(value) || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

function projectEventLabel(row: Row): { title: string; tone: ClientDetailTone } {
  const status = normalized(row.status)
  if (['gagne', 'gagné', 'won'].includes(status)) return { title: 'Dossier gagné', tone: 'success' }
  if (['perdu', 'lost'].includes(status)) return { title: 'Dossier perdu', tone: 'danger' }
  return { title: 'Dossier mis à jour', tone: 'neutral' }
}

function activityLabel(row: Row): { title: string; tone: ClientDetailTone } {
  const value = normalized(row.action || row.description)
  if (value.includes('devis') && value.includes('accep')) return { title: 'Devis accepté', tone: 'success' }
  if (value.includes('devis') && (value.includes('envoy') || value.includes('send'))) return { title: 'Devis envoyé', tone: 'info' }
  if (value.includes('devis') && (value.includes('refus') || value.includes('declin'))) return { title: 'Devis refusé', tone: 'danger' }
  if (value.includes('rendez') || value.includes('appointment')) return { title: 'Rendez-vous', tone: 'info' }
  return { title: 'Activité sur le dossier', tone: 'neutral' }
}

function eventLabel(row: Row): { title: string; tone: ClientDetailTone } {
  const value = normalized(row.event_type)
  if (value.includes('modification') || value.includes('change_request')) return { title: 'Modification de rendez-vous demandée', tone: 'warning' }
  if (value.includes('confirm')) return { title: 'Rendez-vous confirmé', tone: 'success' }
  if (value.includes('information') || value.includes('complet')) return { title: 'Informations complétées par le client', tone: 'info' }
  if (value.includes('message')) return { title: 'Message client', tone: 'info' }
  return { title: 'Interaction client', tone: 'neutral' }
}

function appointmentLabel(row: Row): { title: string; tone: ClientDetailTone } {
  const status = normalized(row.confirmation_status)
  if (status === 'change_requested') return { title: 'Modification de rendez-vous demandée', tone: 'warning' }
  if (status === 'confirmed') return { title: 'Rendez-vous confirmé', tone: 'success' }
  if (status === 'cancelled') return { title: 'Rendez-vous annulé', tone: 'neutral' }
  return { title: 'Rendez-vous planifié', tone: 'info' }
}

function quoteLabel(row: Row): { title: string; tone: ClientDetailTone; at: string | null } {
  const accepted = row.accepted === true || Boolean(text(row.accepted_at))
  if (accepted) return { title: 'Devis accepté', tone: 'success', at: toIso(row.accepted_at) }
  if (text(row.quote_sent_at)) return { title: 'Devis envoyé', tone: 'info', at: toIso(row.quote_sent_at) }
  return { title: 'Devis créé', tone: 'neutral', at: toIso(row.created_at) }
}

type TimelineInput = {
  projects: Row[]
  activities: Row[]
  events: Row[]
  appointments: Row[]
  quotes: Row[]
  projectTitleById: Map<string, string>
  projectHrefById: (projectId: string) => string
  onOrphan?: (source: string) => void
}

export function buildClientTimeline(input: TimelineInput): ClientTimelineEvent[] {
  const events: ClientTimelineEvent[] = []
  const seen = new Set<string>()

  const push = (id: string, occurredAt: string | null, entry: Omit<ClientTimelineEvent, 'id' | 'occurredAt'>, orphanSource?: string) => {
    if (!occurredAt) {
      if (orphanSource) input.onOrphan?.(orphanSource)
      return
    }
    // Dedup key: same title + project + minute-level timestamp is treated as
    // the same underlying action recorded across multiple source tables.
    const key = `${entry.title}:${entry.projectId || ''}:${occurredAt.slice(0, 16)}`
    if (seen.has(key)) return
    seen.add(key)
    events.push({ id, occurredAt, ...entry })
  }

  for (const project of input.projects) {
    const projectId = text(project.id)
    if (!projectId) { input.onOrphan?.('project_missing_id'); continue }
    const title = input.projectTitleById.get(projectId) || 'Dossier'
    const href = input.projectHrefById(projectId)
    const createdAt = toIso(project.created_at)
    if (createdAt) push(`project-created:${projectId}`, createdAt, { type: 'project_created', title: 'Dossier créé', description: title, projectId, projectTitle: title, href, tone: 'neutral' })
    const updatedAt = toIso(project.updated_at)
    if (updatedAt && updatedAt !== createdAt) {
      const label = projectEventLabel(project)
      push(`project-updated:${projectId}`, updatedAt, { type: 'project_updated', title: label.title, description: title, projectId, projectTitle: title, href, tone: label.tone })
    }
  }

  for (const [activityIndex, activity] of input.activities.entries()) {
    const projectId = text(activity.project_id)
    if (!projectId || !input.projectTitleById.has(projectId)) { input.onOrphan?.('activity_orphan_project'); continue }
    const at = toIso(activity.created_at)
    const title = input.projectTitleById.get(projectId) || 'Dossier'
    const label = activityLabel(activity)
    // Activity is append-only and has no historical primary key. This key is
    // presentation-only and deterministic from persisted columns plus index.
    const activityKey = [projectId, at || '', text(activity.action) || '', text(activity.description) || '', String(activityIndex)].join(':')
    push(`activity:${activityKey}`, at, { type: 'activity', title: label.title, description: text(activity.description), projectId, projectTitle: title, href: input.projectHrefById(projectId), tone: label.tone }, 'activity_invalid_date')
  }

  for (const event of input.events) {
    const projectId = text(event.project_id)
    if (!projectId || !input.projectTitleById.has(projectId)) { input.onOrphan?.('client_event_orphan_project'); continue }
    const at = toIso(event.created_at)
    const title = input.projectTitleById.get(projectId) || 'Dossier'
    const label = eventLabel(event)
    push(`event:${text(event.id) || `${projectId}-${at}`}`, at, { type: 'client_event', title: label.title, description: null, projectId, projectTitle: title, href: input.projectHrefById(projectId), tone: label.tone }, 'client_event_invalid_date')
  }

  for (const appointment of input.appointments) {
    const projectId = text(appointment.project_id)
    if (!projectId || !input.projectTitleById.has(projectId)) { input.onOrphan?.('appointment_orphan_project'); continue }
    const at = toIso(appointment.created_at) || toIso(appointment.start_time)
    const title = input.projectTitleById.get(projectId) || 'Dossier'
    const label = appointmentLabel(appointment)
    push(`appointment:${text(appointment.id) || `${projectId}-${at}`}`, at, { type: 'appointment', title: label.title, description: text(appointment.title), projectId, projectTitle: title, href: input.projectHrefById(projectId), tone: label.tone }, 'appointment_invalid_date')
  }

  for (const quote of input.quotes) {
    const projectId = text(quote.project_id)
    if (!projectId || !input.projectTitleById.has(projectId)) { input.onOrphan?.('quote_orphan_project'); continue }
    const title = input.projectTitleById.get(projectId) || 'Dossier'
    const label = quoteLabel(quote)
    push(`quote:${text(quote.id) || `${projectId}-${label.at}`}`, label.at, { type: 'quote', title: label.title, description: title, projectId, projectTitle: title, href: input.projectHrefById(projectId), tone: label.tone }, 'quote_invalid_date')
  }

  return events.sort((left, right) => (right.occurredAt < left.occurredAt ? -1 : right.occurredAt > left.occurredAt ? 1 : 0))
}

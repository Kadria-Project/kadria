import type { ClientListItem } from './client-list-types'
import { CLIENT_ACTION_CONFIG, CLIENT_ACTION_PRIORITY_ORDER } from './clients-action-config'
import type { ClientActionItem, ClientActionPriority, ClientActionReason, ClientActionsSummary } from './clients-action-types'

const IMMINENT_APPOINTMENT_MS = 48 * 60 * 60 * 1000
const RANK_BY_REASON = new Map(CLIENT_ACTION_PRIORITY_ORDER.map((reason, index) => [reason, index]))
const MAX_ACTION_CENTER_ITEMS = 5

function isKnownReason(value: string | null): value is ClientActionReason {
  return Boolean(value) && value! in CLIENT_ACTION_CONFIG
}

function resolvePriority(reason: ClientActionReason, item: ClientListItem, now: Date): ClientActionPriority {
  if (reason === 'appointment_awaiting_confirmation' && item.nextAppointment) {
    const start = new Date(item.nextAppointment.startTime)
    if (!Number.isNaN(start.getTime()) && start.getTime() - now.getTime() <= IMMINENT_APPOINTMENT_MS) return 'critical'
  }
  return CLIENT_ACTION_CONFIG[reason].basePriority
}

function resolveDueAt(reason: ClientActionReason, item: ClientListItem): string | null {
  if (reason === 'appointment_change_requested' || reason === 'appointment_awaiting_confirmation') return item.nextAppointment?.startTime || null
  if (reason === 'quote_pending_too_long') return item.lastInteractionAt
  return null
}

function resolveHref(reason: ClientActionReason, item: ClientListItem): string | null {
  if (reason === 'possible_duplicate') return null
  if (!item.latestProject) return null
  return `/dashboard-v2/projet/${item.latestProject.id}`
}

/**
 * Turns the already tenant-scoped, already aggregated client list into CRM
 * action items. Pure and deterministic: no network calls, no LLM, no
 * recomputation of business aggregates — it only reads fields already
 * produced by `aggregateClientList`.
 */
export function deriveClientActions(items: ClientListItem[], now: Date = new Date()): ClientActionItem[] {
  const actions: ClientActionItem[] = []
  for (const item of items) {
    if (!item.needsAttention || !isKnownReason(item.attentionReason)) continue
    const reason = item.attentionReason as ClientActionReason
    // A client without any project cannot receive an artificial action,
    // except legacy contacts (which are never linked to a canonical project)
    // and possible duplicates (reviewed via the contact itself, not a folder).
    if (reason !== 'legacy_unlinked' && reason !== 'possible_duplicate' && !item.latestProject) continue
    const config = CLIENT_ACTION_CONFIG[reason]
    const dueAt = resolveDueAt(reason, item)
    actions.push({
      id: `${item.id}:${reason}`,
      clientId: item.id,
      source: item.source,
      clientName: item.displayName,
      companyName: item.companyName,
      projectId: item.latestProject?.id || null,
      projectTitle: item.latestProject?.title || null,
      reason,
      title: config.label,
      description: config.buildDescription({ clientName: item.displayName, dueLabel: null }),
      priority: resolvePriority(reason, item, now),
      dueAt,
      lastInteractionAt: item.lastInteractionAt,
      appointmentAt: item.nextAppointment?.startTime || null,
      amount: reason === 'quote_pending_too_long' ? item.totalQuotedAmount || null : null,
      href: resolveHref(reason, item),
    })
  }
  return actions.sort((left, right) => {
    const priorityWeight: Record<ClientActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return (
      priorityWeight[left.priority] - priorityWeight[right.priority] ||
      (RANK_BY_REASON.get(left.reason) ?? 99) - (RANK_BY_REASON.get(right.reason) ?? 99) ||
      left.clientName.localeCompare(right.clientName, 'fr', { sensitivity: 'base' }) ||
      left.id.localeCompare(right.id)
    )
  })
}

export function summarizeClientActions(actions: ClientActionItem[]): ClientActionsSummary {
  const count = (reason: ClientActionReason) => actions.filter((action) => action.reason === reason).length
  return {
    total: actions.length,
    callbacks: count('project_to_call_back'),
    quotesWaiting: count('quote_pending_too_long'),
    appointmentsToConfirm: count('appointment_awaiting_confirmation'),
    appointmentChanges: count('appointment_change_requested'),
    contactsToReconcile: count('possible_duplicate'),
    staleProjects: count('stale_active_project'),
    followUps: count('client_follow_up'),
  }
}

export function topClientActions(actions: ClientActionItem[], limit: number = MAX_ACTION_CENTER_ITEMS): ClientActionItem[] {
  return actions.slice(0, limit)
}

import type { AssistantResponse, AssistantResponseDetail } from './assistant-response'
import type { AssistantIntent } from './assistant-intents'
import type { TrackingBrief, TrackingOpportunity } from '@/src/components/workspace/tracking/tracking-contract'

export type TrackingInsightPriority = 'urgent' | 'attention' | 'normal'

export interface TrackingInsight {
  id: string
  projectId: string
  label: string
  status: string
  reason: string
  meta?: string
  priority: TrackingInsightPriority
  href: string
}

function priorityFor(item: TrackingOpportunity): TrackingInsightPriority {
  if (item.evidenceLevel === 'strong') return 'urgent'
  if (item.evidenceLevel === 'moderate') return 'attention'
  return 'normal'
}

function toInsight(item: TrackingOpportunity): TrackingInsight {
  return {
    id: item.id,
    projectId: item.projectId,
    label: item.title,
    status: item.stage,
    reason: item.blockage || item.observedFacts[0] || 'Une prochaine action doit être confirmée.',
    ...(item.stalledForDays !== null ? { meta: `${item.stalledForDays} jour${item.stalledForDays > 1 ? 's' : ''} d’attente` } : {}),
    priority: priorityFor(item),
    href: item.destination.href,
  }
}

function selectInsights(intent: AssistantIntent, opportunities: TrackingOpportunity[]) {
  if (intent === 'tracking.followups') return opportunities.filter((item) => item.id.startsWith('quote-'))
  if (intent === 'tracking.next_actions') return opportunities.filter((item) => item.id.startsWith('callback-') || item.id.startsWith('inactive-'))
  return opportunities
}

function detailFor(item: TrackingInsight): AssistantResponseDetail {
  return { id: item.id, label: item.label, value: item.reason, ...(item.meta ? { meta: item.meta } : {}), severity: item.priority === 'urgent' ? 'urgent' : item.priority === 'attention' ? 'attention' : 'neutral' }
}

const labels: Record<Extract<AssistantIntent, `tracking.${string}`>, string> = {
  'tracking.blocked_projects': 'Dossiers bloqués',
  'tracking.followups': 'Dossiers à relancer',
  'tracking.next_actions': 'Dossiers sans prochaine action',
}

export function buildTrackingInsightResponse(intent: Extract<AssistantIntent, `tracking.${string}`>, brief: TrackingBrief): AssistantResponse {
  const insights = selectInsights(intent, brief.opportunities).map(toInsight).slice(0, 5)
  const title = labels[intent]
  if (brief.dataQuality.level === 'insufficient') {
    return { intent, title, summary: 'Les informations disponibles ne suffisent pas à confirmer ce suivi.', evidence: { level: 'limited', note: brief.dataQuality.reservations[0] }, actions: [{ kind: 'navigate', label: 'Ouvrir le suivi', href: '/dashboard-v2/suivi' }] }
  }
  if (insights.length === 0) {
    return { intent, title, summary: intent === 'tracking.blocked_projects' ? 'Aucun dossier bloqué selon les règles actuelles.' : 'Aucun dossier ne correspond à ce suivi pour le moment.', evidence: { level: brief.dataQuality.level === 'partial' ? 'moderate' : 'solid', ...(brief.dataQuality.reservations[0] ? { note: brief.dataQuality.reservations[0] } : {}) } }
  }
  return {
    intent,
    title,
    summary: `${insights.length} dossier${insights.length > 1 ? 's' : ''} nécessite${insights.length > 1 ? 'nt' : ''} une prochaine action.`,
    details: insights.map(detailFor),
    actions: insights.map((item) => ({ kind: 'navigate' as const, label: `Ouvrir ${item.label}`, href: item.href })),
    evidence: { level: brief.dataQuality.level === 'partial' ? 'moderate' : 'solid', ...(brief.dataQuality.reservations[0] ? { note: brief.dataQuality.reservations[0] } : {}) },
  }
}

import type { RecommendationLifecycle, RecommendationLoop } from './recommendation-lifecycle'

export interface InterventionMemory {
  interventionId: string
  projectId: string
  recommendationType: 'quote_followup'
  cycleState: RecommendationLifecycle
  firstObservedAt?: string
  lastObservedAt?: string
  viewedAt?: string
  executedAt?: string
  resolvedAt?: string
  lastKnownEvidence: 'quote_sent' | 'follow_up_recorded' | 'quote_decision' | 'insufficient_data'
  lastKnownOutcome?: 'accepted' | 'declined' | 'closed'
  nextReviewAt?: string
  recommendationRevisionReason?: 'viewed' | 'follow_up_recorded' | 'observation_due' | 'no_change' | 'outcome_recorded' | 'repeated_follow_up'
}

export interface InterventionContinuity {
  label: 'Depuis la dernière fois' | 'Ce qui a changé' | 'Kadria attend encore' | 'Recommandation réévaluée'
  summary: string
}

type QuoteMemoryInput = {
  interventionId: string
  projectId: string
  lifecycle: RecommendationLifecycle
  loop: RecommendationLoop
  quoteSentAt?: string | null
  viewedAt?: string
  lastFollowUpAt?: string | null
  followUpCount?: number | null
  resolvedAt?: string | null
  outcome?: 'accepted' | 'declined' | 'closed'
}

export function buildQuoteInterventionMemory(input: QuoteMemoryInput): { memory: InterventionMemory; continuity?: InterventionContinuity } {
  const executedAt = input.lastFollowUpAt || undefined
  const resolvedAt = input.resolvedAt || undefined
  const isRepeated = (input.followUpCount || 0) >= 3
  const memory: InterventionMemory = {
    interventionId: input.interventionId, projectId: input.projectId, recommendationType: 'quote_followup', cycleState: input.lifecycle,
    firstObservedAt: input.quoteSentAt || undefined,
    lastObservedAt: resolvedAt || executedAt || input.viewedAt || input.quoteSentAt || undefined,
    viewedAt: input.viewedAt, executedAt, resolvedAt,
    lastKnownEvidence: resolvedAt ? 'quote_decision' : executedAt ? 'follow_up_recorded' : input.loop.uncertainty ? 'insufficient_data' : 'quote_sent',
    lastKnownOutcome: input.outcome,
    nextReviewAt: input.loop.observationEndsAt,
    recommendationRevisionReason: resolvedAt ? 'outcome_recorded' : isRepeated ? 'repeated_follow_up' : executedAt ? 'follow_up_recorded' : input.viewedAt ? 'viewed' : undefined,
  }
  if (resolvedAt) return { memory, continuity: { label: 'Ce qui a changé', summary: 'Une décision est enregistrée : cette recommandation n’est plus active.' } }
  if (isRepeated) return { memory, continuity: { label: 'Recommandation réévaluée', summary: 'Aucun retour n’a été observé après trois relances. Kadria recommande de réévaluer l’opportunité plutôt que de relancer à nouveau.' } }
  if (executedAt) return { memory, continuity: { label: 'Depuis la dernière fois', summary: 'Une relance a été enregistrée. Kadria attend maintenant une réponse ou une décision.' } }
  if (input.viewedAt) return { memory, continuity: { label: 'Kadria attend encore', summary: 'Aucun changement depuis la dernière consultation.' } }
  return { memory }
}

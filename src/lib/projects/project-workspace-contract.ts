export type ProjectWorkspaceDataQuality = {
  level: 'complete' | 'partial' | 'insufficient'
  reservations: string[]
}

export type ProjectWorkspaceBrief = {
  generatedAt: string
  dataQuality: ProjectWorkspaceDataQuality
  project: {
    id: string
    title: string
    stage: string
    clientLabel: string | null
    trade: string | null
    city: string | null
  }
  decision: {
    observedFacts: Array<{ label: string; occurredAt?: string; source?: string }>
    understanding: string
    evidenceLevel: 'strong' | 'moderate' | 'weak'
    uncertainty?: string
    recommendation?: string
    why?: string
    primaryAction?: { id: string; label: string; destination?: string }
  }
  qualification: { confirmed: string[]; missing: string[]; consequence: string; evidenceLevel: 'strong' | 'moderate' | 'weak'; action?: { label: string; destination: string } }
  commercialSummary: { state: string; observedFacts: string[]; understanding: string; evidenceLevel: 'strong' | 'moderate' | 'weak'; uncertainty?: string; recommendation?: string; why?: string }
  nextEngagement: { kind: 'appointment' | 'quote_follow_up' | 'none'; startsAt?: string; label: string; objective?: string; preparation: string[]; evidenceLevel: 'strong' | 'moderate' | 'weak'; uncertainty?: string; destination?: string }
  recentFacts: Array<{ id: string; label: string; occurredAt: string; category: string; source?: string }>
  evidence: { photosCount: number; documentsCount: number; quoteAvailable: boolean; recentEvidence: Array<{ id: string; kind: 'photo' | 'document' | 'quote'; label: string; occurredAt?: string }>; reservations: string[] }
  capabilities: {
    canEditProject: boolean
    canManageQuote: boolean
    canPlanAppointment: boolean
  }
}

const rootKeys = ['generatedAt', 'dataQuality', 'project', 'decision', 'qualification', 'commercialSummary', 'nextEngagement', 'recentFacts', 'evidence', 'capabilities']
const forbiddenKeys = new Set(['clientEmail', 'clientPhone', 'siteAddress', 'address', 'internalNotes', 'messages', 'documents', 'photos', 'quotes', 'appointments', 'activities', 'team', 'config', 'profiles', 'score', 'supabase'])

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`Invalid ${label} key: ${key}`)
  }
}

function assertNoForbiddenKeys(value: unknown) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenKeys)
    return
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenKeys.has(key)) throw new Error(`Forbidden ProjectWorkspaceBrief key: ${key}`)
    assertNoForbiddenKeys(nested)
  }
}

export function validateProjectWorkspaceBrief(value: ProjectWorkspaceBrief): ProjectWorkspaceBrief {
  exactKeys(value, rootKeys, 'brief')
  exactKeys(value.dataQuality, ['level', 'reservations'], 'dataQuality')
  exactKeys(value.project, ['id', 'title', 'stage', 'clientLabel', 'trade', 'city'], 'project')
  exactKeys(value.decision, ['observedFacts', 'understanding', 'evidenceLevel', 'uncertainty', 'recommendation', 'why', 'primaryAction'], 'decision')
  exactKeys(value.qualification, ['confirmed', 'missing', 'consequence', 'evidenceLevel', 'action'], 'qualification')
  exactKeys(value.commercialSummary, ['state', 'observedFacts', 'understanding', 'evidenceLevel', 'uncertainty', 'recommendation', 'why'], 'commercialSummary')
  exactKeys(value.nextEngagement, ['kind', 'startsAt', 'label', 'objective', 'preparation', 'evidenceLevel', 'uncertainty', 'destination'], 'nextEngagement')
  exactKeys(value.evidence, ['photosCount', 'documentsCount', 'quoteAvailable', 'recentEvidence', 'reservations'], 'evidence')
  exactKeys(value.capabilities, ['canEditProject', 'canManageQuote', 'canPlanAppointment'], 'capabilities')
  for (const fact of value.decision.observedFacts) exactKeys(fact, ['label', 'occurredAt', 'source'], 'observedFact')
  if (value.decision.primaryAction) exactKeys(value.decision.primaryAction, ['id', 'label', 'destination'], 'primaryAction')
  if (value.qualification.action) exactKeys(value.qualification.action, ['label', 'destination'], 'qualificationAction')
  if (!['complete', 'partial', 'insufficient'].includes(value.dataQuality.level)) throw new Error('Invalid dataQuality level')
  if (!['strong', 'moderate', 'weak'].includes(value.decision.evidenceLevel)) throw new Error('Invalid evidence level')
  if (value.decision.observedFacts.length > 5) throw new Error('Too many observed facts')
  if (value.commercialSummary.observedFacts.length > 3) throw new Error('Too many commercial facts')
  if (value.recentFacts.length > 5) throw new Error('Too many recent facts')
  if (value.nextEngagement.preparation.length > 5) throw new Error('Too much engagement preparation')
  assertNoForbiddenKeys(value)
  return value
}

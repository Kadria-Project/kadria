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
  capabilities: {
    canEditProject: boolean
    canManageQuote: boolean
    canPlanAppointment: boolean
  }
}

const rootKeys = ['generatedAt', 'dataQuality', 'project', 'decision', 'capabilities']
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
  exactKeys(value.capabilities, ['canEditProject', 'canManageQuote', 'canPlanAppointment'], 'capabilities')
  for (const fact of value.decision.observedFacts) exactKeys(fact, ['label', 'occurredAt', 'source'], 'observedFact')
  if (value.decision.primaryAction) exactKeys(value.decision.primaryAction, ['id', 'label', 'destination'], 'primaryAction')
  if (!['complete', 'partial', 'insufficient'].includes(value.dataQuality.level)) throw new Error('Invalid dataQuality level')
  if (!['strong', 'moderate', 'weak'].includes(value.decision.evidenceLevel)) throw new Error('Invalid evidence level')
  if (value.decision.observedFacts.length > 5) throw new Error('Too many observed facts')
  assertNoForbiddenKeys(value)
  return value
}

export type CollaboratorInterventionLevel = 'critical' | 'important' | 'useful' | 'informational'

export type PrioritizableIntervention = {
  id: string
  type: string
  priority: 'high' | 'medium' | 'low'
  status: 'ready' | 'blocked'
  title: string
  description: string
  reason: string
  primaryActionLabel: string
  primaryActionHref: string
}

export type PrioritizedIntervention<T extends PrioritizableIntervention> = T & {
  level: CollaboratorInterventionLevel
  observedFact: string
  priorityReason: string
  isPrimary: boolean
}

const levelWeight: Record<CollaboratorInterventionLevel, number> = {
  critical: 0,
  important: 1,
  useful: 2,
  informational: 3,
}

const priorityWeight: Record<PrioritizableIntervention['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function levelFor(item: PrioritizableIntervention): CollaboratorInterventionLevel {
  if (item.type === 'delivery_error') return 'critical'
  if (item.type === 'quote_followup') return item.priority === 'high' ? 'important' : 'useful'
  if (item.type === 'review_request' || item.type === 'configuration') return 'useful'
  return 'informational'
}

function reasonFor(item: PrioritizableIntervention, level: CollaboratorInterventionLevel) {
  if (level === 'critical') return 'Une action déjà tentée a échoué : elle passe avant les optimisations.'
  if (level === 'important') return 'Ce devis attend une décision et la relance est réalisable depuis le dossier.'
  if (level === 'useful') return 'Cette action est réalisable et améliore le suivi, sans engagement client immédiatement compromis.'
  return 'Cette information aide à comprendre la situation, mais ne justifie pas une action prioritaire seule.'
}

export function prioritizeInterventions<T extends PrioritizableIntervention>(items: T[]): PrioritizedIntervention<T>[] {
  const ranked = items
    .map((item) => {
      const level = levelFor(item)
      return {
        ...item,
        level,
        observedFact: item.reason,
        priorityReason: reasonFor(item, level),
      }
    })
    .filter((item) => !(item.type === 'priority_project' && /score commercial/i.test(item.reason)))
    .sort((a, b) => levelWeight[a.level] - levelWeight[b.level]
      || priorityWeight[a.priority] - priorityWeight[b.priority]
      || a.id.localeCompare(b.id))

  const unique = ranked.filter(
    (item, index, all) => all.findIndex((candidate) => candidate.type === item.type && candidate.primaryActionHref === item.primaryActionHref) === index,
  )

  return unique.map((item, index) => ({ ...item, isPrimary: index === 0 && item.level !== 'informational' }))
}

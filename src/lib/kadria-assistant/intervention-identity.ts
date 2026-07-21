export type InterventionType = 'quote_followup' | 'review_request' | 'priority_project' | 'configuration' | 'delivery_error' | 'tasks_overview'

export function createInterventionId(type: InterventionType, projectId?: string) {
  return projectId ? `${type}:${projectId}` : type
}

export function viewedInterventionDescription(interventionId: string) {
  return `KADRIA_INTERVENTION_VIEWED:${interventionId}`
}

export function interventionIdFromViewedDescription(description: string | null | undefined) {
  const prefix = 'KADRIA_INTERVENTION_VIEWED:'
  return description?.startsWith(prefix) ? description.slice(prefix.length) : null
}

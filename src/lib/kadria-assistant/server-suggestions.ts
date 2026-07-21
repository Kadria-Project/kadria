import type { AssistantUiAction } from './assistant-action-contract'
import type { AssistantIntent } from './assistant-intents'
import type { AssistantResponse, AssistantSuggestion } from './assistant-response'

function suggestIntent(id: string, label: string, value: AssistantIntent, priority: AssistantSuggestion['priority']): AssistantSuggestion {
  return { id, label, action: { kind: 'intent', label, intent: value }, priority }
}

function actionKey(action: AssistantUiAction) {
  if (action.kind === 'intent') return `intent:${action.intent}`
  if (action.kind === 'navigate') return `navigate:${action.href}`
  if (action.kind === 'quick-create') return `create:${action.action}`
  if (action.kind === 'search') return `search:${action.query || ''}`
  return `mutation:${action.actionType}`
}

function forIntent(intent: AssistantIntent | undefined): AssistantSuggestion[] {
  switch (intent) {
    case 'tracking.blocked_projects': return [suggestIntent('tracking-followups', 'À relancer', 'tracking.followups', 'primary'), suggestIntent('tracking-next', 'Sans prochaine action', 'tracking.next_actions', 'secondary')]
    case 'tracking.followups': return [suggestIntent('tracking-blocked', 'Voir les bloqués', 'tracking.blocked_projects', 'primary'), suggestIntent('tracking-next', 'Sans prochaine action', 'tracking.next_actions', 'secondary')]
    case 'tracking.next_actions': return [suggestIntent('tracking-blocked', 'Voir les bloqués', 'tracking.blocked_projects', 'primary'), suggestIntent('tracking-followups', 'À relancer', 'tracking.followups', 'secondary')]
    case 'performance.summary': return [suggestIntent('performance-contributors', 'Contributeurs', 'performance.contributing_projects', 'primary'), suggestIntent('performance-explain', 'Expliquer', 'performance.explain_change', 'secondary')]
    case 'performance.contributing_projects': return [suggestIntent('performance-summary', 'Résumer', 'performance.summary', 'primary'), suggestIntent('performance-explain', 'Expliquer', 'performance.explain_change', 'secondary')]
    case 'performance.explain_change': return [suggestIntent('performance-summary', 'Résumer', 'performance.summary', 'primary'), suggestIntent('performance-contributors', 'Contributeurs', 'performance.contributing_projects', 'secondary')]
    case 'project.summary': return [suggestIntent('project-missing', 'Manques', 'project.missing_information', 'primary'), suggestIntent('project-next', 'Prochaine action', 'project.next_action', 'secondary')]
    case 'project.missing_information': return [suggestIntent('project-next', 'Prochaine action', 'project.next_action', 'primary')]
    case 'project.next_action': return [suggestIntent('project-summary', 'Résumé', 'project.summary', 'secondary'), suggestIntent('project-missing', 'Manques', 'project.missing_information', 'low')]
    default: return []
  }
}

export function withServerSuggestions(response: AssistantResponse): AssistantResponse {
  const direct = new Set((response.actions || []).map(actionKey))
  const suggestions = forIntent(response.intent).filter((suggestion) => !direct.has(actionKey(suggestion.action))).slice(0, 3)
  return suggestions.length ? { ...response, suggestions } : response
}

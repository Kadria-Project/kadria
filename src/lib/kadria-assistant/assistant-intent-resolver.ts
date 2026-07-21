import type { AssistantIntent } from './assistant-intents'
import type { AssistantRequest } from './assistant-request'
import { isAssistantIntentAvailable } from './assistant-capabilities'

export type AssistantIntentResolution =
  | { kind: 'capability'; intent: AssistantIntent; confidence: number; parameters: Record<string, unknown> }
  | { kind: 'conversation'; confidence: number; parameters: Record<string, never> }

function normalized(value: string) {
  return value.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function resolveMessageIntent(request: Extract<AssistantRequest, { kind: 'message' }>): AssistantIntent | null {
  const message = normalized(request.message)
  if (request.context.pageType === 'commercial_tracking') {
    if (/bloqu|stagn/.test(message)) return 'tracking.blocked_projects'
    if (/relanc/.test(message)) return 'tracking.followups'
    if (/sans prochaine action|aucune prochaine action|sans rappel/.test(message)) return 'tracking.next_actions'
  }
  if (request.context.pageType === 'project_detail') {
    if (/resum|resume/.test(message)) return 'project.summary'
    if (/manqu|complet|information/.test(message)) return 'project.missing_information'
    if (/prochaine action|que faire|prochaine etape/.test(message)) return 'project.next_action'
  }
  if (/\b(cherche|recherche|trouve)\b/.test(message)) return 'search.open'
  return null
}

// This deterministic resolver is intentionally narrow. O5 may add a strict
// structured OpenAI classifier, but it must return this same contract and can
// only select intents registered as available for the current context.
export function resolveAssistantIntent(request: AssistantRequest): AssistantIntentResolution {
  const intent = request.kind === 'intent' ? request.intent : resolveMessageIntent(request)
  if (!intent || !isAssistantIntentAvailable(intent, request.context.pageType)) {
    return { kind: 'conversation', confidence: 0, parameters: {} }
  }

  return {
    kind: 'capability',
    intent,
    confidence: request.kind === 'intent' ? 1 : 0.9,
    parameters: request.kind === 'intent' ? request.parameters || {} : {},
  }
}

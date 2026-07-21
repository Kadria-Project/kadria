import type { AssistantIntent } from './assistant-intents'
import type { AssistantRequest } from './assistant-request'
import { isAssistantIntentAvailable } from './assistant-capabilities'

export type AssistantIntentResolution =
  | { kind: 'capability'; intent: AssistantIntent; confidence: number; parameters: Record<string, unknown> }
  | { kind: 'navigation'; href: string; label: string; confidence: number }
  | { kind: 'conversation'; confidence: number; parameters: Record<string, never> }

function normalized(value: string) {
  return value.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function resolveMessageIntent(request: Extract<AssistantRequest, { kind: 'message' }>): AssistantIntent | null {
  const message = normalized(request.message)
  if (request.context.pageType === 'commercial_tracking') {
    if (/bloqu|stagn|oublie/.test(message)) return 'tracking.blocked_projects'
    if (/relanc|appeler/.test(message)) return 'tracking.followups'
    if (/sans prochaine action|aucune prochaine action|sans rappel/.test(message)) return 'tracking.next_actions'
  }
  if (request.context.pageType === 'performance') {
    if (/compose|contribu|affaires.*compt|devis.*accept/.test(message)) return 'performance.contributing_projects'
    if (/pourquoi|explique|hausse|baisse|variation/.test(message)) return 'performance.explain_change'
    if (/resum|resume|performance|chiffre d'affaires/.test(message)) return 'performance.summary'
  }
  if (request.context.pageType === 'project_detail') {
    if (/resum|resume|ou en est|rendez-vous.*existe|devis.*deja/.test(message)) return 'project.summary'
    if (/manqu|complet|information|bloqu|preparer le devis/.test(message)) return 'project.missing_information'
    if (/prochaine action|que faire|prochaine etape|maintenant/.test(message)) return 'project.next_action'
  }
  if (/\b(cherche|recherche|trouve)\b/.test(message)) return 'search.open'
  return null
}

function resolveNavigation(message: string): Extract<AssistantIntentResolution, { kind: 'navigation' }> | null {
  const text = normalized(message)
  const destinations = [
    [/\b(ouvre|va sur|montre).*agenda/, '/dashboard-v2/agenda', 'Ouvrir l’agenda'],
    [/\b(ouvre|va sur|montre).*(suivi|dossiers)/, '/dashboard-v2/suivi', 'Ouvrir le suivi'],
    [/\b(ouvre|va sur|montre).*performance/, '/dashboard-v2/performance', 'Ouvrir Performance'],
    [/\b(ouvre|va sur|montre).*parametr/, '/parametres', 'Ouvrir les paramètres'],
    [/\b(ouvre|va sur|montre).*devis/, '/dashboard-v2', 'Ouvrir les devis'],
  ] as const
  const match = destinations.find(([pattern]) => pattern.test(text))
  return match ? { kind: 'navigation', href: match[1], label: match[2], confidence: 1 } : null
}

// This deterministic resolver is intentionally narrow. O5 may add a strict
// structured OpenAI classifier, but it must return this same contract and can
// only select intents registered as available for the current context.
export function resolveAssistantIntent(request: AssistantRequest): AssistantIntentResolution {
  if (request.kind === 'message') {
    const navigation = resolveNavigation(request.message)
    if (navigation) return navigation
  }
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

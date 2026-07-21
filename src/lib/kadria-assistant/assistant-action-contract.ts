import type { AssistantIntent } from './assistant-intents'

export type AssistantQuickCreateAction = 'project' | 'appointment' | 'quote'

export type AssistantUiAction =
  | { kind: 'navigate'; label: string; href: string }
  | { kind: 'quick-create'; label: string; action: AssistantQuickCreateAction }
  | { kind: 'search'; label: string; query?: string }
  | { kind: 'assistant-mutation'; label: string; actionType: string; payload: unknown; requiresConfirmation: true }
  | { kind: 'intent'; label: string; intent: AssistantIntent; parameters?: Record<string, unknown> }

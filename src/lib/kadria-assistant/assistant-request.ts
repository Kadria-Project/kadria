import type { AssistantPageContext } from './page-context'
import type { AssistantIntent } from './assistant-intents'

export type AssistantIntentParameters = Record<string, unknown>

export type AssistantRequest =
  | { kind: 'message'; message: string; context: AssistantPageContext }
  | { kind: 'intent'; intent: AssistantIntent; context: AssistantPageContext; parameters?: AssistantIntentParameters }

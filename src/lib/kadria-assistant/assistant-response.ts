import type { AssistantIntent } from './assistant-intents'
import type { AssistantUiAction } from './assistant-action-contract'

export type AssistantEvidenceLevel = 'solid' | 'moderate' | 'limited'
export type AssistantDetailSeverity = 'neutral' | 'attention' | 'urgent'

export interface AssistantResponseDetail {
  id: string
  label: string
  value?: string
  meta?: string
  severity?: AssistantDetailSeverity
}

export interface AssistantResponse {
  intent?: AssistantIntent
  title?: string
  summary: string
  details?: AssistantResponseDetail[]
  actions?: AssistantUiAction[]
  evidence?: { level: AssistantEvidenceLevel; note?: string }
  followUp?: string
}

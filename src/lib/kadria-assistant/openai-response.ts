import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import type { AssistantResponse } from './assistant-response'

const NO_HTML_OR_URL = /<[^>]*>|https?:\/\/|www\.|\/(?:[a-z0-9_-]+\/?)+/i

function plainText(maximum: number) {
  return z.string().trim().min(1).max(maximum).refine((value) => !NO_HTML_OR_URL.test(value), 'HTML and URLs are not allowed')
}

const detailSchema = z.object({
  id: z.string().trim().regex(/^[a-z][a-z0-9_-]{0,39}$/),
  label: plainText(80),
  value: plainText(300).nullable(),
  severity: z.enum(['neutral', 'attention', 'urgent']).nullable(),
}).strict()

const evidenceSchema = z.object({
  level: z.enum(['solid', 'moderate', 'limited']),
  note: plainText(300).nullable(),
}).strict()

export const AssistantOpenAiResponseSchema = z.object({
  title: plainText(80).nullable(),
  summary: plainText(800),
  details: z.array(detailSchema).max(5).nullable(),
  evidence: evidenceSchema.nullable(),
  followUp: plainText(200).nullable(),
}).strict()

export type AssistantOpenAiResponse = z.infer<typeof AssistantOpenAiResponseSchema>

export const assistantOpenAiResponseFormat = zodResponseFormat(AssistantOpenAiResponseSchema, 'kadria_assistant_response', {
  description: 'A concise, safe conversational response for the Kadria assistant.',
})

export function toAssistantResponse(value: AssistantOpenAiResponse): AssistantResponse {
  return {
    ...(value.title ? { title: value.title } : {}),
    summary: value.summary,
    ...(value.details?.length ? { details: value.details.map((detail) => ({ id: detail.id, label: detail.label, ...(detail.value ? { value: detail.value } : {}), ...(detail.severity ? { severity: detail.severity } : {}) })) } : {}),
    ...(value.evidence ? { evidence: { level: 'limited', ...(value.evidence.note ? { note: value.evidence.note } : {}) } } : {}),
    ...(value.followUp ? { followUp: value.followUp } : {}),
    actions: [],
    suggestions: [],
  }
}

export function unavailableAssistantResponse(): AssistantResponse {
  return {
    title: 'Réponse indisponible',
    summary: 'Kadria n’a pas pu formuler la réponse pour le moment.',
    actions: [],
    suggestions: [],
    followUp: 'Vous pouvez reformuler ou réessayer dans quelques instants.',
  }
}

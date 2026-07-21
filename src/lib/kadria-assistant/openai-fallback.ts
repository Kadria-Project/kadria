import type OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { AssistantOpenAiResponseSchema, assistantOpenAiResponseFormat, toAssistantResponse } from './openai-response'
import type { AssistantResponse } from './assistant-response'

const OPENAI_TIMEOUT_MS = 10_000
const OPENAI_MAX_ATTEMPTS = 2

export type OpenAiFallbackFailure = 'empty' | 'refusal' | 'validation' | 'timeout' | 'rate_limit' | 'network' | 'provider'

export type OpenAiFallbackResult =
  | { kind: 'success'; response: AssistantResponse; attempts: number }
  | { kind: OpenAiFallbackFailure; attempts: number }

function failureKind(error: unknown): OpenAiFallbackFailure {
  if (error instanceof Error && /json|schema|validation|zod/i.test(error.message)) return 'validation'
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (status === 429) return 'rate_limit'
    if (typeof status === 'number') return 'provider'
  }
  if (error instanceof Error && /timeout/i.test(error.message)) return 'timeout'
  if (error instanceof Error && /connection|network|fetch/i.test(error.message)) return 'network'
  return 'provider'
}

function isTransient(kind: OpenAiFallbackFailure, error: unknown) {
  if (kind === 'timeout' || kind === 'rate_limit' || kind === 'network') return true
  if (kind !== 'provider' || !error || typeof error !== 'object' || !('status' in error)) return false
  const status = (error as { status?: unknown }).status
  return status === 408 || (typeof status === 'number' && status >= 500)
}

export async function requestOpenAiFallback(
  client: OpenAI,
  params: { model: string; systemPrompt: string; messages: ChatCompletionMessageParam[] },
): Promise<OpenAiFallbackResult> {
  for (let attempts = 1; attempts <= OPENAI_MAX_ATTEMPTS; attempts += 1) {
    try {
      const completion = await client.chat.completions.parse({
        model: params.model,
        max_tokens: 700,
        temperature: 0.4,
        messages: [{ role: 'system', content: params.systemPrompt }, ...params.messages],
        response_format: assistantOpenAiResponseFormat,
      }, { timeout: OPENAI_TIMEOUT_MS })
      const message = completion.choices[0]?.message
      if (message?.refusal) return { kind: 'refusal', attempts }
      if (!message?.parsed) return { kind: 'empty', attempts }

      const validation = AssistantOpenAiResponseSchema.safeParse(message.parsed)
      if (!validation.success) return { kind: 'validation', attempts }

      return { kind: 'success', response: toAssistantResponse(validation.data), attempts }
    } catch (error) {
      const kind = failureKind(error)
      if (isTransient(kind, error) && attempts < OPENAI_MAX_ATTEMPTS) continue
      return { kind, attempts }
    }
  }

  return { kind: 'provider', attempts: OPENAI_MAX_ATTEMPTS }
}

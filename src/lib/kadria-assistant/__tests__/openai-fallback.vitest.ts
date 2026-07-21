import type OpenAI from 'openai'
import { describe, expect, it } from 'vitest'
import { requestOpenAiFallback } from '../openai-fallback'

function mockClient(...results: Array<unknown | Error>) {
  const parse = async () => {
    const result = results.shift()
    if (result instanceof Error) throw result
    return result
  }
  return { client: { chat: { completions: { parse } } } as unknown as OpenAI, parse }
}

const params = {
  model: 'gpt-4o-mini',
  systemPrompt: 'Prompt',
  messages: [{ role: 'user' as const, content: 'Question générale' }],
}

describe('requestOpenAiFallback', () => {
  it('assembles a validated structured response without actions or suggestions', async () => {
    const { client } = mockClient({ choices: [{ message: { parsed: { title: null, summary: 'Conseil prudent.', details: null, evidence: null, followUp: null }, refusal: null } }] })
    const result = await requestOpenAiFallback(client, params)
    expect(result).toMatchObject({ kind: 'success', attempts: 1, response: { summary: 'Conseil prudent.', actions: [], suggestions: [] } })
  })

  it('handles empty and refused model responses without retrying', async () => {
    const empty = mockClient({ choices: [{ message: { parsed: null, refusal: null } }] })
    await expect(requestOpenAiFallback(empty.client, params)).resolves.toMatchObject({ kind: 'empty', attempts: 1 })

    const refused = mockClient({ choices: [{ message: { parsed: null, refusal: 'Refus' } }] })
    await expect(requestOpenAiFallback(refused.client, params)).resolves.toMatchObject({ kind: 'refusal', attempts: 1 })
  })

  it('rejects invalid parsed output without retrying', async () => {
    const invalid = mockClient({ choices: [{ message: { parsed: { title: null, summary: 'OK', details: null, evidence: null, followUp: null, actions: [] }, refusal: null } }] })
    await expect(requestOpenAiFallback(invalid.client, params)).resolves.toMatchObject({ kind: 'validation', attempts: 1 })
  })

  it('does not retry a schema failure or a non-transient provider error', async () => {
    const schema = mockClient(new Error('schema validation failed'))
    await expect(requestOpenAiFallback(schema.client, params)).resolves.toMatchObject({ kind: 'validation', attempts: 1 })

    const badRequest = mockClient(Object.assign(new Error('bad request'), { status: 400 }))
    await expect(requestOpenAiFallback(badRequest.client, params)).resolves.toMatchObject({ kind: 'provider', attempts: 1 })
  })

  it('retries a transient rate limit once', async () => {
    const rateLimit = Object.assign(new Error('rate limited'), { status: 429 })
    const retry = mockClient(rateLimit, { choices: [{ message: { parsed: { title: null, summary: 'Réponse après retry.', details: null, evidence: null, followUp: null }, refusal: null } }] })
    await expect(requestOpenAiFallback(retry.client, params)).resolves.toMatchObject({ kind: 'success', attempts: 2 })
  })
})

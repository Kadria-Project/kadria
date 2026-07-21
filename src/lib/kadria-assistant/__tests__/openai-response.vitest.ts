import { describe, expect, it } from 'vitest'
import { AssistantOpenAiResponseSchema, toAssistantResponse } from '../openai-response'

describe('AssistantOpenAiResponseSchema', () => {
  it('accepts minimal and complete valid responses', () => {
    expect(AssistantOpenAiResponseSchema.safeParse({ title: null, summary: 'Conseil prudent.', details: null, evidence: null, followUp: null }).success).toBe(true)
    const complete = AssistantOpenAiResponseSchema.parse({
      title: 'Conseil commercial',
      summary: 'Présentez le résultat attendu avant le prix.',
      details: [{ id: 'structure', label: 'Structure', value: 'Besoin puis solution.', severity: 'neutral' }],
      evidence: { level: 'limited', note: 'Conseil général.' },
      followUp: 'Je peux vous aider à reformuler un message.',
    })
    expect(toAssistantResponse(complete)).toMatchObject({ actions: [], suggestions: [], details: [{ id: 'structure' }], evidence: { level: 'limited' } })
  })

  it('rejects invalid, injected and unbounded values', () => {
    const base = { title: null, summary: 'OK', details: null, evidence: null, followUp: null }
    const invalid = [
      {},
      { ...base, summary: '   ' },
      { ...base, unexpected: true },
      { ...base, details: [{ id: 'point', label: 'Point', value: null, severity: 'high' }] },
      { ...base, details: Array.from({ length: 6 }, (_, index) => ({ id: `point-${index}`, label: 'Point', value: null, severity: null })) },
      { ...base, summary: 'x'.repeat(801) },
      { ...base, evidence: { level: 'high', note: null } },
      { ...base, actions: [] },
      { ...base, suggestions: [] },
      { ...base, summary: 'Voir https://example.com' },
      null,
    ]
    for (const value of invalid) expect(AssistantOpenAiResponseSchema.safeParse(value).success).toBe(false)
  })
})

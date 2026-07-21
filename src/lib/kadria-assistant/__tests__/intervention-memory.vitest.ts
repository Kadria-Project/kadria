import { describe, expect, it } from 'vitest'
import { buildQuoteInterventionMemory } from '../intervention-memory'

const loop = { lifecycle: 'viewed' as const, explanation: '', expectedObservation: '' }
describe('intervention memory', () => {
  it('keeps one stable intervention across viewed and executed cycles', () => {
    const base = { interventionId: 'quote_followup:p1', projectId: 'p1', lifecycle: 'viewed' as const, loop, quoteSentAt: '2026-07-01T00:00:00.000Z', viewedAt: '2026-07-10T00:00:00.000Z' }
    expect(buildQuoteInterventionMemory(base).memory.interventionId).toBe(buildQuoteInterventionMemory({ ...base, lifecycle: 'executed', loop: { ...loop, lifecycle: 'executed' }, lastFollowUpAt: '2026-07-11T00:00:00.000Z' }).memory.interventionId)
  })
  it('summarizes repeated follow-ups without retaining UI history', () => {
    const result = buildQuoteInterventionMemory({ interventionId: 'quote_followup:p1', projectId: 'p1', lifecycle: 'inconclusive', loop: { lifecycle: 'inconclusive', explanation: '', expectedObservation: '' }, followUpCount: 3 })
    expect(result.continuity?.label).toBe('Recommandation réévaluée')
    expect(JSON.stringify(result.memory)).not.toMatch(/client|email|name/i)
  })
})

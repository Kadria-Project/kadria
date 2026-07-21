import { describe, expect, it } from 'vitest'
import { describeQuoteRecommendation } from '../recommendation-lifecycle'

const dueState = { canFollowUp: true, shouldAutoFollowUp: true, stage: 'j5_opened_no_decision' as const, reason: 'Devis ouvert depuis plus de 5 jours sans décision.' }

describe('recommendation lifecycle', () => {
  it('keeps a recommendation proposed until an execution proof exists', () => {
    expect(describeQuoteRecommendation({ state: dueState, hasClientEmail: true })).toMatchObject({
      lifecycle: 'proposed',
      expectedObservation: expect.stringMatching(/confirmation d'envoi/i),
    })
  })

  it('reframes an impossible follow-up as a missing contact detail', () => {
    expect(describeQuoteRecommendation({ state: dueState, hasClientEmail: false })).toMatchObject({
      lifecycle: 'blocked',
      explanation: expect.stringMatching(/e-mail client manque/i),
    })
  })

  it('observes a recorded follow-up rather than repeating it', () => {
    const recent = new Date('2026-07-21T09:00:00.000Z').toISOString()
    expect(describeQuoteRecommendation({
      state: { canFollowUp: true, shouldAutoFollowUp: false, stage: 'none', reason: 'Relance finale prévue.' },
      hasClientEmail: true,
      lastFollowUpAt: recent,
    }, new Date('2026-07-21T12:00:00.000Z'))).toMatchObject({
      lifecycle: 'observed',
      executionEvidence: expect.stringMatching(/enregistrée/i),
    })
  })

  it('does not invent a lifecycle when neither action nor evidence is available', () => {
    expect(describeQuoteRecommendation({
      state: { canFollowUp: false, shouldAutoFollowUp: false, stage: 'completed', reason: 'Devis accepté.' },
      hasClientEmail: true,
    })).toBeNull()
  })
})

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

  it('reframes an impossible follow-up as inconclusive missing contact data', () => {
    expect(describeQuoteRecommendation({ state: dueState, hasClientEmail: false })).toMatchObject({
      lifecycle: 'inconclusive',
      explanation: expect.stringMatching(/e-mail client manque/i),
    })
  })

  it('starts an observation period after a recorded follow-up', () => {
    const recent = new Date('2026-07-21T09:00:00.000Z').toISOString()
    expect(describeQuoteRecommendation({
      state: { canFollowUp: true, shouldAutoFollowUp: false, stage: 'none', reason: 'Relance finale prévue.' },
      hasClientEmail: true,
      lastFollowUpAt: recent,
    }, new Date('2026-07-21T12:00:00.000Z'))).toMatchObject({
      lifecycle: 'executed',
      executionEvidence: expect.stringMatching(/enregistrée/i),
    })
  })

  it('resolves the recommendation when the quote is accepted after a follow-up', () => {
    expect(describeQuoteRecommendation({
      state: { canFollowUp: false, shouldAutoFollowUp: false, stage: 'completed', reason: 'Devis accepté.' },
      hasClientEmail: true,
    })).toMatchObject({ lifecycle: 'resolved' })
  })

  it('resolves the recommendation when the quote is refused after a follow-up', () => {
    expect(describeQuoteRecommendation({
      state: { canFollowUp: false, shouldAutoFollowUp: false, stage: 'completed', reason: 'Devis refusé.' },
      hasClientEmail: true,
      followUpCount: 1,
    })).toMatchObject({ lifecycle: 'resolved' })
  })

  it('requires a new decision after the observation period only when the follow-up is due', () => {
    expect(describeQuoteRecommendation({
      state: dueState,
      hasClientEmail: true,
      lastFollowUpAt: '2026-07-15T09:00:00.000Z',
      followUpCount: 1,
    }, new Date('2026-07-21T12:00:00.000Z'))).toMatchObject({ lifecycle: 'follow_up_required' })
  })

  it('does not repeat follow-ups indefinitely after the existing maximum', () => {
    expect(describeQuoteRecommendation({
      state: { canFollowUp: false, shouldAutoFollowUp: false, stage: 'completed', reason: 'Toutes les relances prévues ont été envoyées.' },
      hasClientEmail: true,
      followUpCount: 3,
    })).toMatchObject({ lifecycle: 'inconclusive', uncertainty: expect.stringMatching(/silence/i) })
  })
})

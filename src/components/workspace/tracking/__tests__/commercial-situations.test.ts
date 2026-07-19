import assert from 'node:assert/strict'
import { register } from 'node:module'
import test from 'node:test'

register('../../__tests__/typescript-resolution.loader.mjs', import.meta.url)

const { deduplicateCommercialSituations, deriveCommercialCalmState, deriveCommercialSituations, prioritizeCommercialSituations } = (await import('../commercial-situations')) as typeof import('../commercial-situations')

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: 'project-1', status: 'Devis envoyé', leadStatus: 'active', clientFirstName: 'Camille', clientName: 'Dupont', projectType: 'Rénovation',
    quoteSentAt: '2026-07-08T10:00:00.000Z', acceptedAt: null, devisAmount: 11400, budget: '', completenessScore: 100,
    updatedAt: '2026-07-08T10:00:00.000Z', createdAt: '2026-07-01T10:00:00.000Z', lastFollowUpAt: null,
    ...overrides,
  } as never
}

function center(recommendations: unknown[] = [], complete = true) {
  return { recommendations, dataQuality: { isComplete: complete, unavailableSources: complete ? [] : ['devis'] } } as never
}

test('turns a sent quote into a cautious commercial situation with a sourced amount', () => {
  const [situation] = deriveCommercialSituations([project()], center())
  assert.equal(situation.kind, 'follow_quote')
  assert.match(situation.observedFacts[0], /depuis/)
  assert.match(situation.understanding, /semble indiquer/)
  assert.equal(situation.amount?.origin, 'quote')
  assert.equal(situation.primaryAction?.label, 'Préparer la relance')
})

test('does not turn repeated quote openings into a purchase certainty', () => {
  const [situation] = deriveCommercialSituations([project({ quoteSentAt: null, opensCount: 3 })], center())
  assert.equal(situation.kind, 'prepare_quote')
  const [openedQuote] = deriveCommercialSituations([project({ opensCount: 3, quoteSentAt: '2026-07-18T10:00:00.000Z' })], center())
  assert.equal(openedQuote.kind, 'confirm_interest')
  assert.match(openedQuote.understanding, /ne permet pas de conclure/)
})

test('deduplicates several commercial signals for one project before global prioritisation', () => {
  const situations = deriveCommercialSituations([project()], center())
  const duplicated = [...situations, { ...situations[0], id: 'older-signal', priorityScore: situations[0].priorityScore - 10 }]
  assert.equal(deduplicateCommercialSituations(duplicated).length, 1)
  assert.equal(prioritizeCommercialSituations(deduplicateCommercialSituations(duplicated)).length, 1)
})

test('prioritises a credible commercial consequence over a technical source order', () => {
  const situations = deriveCommercialSituations([
    project({ id: 'quote', quoteSentAt: '2026-07-01T10:00:00.000Z', devisAmount: 12000 }),
    project({ id: 'incomplete', quoteSentAt: null, devisAmount: 0, budget: '2 000 €', completenessScore: 30, status: 'Qualifié' }),
  ], center())
  assert.equal(prioritizeCommercialSituations(deduplicateCommercialSituations(situations))[0].projectId, 'quote')
})

test('never declares the commercial workspace calm while loading, failing or incomplete', () => {
  assert.equal(deriveCommercialCalmState('loading', null, []).kind, 'loading')
  assert.equal(deriveCommercialCalmState('error', null, []).kind, 'insufficient')
  assert.equal(deriveCommercialCalmState('ready', center([], false), []).kind, 'insufficient')
  assert.equal(deriveCommercialCalmState('ready', center(), []).kind, 'calm')
})

test('removes won and lost projects from active commercial decisions', () => {
  assert.equal(deriveCommercialSituations([project({ status: 'Gagné' }), project({ id: 'lost', status: 'Perdu' })], center()).length, 0)
})

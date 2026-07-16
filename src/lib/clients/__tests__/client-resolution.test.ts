import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import type { ClientResolutionRecord } from '../client-resolution-types'

register('./typescript-resolution.loader.mjs', import.meta.url)

const normalization = await import('../client-normalization')
const engine = await import('../client-resolution-engine')
const { normalizeClientEmail, normalizeClientPhone, prepareClientResolutionInput } = normalization
const { resolveClientCandidates } = engine

const tenantId = 'tenant-a'

function input(overrides: Partial<Parameters<typeof prepareClientResolutionInput>[0]> = {}) {
  return prepareClientResolutionInput({
    tenantId,
    firstName: 'Claire',
    lastName: 'Dupont',
    city: 'Lyon',
    countryCode: 'FR',
    createdFrom: 'test',
    ...overrides,
  })
}

function client(overrides: Partial<ClientResolutionRecord> = {}): ClientResolutionRecord {
  return {
    id: 'client-a',
    tenantId,
    firstName: 'Claire',
    lastName: 'Dupont',
    companyName: null,
    email: 'claire@example.test',
    normalizedEmail: 'claire@example.test',
    phone: '06 12 34 56 78',
    normalizedPhone: '+33612345678',
    postalCode: '69001',
    city: 'Lyon',
    countryCode: 'FR',
    status: 'prospect',
    archivedAt: null,
    mergedIntoClientId: null,
    ...overrides,
  }
}

test('normalizes emails without changing aliases', () => {
  assert.deepEqual(normalizeClientEmail(' Claire+devis@Example.Test '), {
    raw: 'Claire+devis@Example.Test',
    normalized: 'claire+devis@example.test',
    valid: true,
  })
  assert.equal(normalizeClientEmail('not-an-email').normalized, null)
})

test('normalizes common French mobile formats', () => {
  for (const value of ['06 12 34 56 78', '0612345678', '+33 6 12 34 56 78', '0033 6 12 34 56 78']) {
    assert.equal(normalizeClientPhone(value, 'FR').normalized, '+33612345678')
  }
  assert.equal(normalizeClientPhone('+44 20 7946 0018', 'GB').normalized, '+442079460018')
  assert.equal(normalizeClientPhone('123', 'FR').normalized, null)
})

test('email and coherent name resolve to an exact dry-run match', () => {
  const result = resolveClientCandidates(input({ email: 'CLAIRE@example.test' }), [client()])
  assert.equal(result.outcome, 'exact_match')
  assert.equal(result.dryRun, true)
})

test('phone and coherent name resolve to an exact dry-run match', () => {
  const result = resolveClientCandidates(input({ phone: '06 12 34 56 78' }), [client()])
  assert.equal(result.outcome, 'exact_match')
})

test('matching email and phone resolve to an exact match without a name comparison', () => {
  const result = resolveClientCandidates(
    input({ firstName: null, lastName: null, companyName: 'Entreprise', email: 'claire@example.test', phone: '0612345678' }),
    [client({ companyName: null })],
  )
  assert.equal(result.outcome, 'exact_match')
})

test('a shared email remains ambiguous', () => {
  const result = resolveClientCandidates(input({ email: 'claire@example.test' }), [client(), client({ id: 'client-b', lastName: 'Martin' })])
  assert.equal(result.outcome, 'ambiguous_match')
  assert.ok(result.reasons.includes('SHARED_EMAIL'))
})

test('a shared phone remains ambiguous', () => {
  const result = resolveClientCandidates(input({ phone: '0612345678' }), [client(), client({ id: 'client-b', lastName: 'Martin' })])
  assert.equal(result.outcome, 'ambiguous_match')
  assert.ok(result.reasons.includes('SHARED_PHONE'))
})

test('email and phone mapping to separate clients are never selected automatically', () => {
  const result = resolveClientCandidates(input({ email: 'a@example.test', phone: '0612345678' }), [
    client({ id: 'client-a', normalizedEmail: 'a@example.test', normalizedPhone: '+33600000000' }),
    client({ id: 'client-b', normalizedEmail: 'b@example.test', normalizedPhone: '+33612345678' }),
  ])
  assert.equal(result.outcome, 'ambiguous_match')
  assert.ok(result.reasons.includes('CROSS_IDENTIFIER_CONFLICT'))
})

test('name and city alone are never an exact match', () => {
  const result = resolveClientCandidates(input(), [client({ email: null, normalizedEmail: null, phone: null, normalizedPhone: null })])
  assert.equal(result.outcome, 'ambiguous_match')
  assert.equal(result.confidence, 'low')
})

test('no candidate simulates a proposed client without persistence', () => {
  const result = resolveClientCandidates(input({ email: 'new@example.test' }), [])
  assert.equal(result.outcome, 'no_match')
  assert.equal(result.proposedClient.status, 'prospect')
  assert.equal(result.dryRun, true)
})

test('missing identity returns insufficient_identity even with a phone number', () => {
  const result = resolveClientCandidates(input({ firstName: null, lastName: null, companyName: null, phone: '0612345678' }), [client()])
  assert.equal(result.outcome, 'insufficient_identity')
})

test('archived, merged, and other-tenant candidates are ignored', () => {
  const result = resolveClientCandidates(input({ email: 'claire@example.test' }), [
    client({ archivedAt: '2026-01-01T00:00:00Z' }),
    client({ id: 'client-b', mergedIntoClientId: 'client-a' }),
    client({ id: 'client-c', tenantId: 'tenant-b' }),
  ])
  assert.equal(result.outcome, 'no_match')
})

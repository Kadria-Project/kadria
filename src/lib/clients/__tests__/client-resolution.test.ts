import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import type { ClientResolutionRecord } from '../client-resolution-types'

register('./typescript-resolution.loader.mjs', import.meta.url)

const normalization = await import('../client-normalization')
const engine = await import('../client-resolution-engine')
const legacy = await import('../legacy-project-client')
const { normalizeClientEmail, normalizeClientPhone, prepareClientResolutionInput } = normalization
const { resolveClientCandidates } = engine
const { clusterLegacyProjects, mapLegacyProjectClientIdentity } = legacy

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

function legacyProject(overrides: Partial<Parameters<typeof mapLegacyProjectClientIdentity>[0]> = {}) {
  return {
    id: 'project-a',
    tenantId,
    clientId: null,
    clientFirstName: 'Claire',
    clientName: 'Dupont',
    clientEmail: 'claire@example.test',
    clientPhone: '06 12 34 56 78',
    city: 'Lyon',
    postalCode: '69001',
    source: 'site-web',
    createdAt: '2026-07-01T08:00:00.000Z',
    status: 'new',
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

test('maps the available source as acquisition and creation source', () => {
  const mapped = mapLegacyProjectClientIdentity(legacyProject())
  assert.ok(mapped)
  assert.equal(mapped.input.acquisitionSource, 'site-web')
  assert.equal(mapped.input.createdFrom, 'site-web')
  assert.equal(mapped.input.firstName, 'Claire')
  assert.equal(mapped.input.lastName, 'Dupont')
  assert.equal(mapped.input.addressLine1, null)
})

test('uses a safe legacy fallback when the optional source is absent', () => {
  const mapped = mapLegacyProjectClientIdentity(legacyProject({ source: null }))
  assert.ok(mapped)
  assert.equal(mapped.input.acquisitionSource, null)
  assert.equal(mapped.input.createdFrom, 'legacy-project')
})

function clusterInput(id: string, overrides: Partial<Parameters<typeof mapLegacyProjectClientIdentity>[0]> = {}) {
  const mapped = mapLegacyProjectClientIdentity(legacyProject({ id, ...overrides }))
  assert.ok(mapped)
  return mapped
}

test('keeps eleven isolated projects as eleven simulated clients', () => {
  const result = clusterLegacyProjects(Array.from({ length: 11 }, (_, index) => clusterInput(`project-${index}`, {
    clientEmail: `client-${index}@example.test`, clientPhone: `06123456${String(index).padStart(2, '0')}`,
  })))
  assert.equal(result.summary.isolatedProjects, 11)
  assert.equal(result.summary.clientsCertainToCreate, 11)
  assert.equal(result.summary.estimatedClientsMax, 11)
})

test('clusters coherent shared contacts exactly once', () => {
  const sameClient = [
    clusterInput('a', { clientEmail: 'claire@example.test' }),
    clusterInput('b', { clientEmail: 'claire@example.test', clientPhone: '0612345679' }),
    clusterInput('c', { clientEmail: 'claire@example.test', clientPhone: '0612345680' }),
  ]
  const result = clusterLegacyProjects(sameClient)
  assert.equal(result.summary.certainClusters, 1)
  assert.equal(result.summary.projectsInCertainClusters, 3)
  assert.equal(result.summary.clientsCertainToCreate, 1)
  assert.equal(result.summary.estimatedClientsMin, 1)
  assert.equal(result.summary.estimatedClientsMax, 1)
})

test('combines two certain groups and four isolated projects without double counting', () => {
  const inputs = [
    clusterInput('a1', { clientEmail: 'a@example.test', clientPhone: '0611111111' }), clusterInput('a2', { clientEmail: 'a@example.test', clientPhone: '0611111112' }), clusterInput('a3', { clientEmail: 'a@example.test', clientPhone: '0611111113' }),
    clusterInput('b1', { clientEmail: 'b@example.test', clientPhone: '0622222221' }), clusterInput('b2', { clientEmail: 'b@example.test', clientPhone: '0622222222' }), clusterInput('b3', { clientEmail: 'b@example.test', clientPhone: '0622222223' }),
    ...Array.from({ length: 4 }, (_, index) => clusterInput(`i${index}`, { clientEmail: `isolated-${index}@example.test`, clientPhone: `06222222${String(index).padStart(2, '0')}` })),
  ]
  const result = clusterLegacyProjects(inputs)
  assert.equal(result.summary.certainClusters, 2)
  assert.equal(result.summary.isolatedProjects, 4)
  assert.equal(result.summary.clientsCertainToCreate, 6)
  assert.equal(result.summary.estimatedClientsMax, 6)
})

test('keeps conflicting shared identifiers in one ambiguous group', () => {
  const byEmail = clusterLegacyProjects([
    clusterInput('email-a', { clientEmail: 'shared@example.test' }),
    clusterInput('email-b', { clientFirstName: 'Marc', clientName: 'Martin', clientEmail: 'shared@example.test' }),
  ])
  const byPhone = clusterLegacyProjects([
    clusterInput('phone-a', { clientPhone: '0611111111' }),
    clusterInput('phone-b', { clientFirstName: 'Marc', clientName: 'Martin', clientPhone: '0611111111' }),
  ])
  assert.equal(byEmail.summary.ambiguousClusters, 1)
  assert.equal(byPhone.summary.ambiguousClusters, 1)
  assert.equal(byEmail.summary.estimatedClientsMin, 1)
  assert.equal(byEmail.summary.estimatedClientsMax, 2)
})

test('separates linked and insufficient projects from clustering estimates', () => {
  const result = clusterLegacyProjects([
    clusterInput('linked', { clientId: 'client-existing' }),
    clusterInput('insufficient', { clientFirstName: null, clientName: null, clientEmail: null, clientPhone: null }),
    clusterInput('isolated', { clientEmail: 'isolated@example.test' }),
  ])
  assert.equal(result.summary.excludedLinkedProjects, 1)
  assert.equal(result.summary.insufficientProjects, 1)
  assert.equal(result.summary.isolatedProjects, 1)
  assert.equal(result.summary.projectsConsidered, 2)
  assert.ok(result.summary.estimatedClientsMin <= result.summary.estimatedClientsMax)
  assert.ok(result.summary.estimatedClientsMax <= result.summary.projectsConsidered)
})

test('rejects duplicate project ids instead of producing overlapping groups', () => {
  assert.throws(() => clusterLegacyProjects([clusterInput('duplicate'), clusterInput('duplicate')]), /duplicate project/)
})

test('does not merge matching contacts across tenants', () => {
  const result = clusterLegacyProjects([
    clusterInput('tenant-a-project', { clientEmail: 'shared@example.test' }),
    clusterInput('tenant-b-project', { tenantId: 'tenant-b', clientEmail: 'shared@example.test' }),
  ])
  assert.equal(result.summary.certainClusters, 0)
  assert.equal(result.summary.isolatedProjects, 2)
})

test('partitions every considered project into exactly one final category', () => {
  const result = clusterLegacyProjects([
    clusterInput('certain-a', { clientEmail: 'certain@example.test' }),
    clusterInput('certain-b', { clientEmail: 'certain@example.test' }),
    clusterInput('ambiguous-a', { clientEmail: 'ambiguous@example.test' }),
    clusterInput('ambiguous-b', { clientFirstName: 'Marc', clientName: 'Martin', clientEmail: 'ambiguous@example.test' }),
    clusterInput('isolated', { clientEmail: 'isolated@example.test' }),
    clusterInput('insufficient', { clientFirstName: null, clientName: null, clientEmail: null, clientPhone: null }),
  ])
  const ids = [
    ...result.certainClusters.flatMap((group: { projectIds: string[] }) => group.projectIds),
    ...result.ambiguousClusters.flatMap((group: { projectIds: string[] }) => group.projectIds),
    ...result.isolatedProjects,
    ...result.insufficientProjects,
  ]
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids.length, result.summary.projectsConsidered)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

register('./typescript-resolution.loader.mjs', import.meta.url)
const { aggregateClientList, filterClientList, sortAndPaginateClientList } = await import('../client-list-aggregation') as typeof import('../client-list-aggregation')

const now = new Date('2026-07-17T12:00:00.000Z')
const input = {
  clients: [{ id: 'c1', first_name: 'Alice', last_name: 'Martin', email: 'alice@example.test', phone: '+33612345678', status: 'prospect' }],
  projects: [{ id: 'p1', client_id: 'c1', project_title: 'Cuisine', status: 'Nouveau', created_at: '2026-07-01' }, { id: 'p2', client_id: 'c1', project_title: 'Salle de bain', status: 'Gagné', created_at: '2026-07-10' }],
  quotes: [{ project_id: 'p1', total_ttc: 1200, statut: 'Envoyé' }, { project_id: 'p2', total_ttc: 800, accepted: true }],
  appointments: [{ id: 'a1', project_id: 'p1', title: 'Visite', start_time: '2026-07-18T09:00:00Z', confirmation_status: 'pending', assigned_user_id: 'u1' }],
  activities: [{ project_id: 'p1', created_at: '2026-07-12T10:00:00Z' }], events: [{ project_id: 'p1', created_at: '2026-07-15T10:00:00Z' }], now,
}

test('aggregates canonical projects, quotes and appointments', () => {
  const item = aggregateClientList(input)[0]
  assert.equal(item.projectCount, 2); assert.equal(item.activeProjectCount, 1); assert.equal(item.wonProjectCount, 1)
  assert.equal(item.quoteCount, 2); assert.equal(item.acceptedQuoteCount, 1); assert.equal(item.pendingQuoteCount, 1); assert.equal(item.acceptedAmount, 800)
  assert.equal(item.nextAppointment?.id, 'a1'); assert.equal(item.lastInteractionLabel, 'Message client')
})

test('keeps legacy entries distinct and flags strong email duplicates', () => {
  const items = aggregateClientList({ ...input, projects: [...input.projects, { id: 'l1', client_id: null, client_name: 'Legacy', client_email: 'alice@example.test', created_at: '2026-07-16', status: 'Nouveau' }] })
  const legacy = items.find((item) => item.source === 'legacy')!
  assert.match(legacy.id, /^legacy:/); assert.equal(legacy.possibleCanonicalClientId, 'c1'); assert.equal(legacy.attentionReason, 'possible_duplicate')
})

test('filters normalized phones and paginates after filtering', () => {
  const items = aggregateClientList(input)
  assert.equal(filterClientList(items, { q: '06 12 34 56 78' }).length, 1)
  const result = sortAndPaginateClientList([{ ...items[0], id: 'b' }, { ...items[0], id: 'a' }], 2, 1)
  assert.equal(result.total, 2); assert.equal(result.items.length, 1); assert.equal(result.page, 2)
})

test('keeps a canonical client without a project and excludes cancelled appointments', () => {
  const items = aggregateClientList({
    ...input,
    clients: [...input.clients, { id: 'c2', first_name: 'Sophie', last_name: 'Sans projet', status: 'prospect' }],
    appointments: [
      ...input.appointments,
      { id: 'a2', project_id: 'p1', title: 'Annulé', start_time: '2026-07-17T13:00:00Z', confirmation_status: 'cancelled' },
    ],
  })
  assert.equal(items.find((item) => item.id === 'c2')?.projectCount, 0)
  assert.equal(items.find((item) => item.id === 'c1')?.nextAppointment?.id, 'a1')
})

test('aggregates quote amounts, prioritises client events and supports all filters', () => {
  const items = aggregateClientList({
    ...input,
    quotes: [
      { project_id: 'p1', total_ttc: 1200, statut: 'Envoyé', sent_at: '2026-06-01' },
      { project_id: 'p2', total_ht: 800, accepted_at: '2026-07-11' },
    ],
    projects: [...input.projects, { id: 'l2', client_id: null, client_name: 'Projet seul', city: 'Lyon', status: 'À rappeler', created_at: '2026-07-13' }],
  })
  const canonical = items.find((item) => item.id === 'c1')!
  const legacy = items.find((item) => item.source === 'legacy')!
  assert.equal(canonical.totalQuotedAmount, 2000)
  assert.equal(canonical.acceptedAmount, 800)
  assert.equal(canonical.lastInteractionLabel, 'Message client')
  assert.equal(filterClientList(items, { source: 'canonical' }).length, 1)
  assert.equal(filterClientList(items, { active: true }).length, 2)
  assert.equal(filterClientList(items, { hasAppointment: true }).length, 1)
  assert.equal(filterClientList(items, { attention: true }).some((item) => item.id === legacy.id), true)
})

test('groups legacy projects by name and city, searches projects and honours sort keys', () => {
  const items = aggregateClientList({
    ...input,
    clients: [],
    projects: [
      { id: 'l1', client_id: null, client_name: 'Michel', city: 'Lyon', project_title: 'Cuisine', status: 'Nouveau', created_at: '2026-07-10' },
      { id: 'l2', client_id: null, client_name: 'Michel', city: 'Lyon', project_title: 'Salle de bain', status: 'Gagné', created_at: '2026-07-11' },
    ],
    quotes: [], appointments: [], activities: [], events: [],
  })
  assert.equal(items.length, 1)
  assert.equal(items[0].projectCount, 2)
  assert.equal(filterClientList(items, { q: 'salle de bain' }).length, 1)
  const sorted = sortAndPaginateClientList([
    { ...items[0], id: 'a', displayName: 'Alpha', acceptedAmount: 1200 },
    { ...items[0], id: 'b', displayName: 'Bravo', acceptedAmount: 3000 },
  ], 1, 25, 'acceptedValue')
  assert.equal(sorted.items[0].id, 'b')
})

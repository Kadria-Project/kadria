import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

register('./typescript-resolution.loader.mjs', import.meta.url)
const { aggregateClientList, filterClientList } = await import('../client-list-aggregation') as typeof import('../client-list-aggregation')
const { deriveClientActions, summarizeClientActions, topClientActions } = await import('../clients-action-derive') as typeof import('../clients-action-derive')
const { CLIENT_ACTION_REASONS } = await import('../clients-action-types') as typeof import('../clients-action-types')

const now = new Date('2026-07-17T12:00:00.000Z')

function baseInput() {
  return {
    clients: [
      { id: 'michel', first_name: 'Michel', last_name: 'Bernard', email: 'michel@example.test', status: 'customer' },
      { id: 'thomas', first_name: 'Thomas', last_name: 'Martin', email: 'thomas@example.test', status: 'customer' },
      { id: 'claire', first_name: 'Claire', last_name: 'Dupont', email: 'claire@example.test', status: 'customer' },
      { id: 'noProject', first_name: 'Sans', last_name: 'Projet', email: 'sans@example.test', status: 'prospect' },
    ],
    projects: [
      { id: 'p-michel', client_id: 'michel', project_title: 'Toiture', status: 'En cours', created_at: '2026-06-01', updated_at: '2026-07-10' },
      { id: 'p-thomas', client_id: 'thomas', project_title: 'Cuisine', status: 'En cours', created_at: '2026-06-01', updated_at: '2026-07-10' },
      { id: 'p-claire', client_id: 'claire', project_title: 'Salle de bain', status: 'Devis envoyé', created_at: '2026-06-01', updated_at: '2026-06-01' },
      { id: 'legacy-1', client_id: null, client_name: 'Camille', client_first_name: 'Laurent', client_email: 'camille@example.test', created_at: '2026-07-01', status: 'Nouveau' },
    ],
    quotes: [
      { project_id: 'p-claire', total_ttc: 5000, statut: 'Envoyé', quote_sent_at: '2026-06-20T10:00:00Z' },
    ],
    appointments: [
      { id: 'a-michel', project_id: 'p-michel', title: 'Visite', start_time: '2026-07-19T09:00:00Z', confirmation_status: 'pending' },
      { id: 'a-thomas', project_id: 'p-thomas', title: 'Visite', start_time: '2026-07-20T09:00:00Z', confirmation_status: 'change_requested' },
    ],
    activities: [], events: [], now,
  }
}

test('attentionReason filter accepts each of the 8 documented values', () => {
  const items = aggregateClientList(baseInput())
  for (const reason of CLIENT_ACTION_REASONS) {
    const result = filterClientList(items, { attentionReason: reason })
    assert.ok(Array.isArray(result))
  }
})

test('attentionReason filter rejects values outside the item set (no match, no throw)', () => {
  const items = aggregateClientList(baseInput())
  const result = filterClientList(items, { attentionReason: 'not_a_real_reason' })
  assert.equal(result.length, 0)
})

test('attentionReason narrows correctly and composes with active + search', () => {
  const items = aggregateClientList(baseInput())
  const changeRequested = filterClientList(items, { attentionReason: 'appointment_change_requested' })
  assert.equal(changeRequested.length, 1)
  assert.equal(changeRequested[0].displayName, 'Thomas Martin')

  const withActive = filterClientList(items, { attentionReason: 'appointment_change_requested', active: true })
  assert.equal(withActive.length, 1)

  const withSearch = filterClientList(items, { attentionReason: 'appointment_change_requested', q: 'Michel' })
  assert.equal(withSearch.length, 0)
})

test('appointment_change_requested outranks appointment_awaiting_confirmation and quote_pending_too_long', () => {
  const items = aggregateClientList(baseInput())
  const actions = deriveClientActions(items, now)
  assert.equal(actions[0].reason, 'appointment_change_requested')
  assert.equal(actions[0].clientName, 'Thomas Martin')
  const reasons = actions.map((action) => action.reason)
  assert.ok(reasons.includes('appointment_awaiting_confirmation'))
  assert.ok(reasons.includes('quote_pending_too_long'))
})

test('legacy contact produces a legacy_unlinked action even without a canonical project', () => {
  const items = aggregateClientList(baseInput())
  const actions = deriveClientActions(items, now)
  const legacy = actions.find((action) => action.source === 'legacy')
  assert.ok(legacy)
  assert.equal(legacy?.reason, 'legacy_unlinked')
  assert.equal(legacy?.priority, 'low')
})

test('a canonical client without any project never gets an artificial action', () => {
  const items = aggregateClientList(baseInput())
  const actions = deriveClientActions(items, now)
  assert.ok(!actions.some((action) => action.clientId === 'noProject'))
})

test('no attention anywhere yields an empty action list and a zeroed summary', () => {
  const input = baseInput()
  const quietInput = { ...input, projects: input.projects.filter((p) => p.id !== 'legacy-1').map((p) => ({ ...p, updated_at: '2026-07-16' })), appointments: [], quotes: [] }
  const items = aggregateClientList(quietInput)
  const actions = deriveClientActions(items, now)
  const summary = summarizeClientActions(actions)
  assert.equal(actions.length, 0)
  assert.deepEqual(summary, { total: 0, callbacks: 0, quotesWaiting: 0, appointmentsToConfirm: 0, appointmentChanges: 0, contactsToReconcile: 0, staleProjects: 0, followUps: 0 })
})

test('topClientActions caps at 5 even with more actionable clients', () => {
  const input = baseInput()
  const manyClients = Array.from({ length: 8 }, (_, index) => ({ id: `c${index}`, first_name: 'Client', last_name: String(index), email: `c${index}@example.test`, status: 'customer' }))
  const manyProjects = manyClients.map((client, index) => ({ id: `p${index}`, client_id: client.id, project_title: 'Dossier', status: 'À rappeler', created_at: '2026-06-01', updated_at: '2026-06-01' }))
  const items = aggregateClientList({ ...input, clients: [...input.clients, ...manyClients], projects: [...input.projects, ...manyProjects] })
  const actions = deriveClientActions(items, now)
  assert.ok(actions.length > 5)
  const top = topClientActions(actions)
  assert.equal(top.length, 5)
})

test('summary counters reflect the full derived action set, not a page slice', () => {
  const items = aggregateClientList(baseInput())
  const actions = deriveClientActions(items, now)
  const summary = summarizeClientActions(actions)
  assert.equal(summary.total, actions.length)
  assert.equal(summary.appointmentChanges, actions.filter((a) => a.reason === 'appointment_change_requested').length)
  assert.equal(summary.quotesWaiting, actions.filter((a) => a.reason === 'quote_pending_too_long').length)
})

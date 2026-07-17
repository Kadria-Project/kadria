import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

register('./typescript-resolution.loader.mjs', import.meta.url)
const { buildClientTimeline } = await import('../client-timeline') as typeof import('../client-timeline')

const projectTitleById = new Map([['p1', 'Dossier A']])
const projectHrefById = (id: string) => `/dashboard-v2/projet/${id}`

test('buildClientTimeline: sorts most recent first', () => {
  const timeline = buildClientTimeline({
    projects: [{ id: 'p1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z', status: 'En cours' }],
    activities: [{ id: 'a1', project_id: 'p1', created_at: '2026-03-01T00:00:00Z', action: 'note' }],
    events: [],
    appointments: [],
    quotes: [],
    projectTitleById,
    projectHrefById,
  })
  const dates = timeline.map((e) => e.occurredAt)
  assert.deepEqual(dates, [...dates].sort().reverse())
})

test('buildClientTimeline: drops rows whose project is not in this client\'s set (orphan) without crashing', () => {
  const timeline = buildClientTimeline({
    projects: [],
    activities: [{ id: 'a1', project_id: 'orphan-project', created_at: '2026-01-01T00:00:00Z', action: 'note' }],
    events: [{ id: 'e1', project_id: 'orphan-project', created_at: '2026-01-01T00:00:00Z', event_type: 'message' }],
    appointments: [{ id: 'ap1', project_id: 'orphan-project', created_at: '2026-01-01T00:00:00Z' }],
    quotes: [{ id: 'q1', project_id: 'orphan-project', created_at: '2026-01-01T00:00:00Z' }],
    projectTitleById,
    projectHrefById,
  })
  assert.equal(timeline.length, 0)
})

test('buildClientTimeline: skips rows with an invalid/missing date instead of crashing', () => {
  let orphanCount = 0
  const timeline = buildClientTimeline({
    projects: [],
    activities: [{ id: 'a1', project_id: 'p1', created_at: 'not-a-date', action: 'note' }],
    events: [],
    appointments: [],
    quotes: [],
    projectTitleById,
    projectHrefById,
    onOrphan: () => { orphanCount += 1 },
  })
  assert.equal(timeline.length, 0)
  assert.equal(orphanCount, 1)
})

test('buildClientTimeline: deduplicates the same action recorded in multiple source tables', () => {
  const timeline = buildClientTimeline({
    projects: [],
    activities: [{ id: 'a1', project_id: 'p1', created_at: '2026-05-01T10:00:00Z', action: 'devis envoyé' }],
    events: [{ id: 'e1', project_id: 'p1', created_at: '2026-05-01T10:00:30Z', event_type: 'quote_sent' }],
    appointments: [],
    quotes: [{ id: 'q1', project_id: 'p1', quote_sent_at: '2026-05-01T10:00:00Z' }],
    projectTitleById,
    projectHrefById,
  })
  const sentEvents = timeline.filter((e) => e.title === 'Devis envoyé')
  assert.equal(sentEvents.length, 1)
})

test('buildClientTimeline: translates technical event types into human titles, never raw codes', () => {
  const timeline = buildClientTimeline({
    projects: [],
    activities: [],
    events: [{ id: 'e1', project_id: 'p1', created_at: '2026-05-01T10:00:00Z', event_type: 'appointment_change_requested' }],
    appointments: [],
    quotes: [],
    projectTitleById,
    projectHrefById,
  })
  assert.equal(timeline[0].title, 'Modification de rendez-vous demandée')
  assert.notEqual(timeline[0].title, 'appointment_change_requested')
})

test('buildClientTimeline: unknown event type falls back to a generic human label', () => {
  const timeline = buildClientTimeline({
    projects: [],
    activities: [],
    events: [{ id: 'e1', project_id: 'p1', created_at: '2026-05-01T10:00:00Z', event_type: 'totally_unknown_code_xyz' }],
    appointments: [],
    quotes: [],
    projectTitleById,
    projectHrefById,
  })
  assert.equal(timeline[0].title, 'Interaction client')
})

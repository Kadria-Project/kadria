import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

register('./typescript-resolution.loader.mjs', import.meta.url)
const {
  buildClientIdentity,
  buildClientProjects,
  buildClientQuotes,
  buildClientAppointments,
  buildClientSummary,
  buildCommercialSummary,
  deriveClientNextAction,
} = await import('../client-detail-aggregation') as typeof import('../client-detail-aggregation')

test('buildClientIdentity: particulier shows first+last name, no duplicate label', () => {
  const identity = buildClientIdentity({ id: 'c1', first_name: 'Michel', last_name: 'Bernard', email: null, phone: null, status: 'customer' }, 1)
  assert.equal(identity.displayName, 'Michel Bernard')
  assert.equal(identity.isCompany, false)
  assert.equal(identity.contactName, null)
})

test('buildClientIdentity: entreprise shows company as title, distinct contact subtitle', () => {
  const identity = buildClientIdentity({ id: 'c2', first_name: 'Sophie', last_name: 'Martin', company_name: 'SCI Horizon', status: 'customer' }, 3)
  assert.equal(identity.displayName, 'SCI Horizon')
  assert.equal(identity.isCompany, true)
  assert.equal(identity.contactName, 'Sophie Martin')
  assert.equal(identity.isRecurring, true)
})

test('buildClientIdentity: company name equal to itself never duplicated as contact', () => {
  const identity = buildClientIdentity({ id: 'c3', company_name: 'SCI Horizon', status: 'customer' }, 0)
  assert.equal(identity.contactName, null)
})

test('buildClientProjects: sorts active first, then most recent; computes accepted amount', () => {
  const projects = buildClientProjects(
    [
      { id: 'p1', project_title: 'Ancien', status: 'Gagné', created_at: '2026-01-01', updated_at: '2026-01-05' },
      { id: 'p2', project_title: 'Actif', status: 'En cours', created_at: '2026-05-01', updated_at: '2026-05-02' },
    ],
    new Map([['p1', [{ project_id: 'p1', total_ttc: 4000, accepted: true, accepted_at: '2026-01-04' }]]]),
    new Map(),
    new Map(),
  )
  assert.equal(projects[0].id, 'p2')
  assert.equal(projects.find((p) => p.id === 'p1')?.acceptedAmount, 4000)
})

test('buildClientQuotes: drops quotes whose project is not in this client\'s project set (orphan)', () => {
  const quotes = buildClientQuotes(
    [{ id: 'q1', project_id: 'p1', total_ttc: 100, statut: 'Envoyé' }, { id: 'q2', project_id: 'orphan', total_ttc: 200 }],
    new Map([['p1', 'Dossier A']]),
  )
  assert.equal(quotes.length, 1)
  assert.equal(quotes[0].id, 'q1')
})

test('buildClientAppointments: classifies past vs future correctly', () => {
  const appointments = buildClientAppointments(
    [
      { id: 'a1', project_id: 'p1', start_time: '2000-01-01T00:00:00Z', confirmation_status: 'confirmed' },
      { id: 'a2', project_id: 'p1', start_time: '2999-01-01T00:00:00Z', confirmation_status: 'pending' },
    ],
    new Map([['p1', 'Dossier A']]),
  )
  const past = appointments.find((a) => a.id === 'a1')
  const future = appointments.find((a) => a.id === 'a2')
  assert.equal(past?.isPast, true)
  assert.equal(future?.isPast, false)
})

test('buildClientSummary: aggregates won/active/lost counts and average project value', () => {
  const projects = buildClientProjects(
    [
      { id: 'p1', project_title: 'A', status: 'Gagné', created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 'p2', project_title: 'B', status: 'Perdu', created_at: '2026-02-01', updated_at: '2026-02-01' },
      { id: 'p3', project_title: 'C', status: 'En cours', created_at: '2026-03-01', updated_at: '2026-03-01' },
    ],
    new Map([['p1', [{ project_id: 'p1', total_ttc: 1000, accepted: true, accepted_at: '2026-01-02' }]]]),
    new Map(),
    new Map(),
  )
  const quotes = [{ project_id: 'p1', total_ttc: 1000, accepted: true, accepted_at: '2026-01-02' }]
  const summary = buildClientSummary(projects, quotes, '2026-03-01T00:00:00Z')
  assert.equal(summary.wonProjectCount, 1)
  assert.equal(summary.lostProjectCount, 1)
  assert.equal(summary.activeProjectCount, 1)
  assert.equal(summary.acceptedAmount, 1000)
  assert.equal(summary.averageProjectValue, 1000)
})

test('buildCommercialSummary: conversion rate only computed when quoteCount > 0', () => {
  const summaryNoQuotes = buildClientSummary([], [], null)
  const commercial = buildCommercialSummary(summaryNoQuotes, null)
  assert.equal(commercial.conversionRate, null)
  assert.equal(commercial.averageWonProjectValue, null)
})

test('deriveClientNextAction: prioritizes appointment_change_requested over stale project', () => {
  const now = new Date('2026-07-17T12:00:00Z')
  const action = deriveClientNextAction({
    projects: [{ id: 'p1', project_title: 'A', status: 'En cours', updated_at: '2026-06-01' }],
    quotes: [],
    appointments: [{ project_id: 'p1', start_time: '2026-07-19T09:00:00Z', confirmation_status: 'change_requested' }],
    now,
  })
  assert.equal(action?.reason, 'appointment_change_requested')
})

test('deriveClientNextAction: returns null when relation is up to date', () => {
  const now = new Date('2026-07-17T12:00:00Z')
  const action = deriveClientNextAction({ projects: [{ id: 'p1', status: 'Gagné', updated_at: '2026-07-15' }], quotes: [], appointments: [], now })
  assert.equal(action, null)
})

import assert from 'node:assert/strict'
import { register } from 'node:module'
import test from 'node:test'

register('../../../components/workspace/__tests__/typescript-resolution.loader.mjs', import.meta.url)

const { buildProjectWorkspaceBrief } = (await import('../project-workspace-builder')) as typeof import('../project-workspace-builder')
const { validateProjectWorkspaceBrief } = (await import('../project-workspace-contract')) as typeof import('../project-workspace-contract')

const input = (overrides: Record<string, unknown> = {}) => ({
  project: { id: 'project-1', status: 'Devis envoyé', clientName: 'Martin', clientFirstName: 'Léa', projectType: 'Rénovation', trade: 'Électricité', city: 'Rouen', completenessScore: 90 },
  latestQuote: { id: 'quote-1', sent: true, sentAt: '2026-07-01T10:00:00.000Z' },
  capabilities: { canEditProject: true, canManageQuote: true, canPlanAppointment: true },
  now: new Date('2026-07-20T10:00:00.000Z'),
  ...overrides,
})

test('produces a compact decision for a sent quote without overclaiming the client intent', () => {
  const brief = buildProjectWorkspaceBrief(input())
  assert.deepEqual(Object.keys(brief).sort(), ['capabilities', 'commercialSummary', 'dataQuality', 'decision', 'generatedAt', 'project', 'qualification'])
  assert.equal(brief.decision.evidenceLevel, 'moderate')
  assert.match(brief.decision.understanding, /pourrait attendre/)
  assert.match(brief.decision.uncertainty || '', /ne permet pas de conclure/)
  assert.equal(brief.decision.primaryAction?.id, 'follow_up_quote')
  assert.equal('quotes' in brief, false)
  assert.equal('activities' in brief, false)
  assert.equal('clientEmail' in brief.project, false)
})

test('exposes understanding labels without raw qualification values or PII', () => {
  const complete = buildProjectWorkspaceBrief(input({ project: { id: 'project-1', projectType: 'Rénovation', city: 'Rouen', budget: '9000 €', desiredTimeline: 'Septembre', completenessScore: 90 } }))
  assert.equal(complete.qualification.evidenceLevel, 'strong')
  assert.equal(complete.qualification.missing.length, 0)
  assert.equal('budget' in complete.qualification, false)
  const partial = buildProjectWorkspaceBrief(input({ project: { id: 'project-1', projectType: 'Rénovation', completenessScore: 40 } }))
  assert.ok(partial.qualification.missing.length)
  assert.ok(partial.qualification.action)
  assert.equal(buildProjectWorkspaceBrief(input({ latestQuote: null })).commercialSummary.state, 'Aucun devis pertinent')
})

test('marks optional-source gaps as partial and a sparse dossier as insufficient', () => {
  assert.equal(buildProjectWorkspaceBrief(input({ reservations: ['Le prochain rendez-vous n’est pas disponible.'] })).dataQuality.level, 'partial')
  const insufficient = buildProjectWorkspaceBrief(input({ project: { id: 'project-1', completenessScore: 0 }, latestQuote: null }))
  assert.equal(insufficient.dataQuality.level, 'insufficient')
  assert.equal(insufficient.decision.evidenceLevel, 'weak')
})

test('uses confirmed evidence for an accepted quote and an upcoming appointment', () => {
  const accepted = buildProjectWorkspaceBrief(input({ latestQuote: { id: 'quote-1', accepted: true, acceptedAt: '2026-07-19T10:00:00.000Z' }, nextAppointment: { startsAt: '2026-07-25T10:00:00.000Z' } }))
  assert.equal(accepted.decision.evidenceLevel, 'strong')
  assert.match(accepted.decision.understanding, /confirmée/)
  const appointment = buildProjectWorkspaceBrief(input({ latestQuote: null, nextAppointment: { startsAt: '2026-07-25T10:00:00.000Z' } }))
  assert.equal(appointment.decision.primaryAction?.id, 'view_appointment')
})

test('rejects forbidden keys, invalid evidence and more than five facts', () => {
  const brief = buildProjectWorkspaceBrief(input())
  assert.throws(() => validateProjectWorkspaceBrief({ ...brief, project: { ...brief.project, clientEmail: 'secret@example.com' } } as never), /Invalid project key/)
  assert.throws(() => validateProjectWorkspaceBrief({ ...brief, decision: { ...brief.decision, evidenceLevel: 'certain' } } as never), /Invalid evidence level/)
  assert.throws(() => validateProjectWorkspaceBrief({ ...brief, decision: { ...brief.decision, observedFacts: Array.from({ length: 6 }, () => ({ label: 'fait' })) } } as never), /Too many observed facts/)
})

import assert from 'node:assert/strict'
import { register } from 'node:module'
import test from 'node:test'

register('../../__tests__/typescript-resolution.loader.mjs', import.meta.url)

const { deriveWorkCalmState, deriveWorkSituations, prioritizeWorkSituations } = (await import('../work-situations')) as typeof import('../work-situations')

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item', category: 'today', score: 70, title: 'Relancer le client', description: 'Le devis a été envoyé il y a huit jours.', reason: 'Le client attend une reprise de contact.', priority: 'high', statusLabel: null, dateLabel: null,
    entityType: 'project', entityId: 'project-1', entityLabel: 'Rénovation Dupont', projectId: 'project-1', quoteId: 'quote-1', appointmentId: null, clientName: 'Camille Dupont', projectTitle: 'Rénovation Dupont',
    primaryActionLabel: 'Relancer', primaryActionType: 'open_quote_followup', primaryActionRoute: '/dashboard-v2/projet/project-1?focus=quote_followup', primaryActionPayload: null,
    secondaryActionLabel: null, secondaryActionType: null, secondaryActionRoute: null, secondaryActionPayload: null, canExecuteDirectly: false, source: 'recommendation', sourceType: 'follow_up_quote', automationMode: null,
    ...overrides,
  }
}

function center(items: ReturnType<typeof item>[]) {
  return { workbench: { waitingForApproval: [], todayActions: items, needsAttention: [], recentlyCompleted: [], summary: {}, permissions: {} } } as never
}

test('prioritises globally instead of keeping technical bucket order', () => {
  const situations = deriveWorkSituations(center([
    item({ id: 'quote', score: 80 }),
    item({ id: 'conflict', score: 78, sourceType: 'planning_conflict', appointmentId: 'appointment-1', title: 'Deux rendez-vous se chevauchent', description: 'Deux rendez-vous sont prévus au même moment.', primaryActionLabel: 'Voir conflit' }),
  ]))
  assert.deepEqual(prioritizeWorkSituations(situations).map((situation) => situation.id), ['conflict', 'quote'])
})

test('keeps facts, interpretation and a contextual action distinct', () => {
  const [situation] = deriveWorkSituations(center([item()]))
  assert.deepEqual(situation.observedFacts, ['Le devis a été envoyé il y a huit jours.'])
  assert.match(situation.understanding, /semble encore étudier/)
  assert.equal(situation.primaryAction?.label, 'Préparer la relance')
  assert.equal(situation.projectContext?.clientName, 'Camille Dupont')
})

test('does not produce a calm state while loading or after an error', () => {
  assert.equal(deriveWorkCalmState('loading', null, []).kind, 'loading')
  assert.equal(deriveWorkCalmState('error', null, []).kind, 'insufficient')
  assert.equal(deriveWorkCalmState('ready', center([]), []).kind, 'calm')
})

test('keeps the opening sentence aligned with the three visible situations', () => {
  const situations = prioritizeWorkSituations(deriveWorkSituations(center([
    item({ id: 'one', score: 90 }), item({ id: 'two', score: 80 }), item({ id: 'three', score: 70 }), item({ id: 'four', score: 60 }),
  ])))
  assert.match(deriveWorkCalmState('ready', center([]), situations).message, /^3 actions/)
})

test('represents a failed automation as a recoverable situation', () => {
  const [situation] = deriveWorkSituations(center([item({ id: 'failed', category: 'attention', source: 'automation_run', sourceType: 'appointment_confirmation', canExecuteDirectly: true, primaryActionRoute: '/api/automations/runs/run-1/retry', primaryActionType: null })]))
  assert.equal(situation.kind, 'recover')
  assert.equal(situation.primaryAction?.label, 'Réessayer l’envoi')
})

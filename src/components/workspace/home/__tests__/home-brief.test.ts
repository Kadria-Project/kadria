import assert from 'node:assert/strict'
import { register } from 'node:module'
import test from 'node:test'

register('../../__tests__/typescript-resolution.loader.mjs', import.meta.url)

const { briefSituationSentence, selectBriefSituations, understandingFor, workspaceDestinationFor } = (await import('../home-brief')) as typeof import('../home-brief')

test('keeps only the three highest-impact actionable situations', () => {
  const situations = selectBriefSituations([
    { id: 'normal', priority: 'normal' as const, score: 58, primaryActionRoute: '/dashboard-v2/suivi', sourceType: 'set_callback' },
    { id: 'critical', priority: 'critical' as const, score: 92, primaryActionRoute: '/dashboard-v2/agenda', sourceType: 'appointment_change_requested' },
    { id: 'high', priority: 'high' as const, score: 84, primaryActionRoute: '/dashboard-v2/a-faire', sourceType: 'follow_up_quote' },
    { id: 'secondary', priority: 'low' as const, score: 42, primaryActionRoute: '/dashboard-v2/clients', sourceType: 'inactive_project' },
    { id: 'unactionable', priority: 'critical' as const, score: 99, primaryActionRoute: null, sourceType: 'planning_conflict' },
  ])

  assert.deepEqual(situations.map((item) => item.id), ['critical', 'high', 'normal'])
})

test('states calm only when the analysis found no actionable situation', () => {
  assert.match(briefSituationSentence(0), /Aucun dossier ne nécessite de décision immédiate/)
  assert.match(briefSituationSentence(2), /2 situations méritent votre attention/)
})

test('keeps uncertainty explicit for an inactive dossier', () => {
  assert.match(understandingFor('inactive_project', 'fallback'), /peut indiquer/)
})

test('opens the workspace responsible for each situation', () => {
  assert.equal(workspaceDestinationFor({ id: 'agenda', priority: 'critical', score: 92, primaryActionRoute: '/dashboard-v2/projet/p1', sourceType: 'appointment_change_requested' }), '/dashboard-v2/agenda')
  assert.equal(workspaceDestinationFor({ id: 'suivi', priority: 'high', score: 84, primaryActionRoute: '/dashboard-v2/projet/p2', sourceType: 'follow_up_quote' }), '/dashboard-v2/suivi')
  assert.equal(workspaceDestinationFor({ id: 'todo', priority: 'high', score: 84, primaryActionRoute: '/api/automations/runs/1/execute', canExecuteDirectly: true, sourceType: 'automation' }), '/dashboard-v2/a-faire')
})

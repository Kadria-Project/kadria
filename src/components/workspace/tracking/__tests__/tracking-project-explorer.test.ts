import assert from 'node:assert/strict'
import { register } from 'node:module'
import test from 'node:test'

register('../../__tests__/typescript-resolution.loader.mjs', import.meta.url)
const { buildTrackingExplorerItem } = (await import('../tracking-brief-builder')) as typeof import('../tracking-brief-builder')
const explorerSource = await (await import('node:fs/promises')).readFile(new URL('../TrackingProjectsExplorer.tsx', import.meta.url), 'utf8')

const project = (overrides: Record<string, unknown> = {}) => ({ id: 'p1', status: 'Qualifié', clientName: 'Martin', clientFirstName: 'Léa', projectType: 'Rénovation', trade: '', budget: '1 500–2 000 €', devisAmount: 0, completenessScore: 90, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z', callbackDate: '', quoteSentAt: null, acceptedAt: null, lastFollowUpAt: null, ...overrides })
const at = new Date('2026-07-20T00:00:00Z')

test('derives deterministic operational signals and next steps from commercial facts', () => {
  assert.equal(buildTrackingExplorerItem(project({ quoteSentAt: '2026-06-26T00:00:00Z', devisAmount: 8500 }), { now: at }).signal.label, 'Sans réponse depuis 24 jours')
  assert.equal(buildTrackingExplorerItem(project(), { now: at }).signal.label, 'Prêt à chiffrer')
  assert.equal(buildTrackingExplorerItem(project({ completenessScore: 20 }), { now: at }).nextStep.label, 'Compléter le dossier')
  assert.equal(buildTrackingExplorerItem(project({ status: 'Nouveau', createdAt: '2026-07-19T00:00:00Z' }), { now: at }).nextStep.label, 'Examiner la prochaine étape')
})

test('keeps value, activity and status interpretations explicit', () => {
  const quote = buildTrackingExplorerItem(project({ quoteSentAt: '2026-07-19T00:00:00Z', devisAmount: 12840 }), { now: at })
  assert.deepEqual(quote.value, { amountLabel: '12 840 €', typeLabel: 'Devis' })
  assert.deepEqual(quote.lastActivity, { label: 'Devis envoyé', ageLabel: 'Hier', tone: 'neutral' })
  assert.equal(buildTrackingExplorerItem(project({ devisAmount: 0 }), { now: at }).value.typeLabel, 'Budget estimé')
  assert.equal(buildTrackingExplorerItem(project({ budget: '' }), { now: at }).value.typeLabel, 'Valeur non renseignée')
  assert.equal(buildTrackingExplorerItem(project({ status: 'Gagné', acceptedAt: '2026-07-10T00:00:00Z' }), { now: at }).nextStep.label, 'Examiner la prochaine étape')
  assert.equal(buildTrackingExplorerItem(project({ status: 'Perdu' }), { now: at }).stage.key, 'lost')
  assert.equal(buildTrackingExplorerItem(project({ status: 'Ancien statut' }), { now: at }).stage.key, 'legacy')
})

test('does not use metadata updates as commercial activity', () => {
  const item = buildTrackingExplorerItem(project({ status: 'Nouveau', createdAt: '', updatedAt: '2026-07-20T00:00:00Z' }), { now: at })
  assert.equal(item.lastActivity.ageLabel, 'Aucune activité enregistrée')
})

test('switches the presentation from the available container width, not the viewport breakpoint', () => {
  assert.match(explorerSource, /ResizeObserver/)
  assert.match(explorerSource, /PROJECT_EXPLORER_COMPACT_WIDTH = 1180/)
  assert.match(explorerSource, /Prochain pas : \{item\.nextStep\.label\}/)
  assert.match(explorerSource, /\{compact && <div[^>]*>[\s\S]*Signal actuel[\s\S]*Action/)
})

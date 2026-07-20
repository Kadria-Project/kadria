import assert from 'node:assert/strict'
import { register } from 'node:module'
import test from 'node:test'

register('../../__tests__/typescript-resolution.loader.mjs', import.meta.url)

const { buildHomeBrief } = (await import('../home-brief-builder')) as typeof import('../home-brief-builder')

function recommendation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1', type: 'follow_up_quote', priority: 'high', score: 80, title: 'Relancer le client', description: 'Le devis mérite une relance.', reason: 'Le devis est envoyé depuis 10 jours.', actionLabel: 'Relancer', actionRoute: '/dashboard-v2/suivi', category: 'Devis',
    ...overrides,
  } as never
}

test('exposes only the Home payload and caps attention at three items', () => {
  const brief = buildHomeBrief([recommendation(), recommendation({ id: 'r2', score: 90, category: 'Planning', priority: 'critical' }), recommendation({ id: 'r3', score: 70 }), recommendation({ id: 'r4', score: 60 })], '2026-07-20T10:00:00.000Z')
  assert.deepEqual(Object.keys(brief).sort(), ['attention', 'canWait', 'generatedAt', 'opportunity', 'risk', 'situation'])
  assert.equal(brief.attention.length, 3)
  assert.deepEqual(Object.keys(brief.attention[0]).sort(), ['action', 'consequence', 'id', 'observation', 'proofLabel', 'proofLevel', 'recommendation', 'title', 'whyItMatters'])
  assert.equal('projects' in brief, false)
  assert.equal('events' in brief, false)
  assert.equal('kpis' in brief, false)
  assert.equal('history' in brief, false)
})

test('returns a calm, complete contract for an empty or partial analysis', () => {
  const empty = buildHomeBrief([], '2026-07-20T10:00:00.000Z')
  const partial = buildHomeBrief([recommendation({ priority: 'normal', score: 40, category: 'Clients' })], '2026-07-20T10:00:00.000Z')
  assert.equal(empty.attention.length, 0)
  assert.equal(empty.opportunity, null)
  assert.equal(empty.risk, null)
  assert.equal(partial.attention.length, 0)
  assert.ok(partial.risk)
})

test('keeps unauthenticated and server-error responses explicit in the route', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../../../../../app/api/home-brief/route.ts', import.meta.url), 'utf8')
  assert.match(source, /status: 401/)
  assert.match(source, /status: 500/)
  assert.match(source, /export const dynamic = 'force-dynamic'/)
})

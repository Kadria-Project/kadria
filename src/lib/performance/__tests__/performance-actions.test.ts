import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

register('./typescript-resolution.loader.mjs', import.meta.url)

const {
  getTopOpportunities,
  getOpportunityValue,
  getRecommendedNextAction,
  deduplicateInsights,
  getPriorityActions,
  getMonthlyGoalProgress,
} = (await import('../performance-actions')) as typeof import('../performance-actions')

const now = new Date('2026-07-17T12:00:00.000Z')

test('excludes Gagné/Perdu projects from open opportunities', () => {
  const projects = [
    { id: 'p1', status: 'Nouveau', created_at: '2026-07-01' },
    { id: 'p2', status: 'Gagné', created_at: '2026-07-01' },
    { id: 'p3', status: 'Perdu', created_at: '2026-07-01' },
  ]
  const opportunities = getTopOpportunities(projects, [], now)
  assert.equal(opportunities.length, 1)
  assert.equal(opportunities[0].projectId, 'p1')
})

test('ranks opportunities deterministically by score, urgency, overdue and value', () => {
  const projects = [
    { id: 'low', status: 'Qualifié', client_name: 'Bas', created_at: '2026-07-01', budget: '' },
    {
      id: 'high',
      status: 'Devis envoyé',
      client_name: 'Haut',
      client_phone: '0600000000',
      city: 'Lyon',
      project_type: 'Cuisine',
      budget: '15000',
      desired_timeline: 'urgent, 1 mois',
      completeness_score: 80,
      created_at: '2026-07-01',
    },
  ]
  const quotes = [
    { project_id: 'high', total_ttc: 15000, statut: 'Envoyé', quote_sent_at: '2026-07-01T00:00:00Z' },
  ]
  const opportunities = getTopOpportunities(projects, quotes, now)
  assert.equal(opportunities[0].projectId, 'high')
})

test('opportunity value falls back honestly through the tiers', () => {
  const activeQuote = getOpportunityValue({ budget: '5000' }, [{ statut: 'Envoyé', total_ttc: 9000 }])
  assert.equal(activeQuote.amount, 9000)
  assert.equal(activeQuote.nature, 'quoteAmount')

  const estimated = getOpportunityValue({ budget: 'environ 5000 euros' }, [])
  assert.equal(estimated.amount, 5000)
  assert.equal(estimated.nature, 'estimatedBudget')

  const unknown = getOpportunityValue({ budget: '' }, [])
  assert.equal(unknown.amount, null)
  assert.equal(unknown.nature, 'unknown')
})

test('a sent quote is considered to follow up only past the documented threshold', () => {
  const projects = [{ id: 'p1', status: 'Devis envoyé', created_at: '2026-06-01' }]
  const recentQuote = [{ project_id: 'p1', statut: 'Envoyé', quote_sent_at: '2026-07-15T00:00:00Z', total_ttc: 1000 }]
  const staleQuote = [{ project_id: 'p1', statut: 'Envoyé', quote_sent_at: '2026-07-01T00:00:00Z', total_ttc: 1000 }]

  assert.equal(getPriorityActions({ projects, quotes: recentQuote, now }).find((a) => a.type === 'followUpQuotes'), undefined)
  const stale = getPriorityActions({ projects, quotes: staleQuote, now }).find((a) => a.type === 'followUpQuotes')
  assert.ok(stale)
  assert.equal(stale?.count, 1)
})

test('deduplicates insights that report the same evidence, keeping the highest priority', () => {
  const insights = [
    {
      id: 'a',
      category: 'followUp' as const,
      level: 'attention' as const,
      icon: 'clock' as const,
      title: 'Devis à relancer',
      explanation: '...',
      evidence: '4 devis, 12 400 €',
      ctaLabel: null,
      destination: null,
      rule: 'r1',
    },
    {
      id: 'b',
      category: 'risk' as const,
      level: 'critical' as const,
      icon: 'alert' as const,
      title: 'Valeur à risque',
      explanation: '...',
      evidence: '4 devis, 12 400 €',
      ctaLabel: null,
      destination: null,
      rule: 'r2',
    },
  ]
  const deduped = deduplicateInsights(insights)
  assert.equal(deduped.length, 1)
  assert.equal(deduped[0].id, 'b')
})

test('never displays a priority action with a zero count', () => {
  const actions = getPriorityActions({ projects: [], quotes: [], now })
  assert.equal(actions.length, 0)
  assert.ok(actions.every((a) => a.count > 0))
})

test('standard goal progress: higher current value is better', () => {
  const progress = getMonthlyGoalProgress({ metric: 'revenue', label: 'CA', unit: '€', currentValue: 5000, targetValue: 10000, inverted: false })
  assert.equal(progress.progressPercent, 50)
  assert.equal(progress.status, 'atRisk')
})

test('inverted goal progress: lower current value is better', () => {
  const progress = getMonthlyGoalProgress({ metric: 'averageResponseTime', label: 'Délai', unit: 'h', currentValue: 24, targetValue: 48, inverted: true })
  assert.equal(progress.progressPercent, 150)
  assert.equal(progress.status, 'achieved')
})

test('goal progress never divides by zero', () => {
  const progress = getMonthlyGoalProgress({ metric: 'revenue', label: 'CA', unit: '€', currentValue: 0, targetValue: 0, inverted: false })
  assert.equal(progress.progressPercent, 0)
  assert.equal(progress.status, 'behind')

  const invertedZeroCurrent = getMonthlyGoalProgress({ metric: 'averageResponseTime', label: 'Délai', unit: 'h', currentValue: 0, targetValue: 48, inverted: true })
  assert.equal(invertedZeroCurrent.progressPercent, 100)
})

test('handles missing financial value without throwing and reflects it in the recommended action', () => {
  const projects = [{ id: 'p1', status: 'Nouveau', created_at: '2026-07-01' }]
  const opportunities = getTopOpportunities(projects, [], now)
  assert.equal(opportunities[0].value.amount, null)
  assert.equal(opportunities[0].nextAction.destination, '/dashboard-v2/projet/p1')
})

test('getRecommendedNextAction always points to the project sheet', () => {
  const action = getRecommendedNextAction('p42', { status: 'Qualifié' })
  assert.equal(action.destination, '/dashboard-v2/projet/p42')
  assert.ok(action.label.length > 0)
})

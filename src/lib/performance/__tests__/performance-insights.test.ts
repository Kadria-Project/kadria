import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'
import type { PerformanceAnalytics } from '../performance-types'

register('./typescript-resolution.loader.mjs', import.meta.url)

const { deriveEvidenceLevel, derivePerformanceConclusion, derivePerformanceVisualization } = (await import('../performance-insights')) as typeof import('../performance-insights')
const { getAverageBasket, getConversionRate } = (await import('../performanceService')) as typeof import('../performanceService')

const emptyAnalytics = { revenueSeries: { points: [], granularity: 'day', total: 0, previousTotal: 0 }, leadSources: { total: 0, sources: [] }, funnel: [], atRisk: { nature: 'atRisk', amount: 0, count: 0, ruleDescription: '', mainLeak: null }, conversionRateSeries: { points: [], average: 0, previousAverage: null }, stageDurations: [], pipeline: { total: 0, statuses: [] } } satisfies PerformanceAnalytics

test('treats a single accepted day as a signal to confirm, never a durable trend', () => {
  const analytics = { ...emptyAnalytics, revenueSeries: { points: [{ bucketStart: '2026-07-01', label: '1 juillet', revenue: 11400 }], granularity: 'day' as const, total: 11400, previousTotal: 0 } }
  const evidence = deriveEvidenceLevel(analytics.revenueSeries)
  const conclusion = derivePerformanceConclusion([{ id: 'revenue', value: 11400, format: 'currency', comparison: { previousValue: 0, deltaAbsolute: 11400, deltaPercent: 100, trend: 'up' }, sparkline: [] }], analytics, '30 jours')
  assert.equal(evidence.level, 'weak')
  assert.equal(conclusion.conclusion, 'Signal à confirmer.')
  assert.equal(derivePerformanceVisualization(analytics.revenueSeries), 'single_event')
})

test('does not invent a visual trend when no accepted quote exists', () => {
  assert.equal(derivePerformanceVisualization(emptyAnalytics.revenueSeries), 'empty_state')
  assert.equal(deriveEvidenceLevel(emptyAnalytics.revenueSeries).level, 'insufficient')
})

test('uses bars for a small number of actual events and a series only when dense enough', () => {
  const few = { ...emptyAnalytics.revenueSeries, points: [1, 2, 3].map((revenue) => ({ bucketStart: String(revenue), label: String(revenue), revenue })) }
  const dense = { ...few, points: [1, 2, 3, 4, 5].map((revenue) => ({ bucketStart: String(revenue), label: String(revenue), revenue })) }
  assert.equal(derivePerformanceVisualization(few), 'few_events')
  assert.equal(derivePerformanceVisualization(dense), 'time_series')
})

test('uses the same accepted quotes for the average basket and a comparable quote cohort for conversion', () => {
  const range = { start: new Date('2026-07-01T00:00:00Z'), end: new Date('2026-08-01T00:00:00Z') }
  const quotes = [
    { total_ttc: 1000, accepted_at: '2026-07-10', quote_sent_at: '2026-07-01', accepted: true },
    { total_ttc: 3000, accepted_at: '2026-07-12', quote_sent_at: '2026-07-03', accepted: true },
    { total_ttc: 2000, quote_sent_at: '2026-07-04', statut: 'Envoyé' },
  ]
  assert.equal(getAverageBasket(quotes, [], range), 2000)
  assert.equal(getConversionRate(quotes, range), 2 / 3)
})

import { describe, expect, it } from 'vitest'
import { evaluateInterventionUtility, UTILITY_WINDOW_DAYS } from '../intervention-utility'
import type { UtilityEvent } from '../intervention-utility'
const now = new Date('2026-07-22T00:00:00.000Z')
const event = (interventionId: string, type: UtilityEvent['type'], arbitrationType?: UtilityEvent['arbitrationType']): UtilityEvent => ({ interventionId, type, arbitrationType, createdAt: now.toISOString() })
const series = (kind: UtilityEvent['type'], arbitrationType?: UtilityEvent['arbitrationType']) => Array.from({ length: 6 }, (_, index) => event(`quote_followup:${index}`, kind, arbitrationType))
describe('intervention utility', () => {
  it('keeps no, insufficient and limited history neutral', () => {
    expect(evaluateInterventionUtility([], now)).toMatchObject({ confidenceLevel: 'insufficient', priorityAdjustment: 0 })
    expect(evaluateInterventionUtility([event('quote_followup:a', 'viewed')], now)).toMatchObject({ confidenceLevel: 'insufficient', priorityAdjustment: 0 })
    expect(evaluateInterventionUtility([event('a','viewed'),event('b','viewed'),event('c','viewed')], now)).toMatchObject({ confidenceLevel: 'limited', priorityAdjustment: 0 })
  })
  it('recognises useful comparable evidence with a bounded increase', () => {
    const result = evaluateInterventionUtility([...series('executed'), ...series('resolved')], now)
    expect(result).toMatchObject({ confidenceLevel: 'usable', utilityAssessment: 'usually_helpful', priorityAdjustment: 1 })
    expect(result.explanationFacts[0]).toContain('comparables')
  })
  it('recognises contestation with a bounded decrease', () => {
    const result = evaluateInterventionUtility(series('viewed', 'not_relevant'), now)
    expect(result).toMatchObject({ utilityAssessment: 'often_disputed', priorityAdjustment: -1, disputedCount: 6 })
  })
  it('does not treat snoozes or unproved declarations as execution', () => {
    const snoozed = evaluateInterventionUtility(series('viewed', 'snoozed'), now)
    const declared = evaluateInterventionUtility(series('viewed', 'already_handled'), now)
    expect(snoozed).toMatchObject({ executedCount: 0, priorityAdjustment: 0 })
    expect(declared).toMatchObject({ executedCount: 0, priorityAdjustment: 0 })
  })
  it('reports low observed effect only after usable executed evidence', () => {
    expect(evaluateInterventionUtility(series('executed'), now)).toMatchObject({ utilityAssessment: 'low_observed_effect', priorityAdjustment: -1, noEffectCount: 6 })
  })
  it('keeps mixed signals neutral and ignores events outside the window', () => {
    const mixed = evaluateInterventionUtility([...series('executed'), ...series('viewed', 'priority_disputed')], now)
    expect(mixed).toMatchObject({ utilityAssessment: 'mixed', priorityAdjustment: 0 })
    const old: UtilityEvent = { ...event('quote_followup:old', 'executed'), createdAt: new Date(now.getTime() - (UTILITY_WINDOW_DAYS + 1) * 86400000).toISOString() }
    expect(evaluateInterventionUtility([old], now)).toMatchObject({ sampleSize: 0, priorityAdjustment: 0 })
  })
})

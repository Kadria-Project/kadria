import { describe, expect, it } from 'vitest'
import { arbitrationDescription, readActiveInterventionArbitration, resolveSnoozeUntil } from '../intervention-arbitration'

const interventionId = 'quote_followup:project-1'
const at = (type: Parameters<typeof arbitrationDescription>[0], created_at: string, snoozeUntil?: string) => ({
  action: `KADRIA_INTERVENTION_${type.toUpperCase()}`,
  description: arbitrationDescription(type, interventionId, snoozeUntil),
  created_at,
})

describe('intervention arbitration', () => {
  it('uses the latest valid arbitration for an intervention', () => {
    const result = readActiveInterventionArbitration([
      at('not_relevant', '2026-07-01T09:00:00.000Z'),
      at('declined', '2026-07-02T09:00:00.000Z'),
    ], interventionId, {}, new Date('2026-07-03T09:00:00.000Z'))
    expect(result?.arbitrationType).toBe('declined')
    expect(result?.isActive).toBe(true)
  })

  it('keeps a snooze active until its server-calculated deadline', () => {
    const until = resolveSnoozeUntil('three_days', new Date('2026-07-01T09:00:00.000Z'))
    expect(readActiveInterventionArbitration([at('snoozed', '2026-07-01T09:00:00.000Z', until)], interventionId, {}, new Date('2026-07-03T09:00:00.000Z'))?.isActive).toBe(true)
    expect(readActiveInterventionArbitration([at('snoozed', '2026-07-01T09:00:00.000Z', until)], interventionId, {}, new Date('2026-07-04T09:00:01.000Z'))?.reappearanceReason).toContain('délai')
  })

  it('lets newer business evidence supersede a user declaration without inventing execution', () => {
    const result = readActiveInterventionArbitration([at('already_handled', '2026-07-01T09:00:00.000Z')], interventionId, { observedAt: '2026-07-02T09:00:00.000Z' })
    expect(result?.isActive).toBe(false)
    expect(result?.supersededByNewEvidence).toBe(true)
  })

  it('allows significant escalation to override a snooze', () => {
    const until = '2026-07-10T09:00:00.000Z'
    const result = readActiveInterventionArbitration([at('snoozed', '2026-07-01T09:00:00.000Z', until)], interventionId, { hasSignificantEscalation: true }, new Date('2026-07-02T09:00:00.000Z'))
    expect(result?.isActive).toBe(false)
    expect(result?.reappearanceReason).toContain('aggravé')
  })
})

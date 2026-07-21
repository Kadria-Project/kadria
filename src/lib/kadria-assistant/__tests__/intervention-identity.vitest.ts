import { describe, expect, it } from 'vitest'
import { createInterventionId, interventionIdFromViewedDescription, viewedInterventionDescription } from '../intervention-identity'

describe('intervention identity', () => {
  it('uses the same deterministic identity for viewed writes and reads', () => {
    const interventionId = createInterventionId('quote_followup', 'project-123')
    expect(interventionIdFromViewedDescription(viewedInterventionDescription(interventionId))).toBe(interventionId)
  })

  it('does not put client data in the persisted activity description', () => {
    expect(viewedInterventionDescription(createInterventionId('quote_followup', 'project-123'))).toBe('KADRIA_INTERVENTION_VIEWED:quote_followup:project-123')
  })
})

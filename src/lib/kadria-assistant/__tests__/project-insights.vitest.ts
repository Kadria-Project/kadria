import { describe, expect, it } from 'vitest'
import { buildProjectAssistantResponse } from '../project-insights'

const project = { projectId: 'p1', projectNumber: '', recordId: '', projectTitle: 'Cuisine', clientName: 'Client', city: '', siteAddress: '', status: 'Qualifié', lifecycleStage: 'qualification', recommendedAction: 'Préparer le devis', recommendedActionMeta: 'La qualification est suffisante.', opportunityScore: 0, budget: '', desiredTimeline: '', urgency: '', description: '', quote: { status: 'aucun devis', amount: null, sentAt: null, acceptedAt: null, declinedAt: null, declineReason: null, followUpReason: null }, deposit: { status: '', amount: null, requestedAt: null, paidAt: null }, appointment: { present: false, start: null, end: null, location: null }, photos: { count: 0 }, clientMessages: { count: 0, latestAt: null }, activity: [], missingItems: ['budget'] }

describe('project assistant insights', () => {
  it('returns explicit missing data and a deterministic next action', () => {
    expect(buildProjectAssistantResponse('project.missing_information', project).details?.[0]).toMatchObject({ label: 'budget' })
    expect(buildProjectAssistantResponse('project.next_action', project).actions?.[0]).toMatchObject({ kind: 'quick-create', action: 'quote' })
  })
})

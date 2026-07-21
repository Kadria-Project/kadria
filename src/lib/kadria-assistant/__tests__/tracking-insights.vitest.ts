import { describe, expect, it } from 'vitest'
import { buildTrackingInsightResponse } from '../tracking-insights'

const brief = { generatedAt: '2026-07-21T00:00:00.000Z', dataQuality: { level: 'complete' as const, reservations: [] }, opportunities: [
  { id: 'quote-1', projectId: 'p1', title: 'Rénovation', clientLabel: 'Client', stage: 'Devis envoyé', amount: 1200, stalledForDays: 12, observedFacts: ['Un devis est envoyé depuis 12 jours.'], evidenceLevel: 'strong' as const, uncertainty: null, blockage: 'La décision client reste inconnue.', missingInformation: [], recommendation: 'Préparer une relance.', destination: { label: 'Ouvrir', href: '/dashboard-v2/projet/p1' } },
  { id: 'callback-2', projectId: 'p2', title: 'Cuisine', clientLabel: 'Client', stage: 'Qualification', amount: null, stalledForDays: null, observedFacts: ['Aucun rappel n’est planifié.'], evidenceLevel: 'strong' as const, uncertainty: null, blockage: 'La prochaine étape commerciale n’est pas enregistrée.', missingInformation: [], recommendation: 'Définir un rappel.', destination: { label: 'Ouvrir', href: '/dashboard-v2/projet/p2' } },
] }

describe('tracking assistant insights', () => {
  it('returns compact, deterministic blocked-project details and navigation actions', () => {
    const response = buildTrackingInsightResponse('tracking.blocked_projects', brief)
    expect(response.details).toHaveLength(2)
    expect(response.details?.[0]).toMatchObject({ severity: 'urgent', meta: '12 jours d’attente' })
    expect(response.actions?.[0]).toMatchObject({ kind: 'navigate', href: '/dashboard-v2/projet/p1' })
  })

  it('filters follow-ups without exposing unrelated opportunities', () => {
    expect(buildTrackingInsightResponse('tracking.followups', brief).details).toHaveLength(1)
  })

  it('reports a genuine empty result as a successful response', () => {
    expect(buildTrackingInsightResponse('tracking.blocked_projects', { ...brief, opportunities: [] }).summary).toBe('Aucun dossier bloqué selon les règles actuelles.')
  })
})

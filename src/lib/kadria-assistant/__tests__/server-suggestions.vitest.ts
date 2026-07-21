import { describe, expect, it } from 'vitest'
import { withServerSuggestions } from '../server-suggestions'

describe('server assistant suggestions', () => {
  it('prioritizes and complements tracking actions', () => {
    const response = withServerSuggestions({ intent: 'tracking.followups', summary: 'Relances.', actions: [] })
    expect(response.suggestions?.map((suggestion) => suggestion.priority)).toEqual(['primary', 'secondary'])
    expect(response.suggestions?.map((suggestion) => suggestion.action.kind)).toEqual(['intent', 'intent'])
  })

  it('prioritizes performance suggestions', () => {
    const response = withServerSuggestions({ intent: 'performance.summary', summary: 'Performance.', actions: [] })
    expect(response.suggestions?.map((suggestion) => suggestion.id)).toEqual(['performance-contributors', 'performance-explain'])
    expect(response.suggestions?.map((suggestion) => suggestion.priority)).toEqual(['primary', 'secondary'])
  })

  it('does not duplicate an action already linked to the response', () => {
    const response = withServerSuggestions({ intent: 'project.next_action', summary: 'Créer un devis.', actions: [{ kind: 'intent', label: 'Résumé', intent: 'project.summary' }] })
    expect(response.suggestions?.map((suggestion) => suggestion.id)).not.toContain('project-summary')
  })

  it('does not create suggestions for navigation or fallback responses', () => {
    expect(withServerSuggestions({ summary: 'Navigation.', actions: [] }).suggestions).toBeUndefined()
  })
})

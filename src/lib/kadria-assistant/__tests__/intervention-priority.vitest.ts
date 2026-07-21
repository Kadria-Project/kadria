import { describe, expect, it } from 'vitest'
import { prioritizeInterventions } from '../intervention-priority'

const action = (id: string, type: string, priority: 'high' | 'medium' | 'low', reason = 'Preuve disponible') => ({
  id, type, priority, status: 'ready' as const, title: id, description: 'Description', reason, primaryActionLabel: 'Ouvrir le dossier', primaryActionHref: '/dashboard-v2/projet/a',
})

describe('collaborator intervention priority', () => {
  it('keeps one evidence-backed primary intervention with a deterministic order', () => {
    const ranked = prioritizeInterventions([action('quote', 'quote_followup', 'high'), action('failed', 'delivery_error', 'high'), action('review', 'review_request', 'medium')])
    expect(ranked.map((item) => item.id)).toEqual(['failed', 'quote', 'review'])
    expect(ranked.filter((item) => item.isPrimary).map((item) => item.id)).toEqual(['failed'])
    expect(ranked[0]).toMatchObject({ level: 'critical', observedFact: 'Preuve disponible' })
  })

  it('does not promote an opaque commercial score into an intervention', () => {
    expect(prioritizeInterventions([action('score', 'priority_project', 'medium', 'Score commercial estime a 88.')])).toEqual([])
  })

  it('keeps informational items out of the primary slot', () => {
    const ranked = prioritizeInterventions([action('tasks', 'tasks_overview', 'low')])
    expect(ranked[0]).toMatchObject({ level: 'informational', isPrimary: false })
  })

  it('does not repeat the same actionable intervention in one result', () => {
    const duplicate = action('quote-bis', 'quote_followup', 'high')
    expect(prioritizeInterventions([action('quote', 'quote_followup', 'high'), duplicate])).toHaveLength(1)
  })

  it('keeps only the best immediate quote followup across distinct projects', () => {
    const first = { ...action('quote-a', 'quote_followup', 'high'), primaryActionHref: '/dashboard-v2/projet/a' }
    const second = { ...action('quote-b', 'quote_followup', 'high'), primaryActionHref: '/dashboard-v2/projet/b' }
    expect(prioritizeInterventions([second, first]).map((item) => item.id)).toEqual(['quote-a'])
  })
})

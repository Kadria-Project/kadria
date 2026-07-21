import { describe, expect, it } from 'vitest'
import { getAssistantCapability, isAssistantIntentAvailable } from '../assistant-capabilities'
import { resolveAssistantIntent } from '../assistant-intent-resolver'

const projectContext = { pageType: 'project_detail' as const, route: '/dashboard-v2/projet/[id]', projectId: 'project-1' }

describe('Kadria orchestrator contracts', () => {
  it('exposes only registered, available capabilities for a page', () => {
    expect(isAssistantIntentAvailable('project.summary', 'project_detail')).toBe(true)
    expect(isAssistantIntentAvailable('project.summary', 'performance')).toBe(false)
    expect(getAssistantCapability('tracking.blocked_projects')?.status).toBe('available')
  })

  it('accepts a direct intent without classifying a user sentence', () => {
    expect(resolveAssistantIntent({ kind: 'intent', intent: 'project.summary', context: projectContext })).toMatchObject({
      kind: 'capability',
      intent: 'project.summary',
      confidence: 1,
    })
  })

  it('routes supported freeform project questions to the same capability', () => {
    expect(resolveAssistantIntent({ kind: 'message', message: 'Résume ce projet', context: projectContext })).toMatchObject({
      kind: 'capability',
      intent: 'project.summary',
    })
  })

  it('falls back to conversation when no executable capability exists', () => {
    expect(resolveAssistantIntent({ kind: 'message', message: 'Question générale', context: { pageType: 'commercial_tracking', route: '/dashboard-v2/suivi' } })).toEqual({
      kind: 'conversation', confidence: 0, parameters: {},
    })
  })

  it('recognizes the supported tracking phrasing without OpenAI', () => {
    expect(resolveAssistantIntent({ kind: 'message', message: 'Quels dossiers sont bloqués ?', context: { pageType: 'commercial_tracking', route: '/dashboard-v2/suivi' } })).toMatchObject({
      kind: 'capability', intent: 'tracking.blocked_projects',
    })
  })

  it('routes explicit navigation without falling back to conversation', () => {
    expect(resolveAssistantIntent({ kind: 'message', message: 'Ouvre l’agenda', context: { pageType: 'dashboard_home', route: '/dashboard-v2' } })).toMatchObject({
      kind: 'navigation', href: '/dashboard-v2/agenda',
    })
  })
})

import { describe, expect, it } from 'vitest'
import { getCollaboratorSuggestions } from '../collaborator-suggestions'
import { getShellContextFromPathname } from '@/src/components/workspace/shell/shell-context'

describe('collaborator suggestions', () => {
  it('adapts the actions to dashboard, agenda, project, performance and settings', () => {
    expect(getCollaboratorSuggestions(getShellContextFromPathname('/dashboard-v2')).map((item) => item.id)).toContain('create-project')
    expect(getCollaboratorSuggestions(getShellContextFromPathname('/dashboard-v2/agenda')).map((item) => item.id)).toContain('create-appointment')
    const project = getCollaboratorSuggestions(getShellContextFromPathname('/dashboard-v2/projet/project-1'))
    expect(project.map((item) => item.id)).toContain('create-quote')
    expect(getCollaboratorSuggestions(getShellContextFromPathname('/dashboard-v2/performance')).map((item) => item.id)).toContain('period')
    expect(getCollaboratorSuggestions(getShellContextFromPathname('/parametres/automatisations')).map((item) => item.id)).toContain('automations')
    expect(getCollaboratorSuggestions(getShellContextFromPathname('/dashboard-v2/suivi')).map((item) => item.id)).toEqual(['blocked', 'followups', 'next-actions'])
  })

  it('never exposes a quote action outside a project', () => {
    expect(getCollaboratorSuggestions(getShellContextFromPathname('/dashboard-v2')).some((item) => item.kind === 'quick-create' && item.action === 'quote')).toBe(false)
    expect(getCollaboratorSuggestions(getShellContextFromPathname('/inconnue')).map((item) => item.kind)).toEqual(['prompt'])
  })

  it('uses direct intents for tracking actions', () => {
    expect(getCollaboratorSuggestions(getShellContextFromPathname('/dashboard-v2/suivi'))).toEqual([
      expect.objectContaining({ kind: 'intent', intent: 'tracking.blocked_projects' }),
      expect.objectContaining({ kind: 'intent', intent: 'tracking.followups' }),
      expect.objectContaining({ kind: 'intent', intent: 'tracking.next_actions' }),
    ])
  })
})

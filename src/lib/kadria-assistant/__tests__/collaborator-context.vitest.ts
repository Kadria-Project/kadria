import { describe, expect, it } from 'vitest'
import {
  belongsToCollaboratorContext,
  canApplyCollaboratorResult,
  createCollaboratorContextSnapshot,
  getCollaboratorContextKey,
} from '../collaborator-context'
import { getShellContextFromPathname } from '@/src/components/workspace/shell/shell-context'

describe('collaborator context contract', () => {
  it('creates stable section keys from the canonical shell context', () => {
    const tracking = getShellContextFromPathname('/dashboard-v2/suivi')
    expect(getCollaboratorContextKey(tracking)).toBe('section:tracking')
    expect(getCollaboratorContextKey(getShellContextFromPathname('/dashboard-v2/performance'))).toBe('section:performance')
    expect(getCollaboratorContextKey(getShellContextFromPathname('/dashboard-v2/suivi'))).toBe('section:tracking')
  })

  it('separates two entities that share a dynamic route', () => {
    expect(getCollaboratorContextKey(getShellContextFromPathname('/dashboard-v2/projet/project-a'))).toBe('project:project-a')
    expect(getCollaboratorContextKey(getShellContextFromPathname('/dashboard-v2/projet/project-b'))).toBe('project:project-b')
  })

  it('retains canonical route, entity and capabilities in a snapshot', () => {
    const snapshot = createCollaboratorContextSnapshot(
      getShellContextFromPathname('/dashboard-v2/projet/project-a'),
      '2026-07-21T10:00:00.000Z',
    )
    expect(snapshot).toMatchObject({
      contextKey: 'project:project-a',
      route: '/dashboard-v2/projet/[id]',
      page: 'project',
      entityType: 'project',
      entityId: 'project-a',
      createdAt: '2026-07-21T10:00:00.000Z',
      capabilities: { createQuote: true },
    })
  })

  it('never treats legacy records without a context as active', () => {
    const trackingKey = getCollaboratorContextKey(getShellContextFromPathname('/dashboard-v2/suivi'))
    expect(belongsToCollaboratorContext({}, trackingKey)).toBe(false)
    expect(belongsToCollaboratorContext({ context: createCollaboratorContextSnapshot(getShellContextFromPathname('/dashboard-v2/suivi')) }, trackingKey)).toBe(true)
  })

  it('rejects a late result after a context change', () => {
    expect(canApplyCollaboratorResult('section:tracking', 'section:performance', false)).toBe(false)
    expect(canApplyCollaboratorResult('project:project-a', 'project:project-a', true)).toBe(false)
    expect(canApplyCollaboratorResult('project:project-a', 'project:project-a', false)).toBe(true)
  })
})

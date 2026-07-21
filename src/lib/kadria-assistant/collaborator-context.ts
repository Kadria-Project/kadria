import type { ShellContextValue } from '@/src/components/workspace/shell/shell-context'

export type CollaboratorContextSnapshot = {
  contextKey: string
  route: string
  section: string
  page: ShellContextValue['pageType']
  entityType?: 'project' | 'client'
  entityId?: string
  capabilities: ShellContextValue['capabilities']
  createdAt: string
}

export type ContextualCollaboratorRecord = {
  context?: CollaboratorContextSnapshot
}

export function getCollaboratorContextKey(context: ShellContextValue): string {
  if (context.entity) return `${context.entity.type}:${context.entity.id}`
  if (context.pageType === 'settings' && context.section) return `settings:${context.section}`
  return `section:${context.pageType}`
}

export function createCollaboratorContextSnapshot(
  context: ShellContextValue,
  createdAt = new Date().toISOString(),
): CollaboratorContextSnapshot {
  return {
    contextKey: getCollaboratorContextKey(context),
    route: context.route,
    section: context.section || context.pageType,
    page: context.pageType,
    ...(context.entity ? { entityType: context.entity.type, entityId: context.entity.id } : {}),
    capabilities: context.capabilities,
    createdAt,
  }
}

export function belongsToCollaboratorContext(
  record: ContextualCollaboratorRecord,
  contextKey: string,
): boolean {
  return record.context?.contextKey === contextKey
}

export function canApplyCollaboratorResult(
  requestContextKey: string,
  activeContextKey: string,
  aborted: boolean,
): boolean {
  return !aborted && requestContextKey === activeContextKey
}

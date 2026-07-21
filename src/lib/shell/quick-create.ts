import type { ShellContextValue } from '@/src/components/workspace/shell/shell-context'

export type QuickCreateAction = { id: 'project' | 'appointment' | 'quote'; label: string; kind: 'panel' | 'navigation'; href?: string }

export function getQuickCreateActions(context: ShellContextValue): QuickCreateAction[] {
  const actions: QuickCreateAction[] = []
  if (context.capabilities.createProject) actions.push({ id: 'project', label: 'Nouveau dossier', kind: 'panel' })
  if (context.capabilities.createAppointment) {
    const projectId = context.pageType === 'project' && context.entity?.type === 'project' ? context.entity.id : null
    actions.push({ id: 'appointment', label: 'Nouveau rendez-vous', kind: 'navigation', href: `/dashboard-v2/agenda?quickCreate=appointment${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ''}` })
  }
  if (context.pageType === 'project' && context.entity?.type === 'project' && context.capabilities.createQuote) {
    actions.push({ id: 'quote', label: 'Nouveau devis', kind: 'navigation', href: `/dashboard-v2/projet/${encodeURIComponent(context.entity.id)}/devis/new` })
  }
  return actions
}

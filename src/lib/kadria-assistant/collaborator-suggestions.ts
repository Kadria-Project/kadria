import type { ShellContextValue } from '@/src/components/workspace/shell/shell-context'

export type CollaboratorSuggestion =
  | { id: string; label: string; kind: 'prompt'; prompt: string }
  | { id: string; label: string; kind: 'navigation'; href: string }
  | { id: string; label: string; kind: 'quick-create'; action: 'project' | 'appointment' | 'quote' }
  | { id: string; label: string; kind: 'search' }

const prompt = (id: string, label: string, value = label): CollaboratorSuggestion => ({ id, label, kind: 'prompt', prompt: value })

export function getCollaboratorSuggestions(context: ShellContextValue): CollaboratorSuggestion[] {
  const can = context.capabilities
  if (context.pageType === 'dashboard') return [
    prompt('priorities', 'Voir mes priorités', 'Voir ce que je dois faire aujourd’hui'),
    prompt('projects', 'Quels dossiers traiter aujourd’hui ?'),
    ...(can.createProject ? [{ id: 'create-project', label: 'Créer un dossier', kind: 'quick-create' as const, action: 'project' as const }] : []),
    ...(can.createAppointment ? [{ id: 'create-appointment', label: 'Créer un rendez-vous', kind: 'quick-create' as const, action: 'appointment' as const }] : []),
  ]
  if (context.pageType === 'tasks') return [prompt('first', 'Que traiter en premier ?'), prompt('late', 'Résumer les actions en retard'), prompt('urgent', 'Ouvrir le dossier le plus urgent')]
  if (context.pageType === 'tracking') return [prompt('followups', 'Quels dossiers relancer ?'), prompt('blocked', 'Quels dossiers sont bloqués ?'), prompt('summary', 'Résumer mon suivi')]
  if (context.pageType === 'calendar') return [prompt('day', 'Préparer ma journée'), ...(can.createAppointment ? [{ id: 'create-appointment', label: 'Créer un rendez-vous', kind: 'quick-create' as const, action: 'appointment' as const }] : []), prompt('confirm', 'Quels rendez-vous confirmer ?')]
  if (context.pageType === 'clients') return [{ id: 'find-client', label: 'Retrouver un client', kind: 'search' }, prompt('inactive-clients', 'Quels clients n’ont plus de suivi ?')]
  if (context.pageType === 'project') return [prompt('summary', 'Résumer le dossier'), prompt('missing', 'Que manque-t-il ?'), prompt('next', 'Quelle est la prochaine action ?'), ...(can.createAppointment ? [{ id: 'create-appointment', label: 'Créer un rendez-vous', kind: 'quick-create' as const, action: 'appointment' as const }] : []), ...(can.createQuote ? [{ id: 'create-quote', label: 'Créer un devis', kind: 'quick-create' as const, action: 'quote' as const }] : [])]
  if (context.pageType === 'performance') return [prompt('period', 'Résumer la période'), prompt('evolution', 'Qu’est-ce qui évolue ?'), prompt('drivers', 'Quels dossiers expliquent cette variation ?')]
  if (context.pageType === 'settings') return [prompt('configure', 'M’aider à configurer cette section'), prompt('missing-settings', 'Quel réglage manque ?'), prompt('where', 'Où modifier ce réglage ?')]
  if (context.pageType === 'resources') return [prompt('help', 'Comment utiliser cette ressource ?')]
  return [prompt('help', 'Comment pouvez-vous m’aider ?')]
}

export function collaboratorContextLabel(context: ShellContextValue): string {
  if (context.pageType === 'project') return context.entity?.label ? `Projet — ${context.entity.label}` : 'Projet'
  if (context.pageType === 'settings') return context.section ? `Paramètres — ${context.section}` : 'Paramètres'
  return ({ dashboard: 'Accueil', tasks: 'À faire', tracking: 'Suivi', calendar: 'Agenda', clients: 'Clients', performance: 'Performance', resources: 'Ressources', unknown: 'Kadria' } as const)[context.pageType]
}

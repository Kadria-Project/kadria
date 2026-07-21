import type { ShellContextValue } from '@/src/components/workspace/shell/shell-context'
import type { AssistantIntent } from './assistant-intents'

export type CollaboratorSuggestion =
  | { id: string; label: string; kind: 'prompt'; prompt: string }
  | { id: string; label: string; kind: 'navigation'; href: string }
  | { id: string; label: string; kind: 'quick-create'; action: 'project' | 'appointment' | 'quote' }
  | { id: string; label: string; kind: 'search' }
  | { id: string; label: string; kind: 'intent'; intent: AssistantIntent }

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
  if (context.pageType === 'tracking') return [
    { id: 'blocked', label: 'Bloqués', kind: 'intent', intent: 'tracking.blocked_projects' },
    { id: 'followups', label: 'À relancer', kind: 'intent', intent: 'tracking.followups' },
    { id: 'next-actions', label: 'Sans prochaine action', kind: 'intent', intent: 'tracking.next_actions' },
  ]
  if (context.pageType === 'calendar') return [prompt('confirm', 'Rendez-vous à confirmer'), prompt('day', 'Préparer ma journée'), prompt('availability', 'Trouver un créneau disponible'), ...(can.createAppointment ? [{ id: 'create-appointment', label: 'Créer un rendez-vous', kind: 'quick-create' as const, action: 'appointment' as const }] : [])]
  if (context.pageType === 'clients') return [{ id: 'find-client', label: 'Retrouver un client', kind: 'search' }, prompt('inactive-clients', 'Quels clients n’ont plus de suivi ?')]
  if (context.pageType === 'project') return [prompt('summary', 'Résumer le dossier'), prompt('missing', 'Que manque-t-il ?'), prompt('next', 'Quelle est la prochaine action ?'), ...(can.createAppointment ? [{ id: 'create-appointment', label: 'Créer un rendez-vous', kind: 'quick-create' as const, action: 'appointment' as const }] : []), ...(can.createQuote ? [{ id: 'create-quote', label: 'Créer un devis', kind: 'quick-create' as const, action: 'quote' as const }] : [])]
  if (context.pageType === 'performance') return [
    { id: 'period', label: 'Résumer', kind: 'intent', intent: 'performance.summary' },
    { id: 'evolution', label: 'Expliquer', kind: 'intent', intent: 'performance.explain_change' },
    { id: 'drivers', label: 'Contributeurs', kind: 'intent', intent: 'performance.contributing_projects' },
  ]
  if (context.pageType === 'settings') {
    if (context.section === 'automatisations') return [prompt('automations', 'Quelles automatisations activer ?'), prompt('rules', 'Vérifier mes règles')]
    if (context.section === 'connexions') return [prompt('connections', 'Vérifier mes connexions'), prompt('connect', 'M’aider à connecter un service')]
    if (context.section === 'activite') return [prompt('area', 'Vérifier ma zone d’intervention'), prompt('services', 'M’aider à configurer mes services')]
    return [prompt('details', 'Vérifier mes informations'), prompt('missing-settings', 'Que manque-t-il ?')]
  }
  if (context.pageType === 'resources') return [prompt('help', 'Comment utiliser cette ressource ?')]
  return [prompt('help', 'Comment pouvez-vous m’aider ?')]
}

export function collaboratorContextLabel(context: ShellContextValue): string {
  if (context.pageType === 'project') return context.entity?.label ? `Projet — ${context.entity.label}` : 'Projet'
  if (context.pageType === 'settings') return context.section ? `Paramètres — ${context.section}` : 'Paramètres'
  return ({ dashboard: 'Accueil', tasks: 'À faire', tracking: 'Suivi', calendar: 'Agenda', clients: 'Clients', performance: 'Performance', resources: 'Ressources', unknown: 'Kadria' } as const)[context.pageType]
}

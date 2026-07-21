import type { AssistantResponse } from './assistant-response'
import type { AssistantIntent } from './assistant-intents'
import type { AssistantProjectSummary } from './tools'

function evidence(summary: AssistantProjectSummary) {
  return summary.missingItems.length === 0 ? { level: 'solid' as const } : { level: 'moderate' as const, note: 'Certaines informations du dossier restent à compléter.' }
}

function projectHref(summary: AssistantProjectSummary, focus?: string) {
  return `/dashboard-v2/projet/${encodeURIComponent(summary.projectId)}${focus ? `?focus=${focus}` : ''}`
}

export function buildProjectAssistantResponse(intent: Extract<AssistantIntent, `project.${string}`>, summary: AssistantProjectSummary): AssistantResponse {
  const proof = evidence(summary)
  if (intent === 'project.missing_information') {
    if (summary.missingItems.length === 0) return { intent, title: 'Informations manquantes', summary: 'Aucune information bloquante n’est détectée sur ce dossier.', evidence: proof }
    return { intent, title: 'Informations manquantes', summary: `${summary.missingItems.length} information${summary.missingItems.length > 1 ? 's' : ''} manque${summary.missingItems.length > 1 ? 'nt' : ''} encore.`, details: summary.missingItems.slice(0, 5).map((item, index) => ({ id: `missing-${index}`, label: item, value: item === 'devis' ? 'Nécessaire avant chiffrage.' : 'À compléter dans le dossier.', severity: item === 'budget' || item === 'description du besoin' ? 'attention' as const : 'neutral' as const })), actions: [{ kind: 'navigate', label: 'Ouvrir le dossier', href: projectHref(summary, 'completion') }], evidence: proof }
  }
  if (intent === 'project.next_action') {
    const createAction = /rendez-vous/i.test(summary.recommendedAction) ? { kind: 'quick-create' as const, label: 'Créer un rendez-vous', action: 'appointment' as const } : /devis/i.test(summary.recommendedAction) ? { kind: 'quick-create' as const, label: 'Créer un devis', action: 'quote' as const } : null
    return { intent, title: 'Prochaine action', summary: `Prochaine action : ${summary.recommendedAction}.`, details: [{ id: 'reason', label: 'Pourquoi', value: summary.recommendedActionMeta }, ...(summary.missingItems.length ? [{ id: 'missing', label: 'À vérifier', value: summary.missingItems[0], severity: 'attention' as const }] : [])], actions: [ ...(createAction ? [createAction] : []), { kind: 'navigate', label: 'Ouvrir le dossier', href: projectHref(summary) } ], evidence: proof }
  }
  return { intent, title: 'Résumé du dossier', summary: `${summary.status}. ${summary.recommendedAction}.`, details: [{ id: 'status', label: 'Statut', value: summary.status }, { id: 'appointment', label: 'Rendez-vous', value: summary.appointment.start || 'Non planifié', severity: summary.appointment.present ? 'neutral' as const : 'attention' as const }, { id: 'quote', label: 'Devis', value: summary.quote.status, severity: summary.quote.status === 'aucun devis' ? 'attention' as const : 'neutral' as const }], actions: [{ kind: 'navigate', label: 'Ouvrir le dossier', href: projectHref(summary) }], evidence: proof }
}

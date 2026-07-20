import type { OperationsCenterResult, OperationsWorkbenchItem } from '@/src/lib/recommendations'

export type TasksWorkspaceData = Pick<OperationsCenterResult, 'generatedAt' | 'dataQuality' | 'workbench'>

export type WorkSituationKind = 'execute' | 'validate' | 'automate' | 'recover' | 'observe'
export type WorkSituationConfidence = 'high' | 'medium' | 'low'

export type WorkSituationAction = {
  label: string
  actionKey: string
  target?: string
}

export type WorkSituation = {
  id: string
  kind: WorkSituationKind
  observedFacts: string[]
  understanding: string
  importance: string
  consequence?: string
  recommendation?: string
  confidence: WorkSituationConfidence
  sourceUpdatedAt?: string
  projectContext?: {
    projectId?: string
    projectTitle?: string
    clientName?: string
  }
  primaryAction?: WorkSituationAction
  secondaryAction?: WorkSituationAction
  canBeAutomated?: boolean
  automationExplanation?: string
  priorityScore: number
}

export type WorkCalmState =
  | { kind: 'loading'; message: string }
  | { kind: 'insufficient'; message: string }
  | { kind: 'calm'; message: string }
  | { kind: 'active'; message: string }

export type OperationsLoadState = 'loading' | 'ready' | 'error'

const understandingBySource: Record<string, string> = {
  set_callback: 'Le suivi risque d’être oublié si aucun rappel n’est défini.',
  prepare_quote: 'Le dossier peut être chiffré sans attendre davantage.',
  follow_up_quote: 'Le client semble encore étudier votre proposition.',
  schedule_intervention: 'Le chantier ne peut pas démarrer tant que l’intervention n’est pas planifiée.',
  request_review: 'La relation peut être prolongée après la fin du chantier.',
  assign_responsible: 'Personne ne porte clairement la prochaine décision sur ce dossier.',
  inactive_project: 'L’absence d’activité enregistrée peut indiquer que le dossier se refroidit.',
  complete_information: 'Des informations manquent pour faire avancer le dossier de façon fiable.',
  risk_followup: 'Le suivi commercial présente un risque de refroidissement.',
  appointment_change_requested: 'Le créneau actuel ne répond plus à la demande du client.',
  appointment_confirmation: 'Le rendez-vous reste incertain tant que le client ne l’a pas confirmé.',
  appointment_address: 'Le déplacement ne peut pas être préparé correctement sans adresse.',
  assign_collaborator: 'Le rendez-vous ne peut pas être attribué clairement à un collaborateur.',
  planning_conflict: 'Les interventions ne peuvent pas être tenues aux horaires actuels.',
  travel_warning: 'Le déplacement prévu semble trop contraint pour être fiable.',
  member_overloaded: 'La charge planifiée mérite d’être rééquilibrée avant de perturber la journée.',
}

const consequenceBySource: Record<string, string> = {
  follow_up_quote: 'Sans relance, le dossier risque de perdre en dynamique commerciale.',
  schedule_intervention: 'Le chantier restera bloqué tant qu’aucun créneau n’est prévu.',
  appointment_change_requested: 'Le client peut rester sans rendez-vous adapté.',
  appointment_confirmation: 'Le rendez-vous peut être manqué ou mobiliser inutilement un créneau.',
  planning_conflict: 'Deux interventions risquent de ne pas pouvoir être réalisées.',
  appointment_address: 'Le rendez-vous risque de ne pas pouvoir être préparé correctement.',
  complete_information: 'La suite du dossier risque de reposer sur des informations incomplètes.',
  assign_responsible: 'Le dossier risque de rester sans suite claire.',
}

const explicitActionLabels: Record<string, string> = {
  set_callback: 'Définir le rappel',
  prepare_quote: 'Préparer le devis',
  follow_up_quote: 'Préparer la relance',
  risk_followup: 'Préparer la relance',
  schedule_intervention: 'Planifier l’intervention',
  appointment_confirmation: 'Préparer la confirmation',
  appointment_change_requested: 'Replanifier le rendez-vous',
  appointment_address: 'Compléter l’adresse',
  assign_collaborator: 'Attribuer le rendez-vous',
  planning_conflict: 'Résoudre le conflit',
  travel_warning: 'Vérifier l’ordre des interventions',
  member_overloaded: 'Rééquilibrer la charge',
  assign_responsible: 'Attribuer le dossier',
  complete_information: 'Compléter les informations',
  inactive_project: 'Reprendre le dossier',
  request_review: 'Préparer la demande d’avis',
}

function actionFor(item: OperationsWorkbenchItem, secondary = false): WorkSituationAction | undefined {
  const route = secondary ? item.secondaryActionRoute : item.primaryActionRoute
  const actionType = secondary ? item.secondaryActionType : item.primaryActionType
  const originalLabel = secondary ? item.secondaryActionLabel : item.primaryActionLabel
  if (!route || (secondary && actionType !== 'ignore_automation_run')) return undefined

  const label = secondary && actionType === 'ignore_automation_run'
    ? 'Refuser'
    : !secondary && item.source === 'automation_run' && item.canExecuteDirectly
        ? 'Réessayer l’envoi'
        : !secondary && item.canExecuteDirectly
          ? 'Valider et exécuter'
        : explicitActionLabels[item.sourceType || ''] || originalLabel || 'Continuer'

  return { label, actionKey: actionType || 'navigate', target: route }
}

function kindFor(item: OperationsWorkbenchItem): WorkSituationKind {
  if (item.source === 'automation_run' && item.category === 'attention') return 'recover'
  if (item.category === 'approval' || item.canExecuteDirectly) return 'validate'
  if (item.automationMode === 'automatic') return 'automate'
  return 'execute'
}

function confidenceFor(item: OperationsWorkbenchItem): WorkSituationConfidence {
  if (item.source === 'automation_run' || item.sourceType === 'planning_conflict') return 'high'
  if (item.sourceType === 'inactive_project' || item.sourceType === 'risk_followup') return 'low'
  return 'medium'
}

function priorityFor(item: OperationsWorkbenchItem, kind: WorkSituationKind, confidence: WorkSituationConfidence) {
  const recoveryBoost = kind === 'recover' ? 20 : 0
  const validationBoost = kind === 'validate' ? 12 : 0
  const deadlineBoost = item.appointmentId ? 10 : 0
  const blockingBoost = new Set(['planning_conflict', 'schedule_intervention', 'appointment_change_requested']).has(item.sourceType || '') ? 8 : 0
  const uncertaintyPenalty = confidence === 'low' ? 18 : confidence === 'medium' ? 6 : 0
  return item.score + recoveryBoost + validationBoost + deadlineBoost + blockingBoost - uncertaintyPenalty
}

function contextFor(item: OperationsWorkbenchItem): WorkSituation['projectContext'] | undefined {
  const projectTitle = item.projectTitle || item.entityLabel || undefined
  const clientName = item.clientName || undefined
  if (!item.projectId && !projectTitle && !clientName) return undefined
  return { projectId: item.projectId || undefined, projectTitle, clientName }
}

export function deriveWorkSituations(operationsCenter: TasksWorkspaceData | null): WorkSituation[] {
  const workbench = operationsCenter?.workbench
  if (!workbench) return []

  const seen = new Set<string>()
  return [
    ...workbench.waitingForApproval,
    ...workbench.todayActions,
    ...workbench.needsAttention,
  ].flatMap((item) => {
    if (seen.has(item.id) || !item.primaryActionRoute) return []
    seen.add(item.id)
    const kind = kindFor(item)
    const confidence = confidenceFor(item)
    const primaryAction = actionFor(item)
    if (!primaryAction) return []

    return [{
      id: item.id,
      kind,
      observedFacts: [item.description || item.title],
      understanding: understandingBySource[item.sourceType || ''] || item.description || 'Kadria a détecté une action à poursuivre.',
      importance: item.reason || 'Cette situation demande une décision.',
      consequence: consequenceBySource[item.sourceType || ''],
      recommendation: kind === 'recover'
        ? 'Je vous recommande de reprendre cette action avant qu’elle ne bloque la suite.'
        : kind === 'validate'
          ? 'Kadria a préparé cette action et attend votre décision explicite.'
          : `Je vous recommande de ${primaryAction.label.charAt(0).toLowerCase()}${primaryAction.label.slice(1)}.`,
      confidence,
      sourceUpdatedAt: item.dateLabel || undefined,
      projectContext: contextFor(item),
      primaryAction,
      secondaryAction: actionFor(item, true),
      canBeAutomated: item.automationMode === 'manual',
      automationExplanation: item.automationMode === 'manual' ? 'Cette action peut être automatisée après configuration et autorisation.' : undefined,
      priorityScore: priorityFor(item, kind, confidence),
    }]
  })
}

export function prioritizeWorkSituations(situations: WorkSituation[], limit = 3) {
  return [...situations]
    .sort((left, right) => right.priorityScore - left.priorityScore || left.id.localeCompare(right.id))
    .slice(0, limit)
}

export function deriveWorkCalmState(loadState: OperationsLoadState, operationsCenter: TasksWorkspaceData | null, situations: WorkSituation[]): WorkCalmState {
  if (loadState === 'loading') return { kind: 'loading', message: 'Je termine de vérifier les actions, validations et automatisations en attente.' }
  if (loadState === 'error' || !operationsCenter?.workbench || operationsCenter.dataQuality?.isComplete === false) {
    const sources = operationsCenter?.dataQuality?.unavailableSources || []
    const sourceLabel = sources.length ? ` Source concernée : ${sources.join(', ')}.` : ''
    return { kind: 'insufficient', message: `Certaines données n’ont pas pu être vérifiées. Je ne peux pas confirmer que tout est sous contrôle.${sourceLabel}` }
  }
  if (situations.length === 0) return { kind: 'calm', message: 'Tout ce qui devait être traité aujourd’hui est terminé. Aucune validation ni intervention bloquante n’est actuellement identifiée.' }
  if (situations.length === 1) return { kind: 'active', message: 'Une action nécessite votre décision maintenant.' }
  return { kind: 'active', message: `${situations.length} actions nécessitent votre décision maintenant.` }
}

import type { Project } from '@/src/components/ArtisanDashboard'
import type { OperationsCenterResult, RecommendationItem } from '@/src/lib/recommendations'

export type CommercialSituationKind =
  | 'prepare_quote'
  | 'follow_quote'
  | 'relance'
  | 'confirm_interest'
  | 'complete_before_quote'
  | 'recover_inactive'
  | 'close_won'
  | 'close_lost'
  | 'observe'

export type CommercialSituation = {
  id: string
  projectId: string
  projectTitle?: string
  clientName?: string
  kind: CommercialSituationKind
  observedFacts: string[]
  understanding: string
  importance: string
  consequence?: string
  recommendation?: string
  confidence: 'high' | 'medium' | 'low'
  missingInformation?: string[]
  amount?: { value: number; origin: 'quote' | 'declared_budget' | 'estimated' }
  deadline?: string
  sourceUpdatedAt?: string
  primaryAction?: { label: string; actionKey: string; target?: string }
  secondaryAction?: { label: string; actionKey: string; target?: string }
  priorityScore: number
}

export type CommercialCalmState =
  | { kind: 'loading'; message: string }
  | { kind: 'insufficient'; message: string }
  | { kind: 'calm'; message: string }
  | { kind: 'active'; message: string }

export type CommercialLoadState = 'loading' | 'ready' | 'error'

function daysSince(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000)) : null
}

function parseBudget(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const values = value.match(/\d+[\s\d]*/g)?.map((part) => Number.parseInt(part.replace(/\s/g, ''), 10)).filter(Number.isFinite) || []
  return values.length ? Math.max(...values) : null
}

function projectLabel(project: Project) {
  return project.projectType || project.trade || 'Dossier commercial'
}

function clientLabel(project: Project) {
  return [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || undefined
}

function amountFor(project: Project): CommercialSituation['amount'] | undefined {
  const quote = Number(project.devisAmount)
  if (Number.isFinite(quote) && quote > 0) return { value: quote, origin: 'quote' }
  const budget = parseBudget(project.budget)
  return budget ? { value: budget, origin: 'declared_budget' } : undefined
}

function actionFor(kind: CommercialSituationKind, project: Project, recommendation?: RecommendationItem): CommercialSituation['primaryAction'] {
  const labels: Record<CommercialSituationKind, string> = {
    prepare_quote: 'Préparer le devis',
    follow_quote: 'Préparer la relance',
    relance: 'Planifier un appel',
    confirm_interest: 'Confirmer l’intérêt',
    complete_before_quote: 'Compléter avant chiffrage',
    recover_inactive: 'Examiner le dossier inactif',
    close_won: 'Marquer gagné',
    close_lost: 'Marquer perdu',
    observe: 'Approfondir le dossier',
  }
  const focusByKind: Record<CommercialSituationKind, string> = {
    prepare_quote: 'quote_create', follow_quote: 'quote_followup', relance: 'callback', confirm_interest: 'qualification',
    complete_before_quote: 'completion', recover_inactive: 'commercial', close_won: 'commercial', close_lost: 'commercial', observe: 'commercial',
  }
  return {
    label: labels[kind],
    actionKey: recommendation?.actionType || 'open_project',
    target: recommendation?.actionRoute || `/dashboard-v2/projet/${project.id}?focus=${focusByKind[kind]}`,
  }
}

function kindFor(project: Project, recommendation?: RecommendationItem): CommercialSituationKind {
  switch (recommendation?.type) {
    case 'prepare_quote': return 'prepare_quote'
    case 'follow_up_quote':
    case 'risk_followup': return 'follow_quote'
    case 'set_callback': return 'relance'
    case 'complete_information': return 'complete_before_quote'
    case 'inactive_project': return 'recover_inactive'
  }
  if (project.quoteSentAt && !project.acceptedAt) return Number(project.opensCount || 0) >= 2 ? 'confirm_interest' : 'follow_quote'
  if (Number(project.completenessScore || 0) < 100) return 'complete_before_quote'
  return 'prepare_quote'
}

function confidenceFor(kind: CommercialSituationKind, project: Project) {
  if (kind === 'follow_quote' && project.quoteSentAt) return 'high' as const
  if (kind === 'complete_before_quote') return 'high' as const
  if (kind === 'recover_inactive') return 'medium' as const
  return project.updatedAt || project.createdAt ? 'medium' as const : 'low' as const
}

function wordingFor(kind: CommercialSituationKind, project: Project, recommendation?: RecommendationItem) {
  const quoteDays = daysSince(project.quoteSentAt)
  const inactiveDays = daysSince(project.lastInteractionAt || project.lastFollowUpAt || project.updatedAt)
  const incomplete = Number(project.completenessScore || 0) < 100
  if (kind === 'follow_quote') {
    const fact = quoteDays === null ? 'Un devis a été envoyé et aucune réponse n’est enregistrée.' : `Le devis est envoyé depuis ${quoteDays} jour${quoteDays > 1 ? 's' : ''} sans réponse enregistrée.`
    return { facts: [fact], understanding: 'La situation semble indiquer que le client n’a pas encore pris de décision.', importance: 'Une reprise de contact peut préserver la dynamique commerciale.', consequence: 'Sans reprise de contact, le dossier risque de se refroidir davantage.', recommendation: 'Je vous recommande de préparer une relance adaptée.', deadline: quoteDays !== null && quoteDays >= 10 ? 'À traiter aujourd’hui' : undefined }
  }
  if (kind === 'complete_before_quote') {
    const fact = incomplete ? 'Le dossier ne contient pas encore toutes les informations nécessaires au chiffrage.' : recommendation?.description || 'Des informations doivent être vérifiées avant de poursuivre.'
    return { facts: [fact], understanding: 'Je ne dispose pas encore d’assez d’éléments pour chiffrer ce dossier de façon fiable.', importance: 'Le chiffrage ne doit pas reposer sur des informations incomplètes.', consequence: 'Une estimation imprécise peut entraîner un devis inadapté.', recommendation: 'Je vous recommande de compléter les éléments manquants avant le chiffrage.', missing: ['Informations de qualification'] }
  }
  if (kind === 'confirm_interest') {
    const opens = Number(project.opensCount || 0)
    return { facts: [`Le devis a été consulté ${opens} fois depuis son envoi.`], understanding: 'Le client consulte encore votre proposition ; cela ne permet pas de conclure qu’il est prêt à accepter.', importance: 'Une décision commerciale peut se rapprocher, mais la situation mérite encore d’être observée.', recommendation: 'Je vous recommande de confirmer l’intérêt avant de relancer.', deadline: undefined }
  }
  if (kind === 'recover_inactive') {
    const fact = inactiveDays === null ? 'Aucune activité datée n’est disponible sur ce dossier.' : `Aucune activité commerciale n’est enregistrée depuis ${inactiveDays} jour${inactiveDays > 1 ? 's' : ''}.`
    return { facts: [fact], understanding: 'L’absence d’activité enregistrée peut indiquer que le dossier ralentit, sans confirmer un abandon.', importance: 'Ce dossier mérite une vérification avant de perdre en dynamique.', consequence: 'Sans vérification, une opportunité encore active peut rester sans suite.', recommendation: 'Je vous recommande d’examiner le dossier et de décider de la prochaine étape.' }
  }
  if (kind === 'relance') {
    return { facts: [recommendation?.description || 'Le dossier est qualifié, mais aucun rappel n’est planifié.'], understanding: 'La prochaine reprise de contact n’est pas encore sécurisée.', importance: 'Sans rappel défini, la décision commerciale risque d’être oubliée.', consequence: 'Le dossier peut rester sans suite claire.', recommendation: 'Je vous recommande de planifier un appel.' }
  }
  return { facts: [recommendation?.description || 'Le dossier présente les éléments nécessaires pour avancer commercialement.'], understanding: 'Les informations disponibles permettent de préparer une proposition.', importance: 'Cette opportunité peut avancer sans attendre davantage.', consequence: 'Sans proposition, le client ne peut pas prendre de décision.', recommendation: 'Je vous recommande de préparer le devis.' }
}

function priorityFor(situation: Omit<CommercialSituation, 'priorityScore'>) {
  const consequenceWeight: Record<CommercialSituationKind, number> = { follow_quote: 36, recover_inactive: 30, prepare_quote: 28, relance: 26, complete_before_quote: 22, confirm_interest: 20, close_won: 18, close_lost: 16, observe: 8 }
  const deadlineWeight = situation.deadline ? 22 : 0
  const impact = situation.amount ? Math.min(24, Math.round(situation.amount.value / 1_000)) : 0
  const maturity = ['follow_quote', 'prepare_quote', 'relance'].includes(situation.kind) ? 18 : 10
  const sourceAge = daysSince(situation.sourceUpdatedAt) || 0
  const actionability = situation.primaryAction ? 12 : 0
  const uncertaintyPenalty = situation.confidence === 'low' ? 20 : situation.confidence === 'medium' ? 7 : 0
  return consequenceWeight[situation.kind] + deadlineWeight + impact + maturity + Math.min(sourceAge, 12) + actionability - uncertaintyPenalty
}

export function deriveCommercialSituations(projects: Project[], operationsCenter: OperationsCenterResult | null): CommercialSituation[] {
  const commercialRecommendations = operationsCenter?.recommendations.filter((item) =>
    item.entityType === 'project' && (item.category === 'Commercial' || item.category === 'Devis'),
  ) || []

  return projects
    .filter((project) => project.id && project.leadStatus !== 'archived' && project.status !== 'Gagné' && project.status !== 'Perdu' && !project.acceptedAt)
    .flatMap((project) => {
      const recommendations = commercialRecommendations.filter((item) => item.entityId === project.id)
      const candidates = recommendations.length ? recommendations : [undefined]
      return candidates.map((recommendation) => {
        const kind = kindFor(project, recommendation)
        const wording = wordingFor(kind, project, recommendation)
        const base = {
          id: recommendation?.id || `commercial-${project.id}-${kind}`,
          projectId: project.id,
          projectTitle: projectLabel(project),
          clientName: clientLabel(project),
          kind,
          observedFacts: wording.facts,
          understanding: wording.understanding,
          importance: wording.importance,
          consequence: wording.consequence,
          recommendation: wording.recommendation,
          confidence: confidenceFor(kind, project),
          missingInformation: wording.missing,
          amount: amountFor(project),
          deadline: wording.deadline,
          sourceUpdatedAt: recommendation?.createdAt || project.lastInteractionAt || project.lastFollowUpAt || project.updatedAt || project.createdAt,
          primaryAction: actionFor(kind, project, recommendation),
        }
        return { ...base, priorityScore: priorityFor(base) }
      })
    })
}

export function deduplicateCommercialSituations(situations: CommercialSituation[]) {
  const byProject = new Map<string, CommercialSituation>()
  for (const situation of situations) {
    const current = byProject.get(situation.projectId)
    if (!current || situation.priorityScore > current.priorityScore || (situation.priorityScore === current.priorityScore && situation.id.localeCompare(current.id) < 0)) byProject.set(situation.projectId, situation)
  }
  return Array.from(byProject.values())
}

export function prioritizeCommercialSituations(situations: CommercialSituation[], limit = 3) {
  return [...situations].sort((left, right) => right.priorityScore - left.priorityScore || left.id.localeCompare(right.id)).slice(0, limit)
}

export function deriveCommercialCalmState(loadState: CommercialLoadState, operationsCenter: OperationsCenterResult | null, situations: CommercialSituation[]): CommercialCalmState {
  if (loadState === 'loading') return { kind: 'loading', message: 'Je termine de vérifier vos opportunités et vos devis.' }
  if (loadState === 'error' || !operationsCenter || operationsCenter.dataQuality?.isComplete === false) {
    const sources = operationsCenter?.dataQuality?.unavailableSources || []
    return { kind: 'insufficient', message: `Je ne dispose pas encore d’assez d’informations à jour pour confirmer la situation commerciale.${sources.length ? ` Source concernée : ${sources.join(', ')}.` : ''}` }
  }
  if (!situations.length) return { kind: 'calm', message: 'Aucune décision commerciale importante n’est nécessaire aujourd’hui. Les opportunités actives progressent normalement d’après les données disponibles.' }
  return { kind: 'active', message: situations.length === 1 ? 'Une opportunité mérite une décision aujourd’hui.' : `${situations.length} opportunités méritent une décision aujourd’hui.` }
}

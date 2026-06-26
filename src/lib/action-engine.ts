// Action Engine — moteur de decision central de Kadria (V1).
//
// Calcule, pour un projet donne, la meilleure action a effectuer maintenant.
// Logique deterministe, sans IA generative, sans appel reseau : uniquement
// des regles TypeScript pures appliquees aux donnees deja disponibles sur le
// projet. Ne remplace pas project-scoring.ts (analyse commerciale / score de
// temperature) ni les statuts projet existants : c'est une couche
// complementaire, pensee pour etre reutilisee par le dashboard, la fiche
// projet, le mobile, les notifications et le pipeline.
//
// Regle absolue : ne jamais inventer de donnees. Si un signal n'est pas
// disponible, il est simplement absent du calcul (jamais simule).

export type ActionPriority = 'low' | 'medium' | 'high' | 'critical'
export type ActionUrgency = 'none' | 'soon' | 'today' | 'overdue'
export type ActionImpact = 'low' | 'medium' | 'high'
export type ActionConfidence = 'low' | 'medium' | 'high'

export type ActionType =
  | 'complete_qualification'
  | 'request_photos'
  | 'schedule_appointment'
  | 'send_quote'
  | 'follow_up_quote'
  | 'schedule_intervention'
  | 'ask_review'
  | 'monitor'

export interface NextAction {
  title: string
  subtitle: string
  description: string
  priority: ActionPriority
  urgency: ActionUrgency
  estimatedDuration: string
  impact: ActionImpact
  actionType: ActionType
  blockingReasons: string[]
  maturityScore: number
  confidence: ActionConfidence
}

// Reprend uniquement les champs reellement disponibles sur un projet/devis/
// rendez-vous Supabase deja charges par la fiche projet (cf.
// app/dashboard-v2/projet/[id]/page.tsx). Tous les champs sont optionnels :
// l'absence d'un signal n'est jamais comblee par une valeur inventee.
export interface ActionEngineProjectInput {
  status?: string
  clientName?: string
  clientFirstName?: string
  clientPhone?: string
  clientEmail?: string
  trade?: string
  projectType?: string
  aiSummary?: string
  description?: string
  details?: string
  tradeAnswers?: unknown
  budget?: string
  desiredTimeline?: string
  city?: string
  siteAddress?: string
  photos?: unknown[]
  completenessScore?: number
  appointment?: {
    start: string
  } | null
  latestDevis?: {
    sent?: boolean
    accepted?: boolean
    declined?: boolean
    sentAt?: string | null
  } | null
}

function hasText(value: string | undefined | null): boolean {
  return !!value && value.trim().length > 0
}

function isVague(value: string | undefined | null): boolean {
  if (!hasText(value)) return true
  const text = value!.toLowerCase()
  return (
    text.includes('sais pas') ||
    text.includes('ne sait pas') ||
    text.includes('non renseigne') ||
    text.includes('non renseigné') ||
    text.includes('a definir') ||
    text.includes('à définir')
  )
}

function hasTradeAnswers(tradeAnswers: unknown): boolean {
  if (!tradeAnswers) return false
  if (Array.isArray(tradeAnswers)) return tradeAnswers.length > 0
  if (typeof tradeAnswers === 'string') {
    const trimmed = tradeAnswers.trim()
    return trimmed.length > 0 && trimmed !== '[]'
  }
  return false
}

// Mots-cles indiquant qu'une visite/photo serait utile pour qualifier le
// chantier (fuite, panne, degat...). Volontairement limite a des signaux
// explicites presents dans le texte projet : en l'absence de ces mots-cles,
// on ne suppose jamais qu'une photo est necessaire.
const VISUAL_DIAGNOSIS_KEYWORDS = [
  'fuite', 'infiltration', 'degat', 'dégât', 'fissure', 'casse', 'cassé',
  'panne', 'humidite', 'humidité', 'moisissure', 'effondrement', 'deformation',
  'déformation', 'tache', 'fuite d\'eau',
]

function isUrgentTimeline(timeline?: string): boolean {
  if (!hasText(timeline)) return false
  const text = timeline!.toLowerCase()
  return (
    text.includes('urgent') ||
    text.includes('au plus vite') ||
    text.includes('1 mois') ||
    text.includes('immediat') ||
    text.includes('immédiat')
  )
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function daysSince(dateValue: string | null | undefined, now: Date): number | null {
  if (!hasText(dateValue)) return null
  const parsed = new Date(dateValue as string)
  if (Number.isNaN(parsed.getTime())) return null
  const diffMs = now.getTime() - parsed.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

const ESTIMATED_DURATION_BY_ACTION: Record<ActionType, string> = {
  complete_qualification: '5 min',
  request_photos: '2 min',
  schedule_appointment: '5 min',
  send_quote: '15 min',
  follow_up_quote: '3 min',
  schedule_intervention: '10 min',
  ask_review: '2 min',
  monitor: '1 min',
}

const IMPACT_BY_ACTION: Record<ActionType, ActionImpact> = {
  complete_qualification: 'medium',
  request_photos: 'medium',
  schedule_appointment: 'medium',
  send_quote: 'high',
  follow_up_quote: 'high',
  schedule_intervention: 'high',
  ask_review: 'low',
  monitor: 'low',
}

// computeNextAction(project, now?) : `now` est optionnel (defaut : date
// actuelle) — expose uniquement pour permettre des tests deterministes,
// jamais pour inventer un signal projet.
export function computeNextAction(project: ActionEngineProjectInput, now: Date = new Date()): NextAction {
  const hasPhone = hasText(project.clientPhone)
  const hasEmail = hasText(project.clientEmail)
  const hasContact = hasPhone || hasEmail
  const hasLocation = hasText(project.city) || hasText(project.siteAddress)
  const hasProjectType = hasText(project.projectType) || hasText(project.trade)
  const hasNeedDescribed =
    hasText(project.aiSummary) ||
    hasText(project.description) ||
    hasText(project.details) ||
    hasTradeAnswers(project.tradeAnswers) ||
    hasProjectType
  const budgetKnown = hasText(project.budget) && !isVague(project.budget)
  const timelineKnown = hasText(project.desiredTimeline) && !isVague(project.desiredTimeline)
  const hasPhotos = !!(project.photos && project.photos.length > 0)
  const hasAppointment = !!project.appointment
  const completeness = Number(project.completenessScore) || 0

  const devis = project.latestDevis || null
  const devisExists = !!devis
  const devisSent = !!devis?.sent
  const devisAccepted = !!devis?.accepted
  const devisDeclined = !!devis?.declined
  const daysSinceSent = devis ? daysSince(devis.sentAt, now) : null

  const projectText = [project.trade, project.projectType, project.aiSummary, project.description, project.details]
    .filter(hasText)
    .join(' ')
    .toLowerCase()
  const seemsToNeedPhotos = VISUAL_DIAGNOSIS_KEYWORDS.some((keyword) => projectText.includes(keyword))

  const qualificationComplete = hasContact && hasNeedDescribed && hasLocation

  // -- Score de maturite (0-100), explicable, base sur des criteres additifs.
  // Ne remplace pas les statuts existants ni completenessScore : c'est un
  // signal complementaire propre a l'Action Engine.
  let maturityScore = 0
  if (hasNeedDescribed) maturityScore += 15
  if (hasContact) maturityScore += 15
  if (hasLocation) maturityScore += 10
  if (budgetKnown) maturityScore += 15
  if (timelineKnown) maturityScore += 10
  if (hasPhotos) maturityScore += 10
  if (hasAppointment) maturityScore += 10
  if (devisExists || devisSent) maturityScore += 15
  // Le completenessScore existant (si present) est un signal additionnel
  // leger, jamais la seule source de verite.
  maturityScore = clampScore(maturityScore * 0.9 + completeness * 0.1)

  const blockingReasons: string[] = []
  if (!hasContact) blockingReasons.push('Coordonnées client manquantes')
  if (!budgetKnown) blockingReasons.push('Budget absent')
  if (!hasPhotos && seemsToNeedPhotos) blockingReasons.push('Photos absentes')
  if (!hasAppointment && qualificationComplete && !devisExists) blockingReasons.push('Rendez-vous non planifié')
  if (devisExists && !devisSent) blockingReasons.push('Devis non envoyé')
  if (devisSent && !devisAccepted && !devisDeclined) blockingReasons.push('Réponse client en attente')

  const dataPointsKnown = [hasContact, hasLocation, hasNeedDescribed, budgetKnown, timelineKnown, hasPhotos].filter(Boolean).length
  const confidence: ActionConfidence = dataPointsKnown >= 5 ? 'high' : dataPointsKnown >= 3 ? 'medium' : 'low'

  function buildAction(params: {
    actionType: ActionType
    title: string
    subtitle: string
    description: string
    priority: ActionPriority
    urgency: ActionUrgency
  }): NextAction {
    return {
      title: params.title,
      subtitle: params.subtitle,
      description: params.description,
      priority: params.priority,
      urgency: params.urgency,
      estimatedDuration: ESTIMATED_DURATION_BY_ACTION[params.actionType],
      impact: IMPACT_BY_ACTION[params.actionType],
      actionType: params.actionType,
      blockingReasons,
      maturityScore,
      confidence,
    }
  }

  // -- Dossier clos (Gagné/Perdu) : on ne pousse plus d'action commerciale,
  // seul un signal de cloture restant (avis client) a du sens, et seulement
  // si le devis a bien ete accepte — jamais invente sur un statut "Perdu".
  if (project.status === 'Perdu') {
    return buildAction({
      actionType: 'monitor',
      title: 'Surveiller le dossier',
      subtitle: 'Dossier perdu',
      description: 'Le dossier est marqué comme perdu : aucune action commerciale recommandée pour le moment.',
      priority: 'low',
      urgency: 'none',
    })
  }

  if (project.status === 'Gagné' && devisAccepted) {
    return buildAction({
      actionType: 'ask_review',
      title: 'Demander un avis client',
      subtitle: 'Dossier gagné',
      description: 'Le devis est accepté et le dossier est gagné : pensez à solliciter un avis client.',
      priority: 'low',
      urgency: 'none',
    })
  }

  // 1. Qualification incomplete.
  if (!qualificationComplete) {
    const missing: string[] = []
    if (!hasContact) missing.push('coordonnées')
    if (!hasNeedDescribed) missing.push('besoin')
    if (!hasLocation) missing.push('localisation')
    return buildAction({
      actionType: 'complete_qualification',
      title: 'Compléter la qualification',
      subtitle: 'Informations clés manquantes',
      description: missing.length > 0
        ? `Des informations essentielles manquent encore : ${missing.join(', ')}.`
        : 'Des informations essentielles manquent encore pour qualifier ce dossier.',
      priority: 'high',
      urgency: 'soon',
    })
  }

  // 2. Photos manquantes alors que le besoin decrit suggere un diagnostic
  // visuel (fuite, panne, degat...).
  if (seemsToNeedPhotos && !hasPhotos) {
    return buildAction({
      actionType: 'request_photos',
      title: 'Demander des photos',
      subtitle: 'Diagnostic visuel utile',
      description: 'Le besoin décrit suggère qu\'une ou plusieurs photos aideraient à qualifier le chantier.',
      priority: 'medium',
      urgency: 'soon',
    })
  }

  // 3. Dossier qualifie sans rendez-vous ni devis.
  if (!hasAppointment && !devisExists) {
    return buildAction({
      actionType: 'schedule_appointment',
      title: 'Planifier un rendez-vous',
      subtitle: 'Dossier qualifié',
      description: 'Le dossier est suffisamment qualifié : planifiez un rendez-vous pour avancer.',
      priority: 'medium',
      urgency: timelineKnown && isUrgentTimeline(project.desiredTimeline) ? 'today' : 'soon',
    })
  }

  // 4. Rendez-vous passe ou dossier pret a chiffrer, sans devis.
  if (!devisExists) {
    return buildAction({
      actionType: 'send_quote',
      title: 'Envoyer le devis',
      subtitle: hasAppointment ? 'Rendez-vous planifié' : 'Dossier prêt à chiffrer',
      description: 'Le dossier est prêt à être chiffré : préparez et envoyez le devis.',
      priority: 'high',
      urgency: 'soon',
    })
  }

  // 5. Devis envoye sans reponse depuis plusieurs jours.
  if (devisSent && !devisAccepted && !devisDeclined) {
    const overdue = daysSinceSent !== null && daysSinceSent >= 5
    const dueSoon = daysSinceSent !== null && daysSinceSent >= 3
    return buildAction({
      actionType: 'follow_up_quote',
      title: 'Relancer le devis',
      subtitle: daysSinceSent !== null ? `Envoyé depuis ${daysSinceSent} jour${daysSinceSent > 1 ? 's' : ''}` : 'Devis envoyé',
      description: 'Le devis est envoyé mais aucune réponse n\'a encore été reçue.',
      priority: overdue ? 'critical' : 'high',
      urgency: overdue ? 'overdue' : dueSoon ? 'today' : 'soon',
    })
  }

  // 6. Devis accepte : preparer l'intervention.
  if (devisAccepted) {
    return buildAction({
      actionType: 'schedule_intervention',
      title: 'Programmer l\'intervention',
      subtitle: 'Devis accepté',
      description: 'Le devis est accepté : il ne reste plus qu\'à programmer l\'intervention.',
      priority: 'high',
      urgency: 'soon',
    })
  }

  // 7. Devis cree mais pas encore envoye (cas residuel, sans signal plus
  // specifique ci-dessus).
  if (devisExists && !devisSent) {
    return buildAction({
      actionType: 'send_quote',
      title: 'Envoyer le devis',
      subtitle: 'Devis en attente d\'envoi',
      description: 'Un devis existe pour ce dossier mais n\'a pas encore été envoyé.',
      priority: 'medium',
      urgency: 'soon',
    })
  }

  // 8. Aucun signal fort.
  return buildAction({
    actionType: 'monitor',
    title: 'Surveiller le dossier',
    subtitle: 'Aucune action prioritaire identifiée',
    description: 'Aucun signal fort ne ressort actuellement : le dossier ne nécessite pas d\'action immédiate.',
    priority: 'low',
    urgency: 'none',
  })
}

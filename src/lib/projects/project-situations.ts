export type ProjectSituation = {
  observedFacts: string[]
  understanding: string
  importance?: string
  possibleConsequence?: string
  preparation?: string[]
  risks?: string[]
  expectedOutcome?: string
  confidence?: 'high' | 'medium' | 'low'
  recommendation?: {
    label: string
    reason: string
    deadline?: string
    confidence?: 'high' | 'medium' | 'low'
  }
  primaryAction?: { label: string; target: string }
  secondaryAction?: { label: string; target: string }
  reassurance?: string
  missingInformation?: string[]
}

export type ProjectSituations = {
  action: ProjectSituation
  activity: ProjectSituation
  commercial: ProjectSituation
  qualification: ProjectSituation
  planning: ProjectSituation
  documents: ProjectSituation
  context: ProjectSituation
}

type Quote = {
  amount?: number | null
  accepted?: boolean | null
  declined?: boolean | null
  sent?: boolean | null
  quote_sent_at?: string | null
  accepted_at?: string | null
  opens_count?: number | null
  last_follow_up_at?: string | null
  decline_reason?: string | null
}

export type ProjectSituationInput = {
  project: {
    clientPhone?: string | null
    clientEmail?: string | null
    siteAddress?: string | null
    city?: string | null
    budget?: string | null
    desiredTimeline?: string | null
    trade?: string | null
    projectType?: string | null
    tradeAnswers?: unknown
    photos?: unknown[] | null
    depositStatus?: string | null
    depositAmount?: number | null
    depositPaidAt?: string | null
    clientUpdateCount?: number | null
    clientLastUpdateAt?: string | null
  }
  latestDevis?: Quote | null
  appointment?: { start?: string | null; location?: string | null; assignedUserName?: string | null } | null
  responsibleName?: string | null
  lifecycle: { stage?: string | null; recommendedAction?: { key?: string; title?: string; ctaLabel?: string; meta?: string; nextAction?: { confidence?: 'high' | 'medium' | 'low'; description?: string; urgency?: string; followUpAvailableAt?: string } } }
  activityItems?: Array<{ id?: string; title?: string; detail?: string; createdAt?: string; tone?: string; action?: string }>
  formatAmount: (amount?: number | null) => string
  formatDate: (value?: string | null, fallback?: string) => string
  formatDateTime: (value?: string | null, fallback?: string) => string
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function hasTradeAnswers(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  return Boolean(value && typeof value === 'object' && Object.keys(value).length > 0)
}

function hasDeposit(project: ProjectSituationInput['project']): boolean {
  return hasText(project.depositStatus) || typeof project.depositAmount === 'number' || hasText(project.depositPaidAt)
}

function actionTarget(key?: string): string {
  if (key === 'follow_up_quote') return 'follow_up_quote'
  if (key === 'request_deposit' || key === 'follow_up_deposit') return 'deposit'
  if (key === 'schedule_sales_appointment' || key === 'schedule_worksite') return 'planning'
  if (key === 'prepare_quote' || key === 'send_quote') return 'quote'
  if (key === 'reply_client') return 'activity'
  return 'qualification'
}

function actionLabel(target: string, fallback: string): string {
  if (!/^(voir|afficher|consulter)/i.test(fallback.trim())) return fallback
  if (target === 'quote') return 'Préparer le devis'
  if (target === 'deposit') return 'Demander l’acompte'
  if (target === 'planning') return 'Planifier la visite'
  if (target === 'qualification') return 'Compléter la qualification'
  if (target === 'documents') return 'Demander une photo'
  return 'Préparer la prochaine étape'
}

function getMissing(project: ProjectSituationInput['project']): string[] {
  const missing: string[] = []
  if (!hasText(project.clientPhone) && !hasText(project.clientEmail)) missing.push('un moyen de joindre le client')
  if (!hasText(project.siteAddress) && !hasText(project.city)) missing.push('le lieu du chantier')
  if (!hasText(project.trade) && !hasText(project.projectType) && !hasTradeAnswers(project.tradeAnswers)) missing.push('le besoin principal')
  if (!hasText(project.budget)) missing.push('le budget')
  if (!hasText(project.desiredTimeline)) missing.push('le délai souhaité')
  return missing
}

function deriveActionSituation(input: ProjectSituationInput): ProjectSituation {
  const { project, latestDevis, appointment, lifecycle } = input
  const action = lifecycle.recommendedAction || {}
  const nextAction = action.nextAction
  const facts: string[] = []
  if (latestDevis?.accepted) facts.push(`Le devis${typeof latestDevis.amount === 'number' ? ` de ${input.formatAmount(latestDevis.amount)}` : ''} a été accepté${latestDevis.accepted_at ? ` le ${input.formatDate(latestDevis.accepted_at)}` : ''}.`)
  else if (latestDevis?.declined) facts.push(`Le devis a été refusé${latestDevis.decline_reason ? ` : ${latestDevis.decline_reason}` : '.'}`)
  else if (latestDevis?.sent) facts.push(`Le devis a été envoyé${latestDevis.quote_sent_at ? ` le ${input.formatDate(latestDevis.quote_sent_at)}` : ''}.`)
  if (latestDevis?.sent && Number(latestDevis.opens_count) > 0) facts.push(`Le devis a été ouvert ${latestDevis.opens_count} fois.`)
  if (appointment?.start) facts.push(`Un rendez-vous est prévu le ${input.formatDateTime(appointment.start)}.`)
  if (latestDevis?.accepted && !hasDeposit(project)) facts.push('Aucun acompte n’est enregistré dans ce dossier.')
  if (!facts.length && getMissing(project).length) facts.push(`Il manque encore ${getMissing(project).join(', ')}.`)

  const isReassuring = action.key === 'monitor' || nextAction?.urgency === 'none'
  const recommendation = !isReassuring && action.title && action.ctaLabel
    ? { label: action.title, reason: nextAction?.description || action.meta || 'Cette action est la prochaine étape utile du dossier.', confidence: nextAction?.confidence }
    : undefined

  return {
    observedFacts: facts.length ? facts.slice(0, 2) : ['Aucun changement nécessitant une intervention n’est identifié dans les informations disponibles.'],
    understanding: action.meta || nextAction?.description || 'Les informations disponibles ne permettent pas de tirer une conclusion plus précise.',
    importance: nextAction?.description || (isReassuring ? 'Aucune décision ne mérite votre attention aujourd’hui.' : 'Cette situation mérite une décision avant de poursuivre le dossier.'),
    possibleConsequence: latestDevis?.accepted && !hasDeposit(project) ? 'Le chantier ne devrait pas être bloqué définitivement avant de sécuriser son règlement.' : undefined,
    recommendation,
    primaryAction: recommendation ? { label: actionLabel(actionTarget(action.key), action.ctaLabel!), target: actionTarget(action.key) } : undefined,
    secondaryAction: latestDevis ? { label: 'Voir le devis', target: 'quote' } : undefined,
    reassurance: isReassuring ? 'Aucune action n’est nécessaire pour le moment. Kadria continue de surveiller ce dossier.' : undefined,
    missingInformation: getMissing(project),
  }
}

function deriveCommercialSituation(input: ProjectSituationInput): ProjectSituation {
  const { latestDevis, project, lifecycle } = input
  if (!latestDevis) return {
    observedFacts: ['Aucun devis n’est encore enregistré dans ce dossier.'],
    understanding: 'La décision commerciale ne peut pas encore être suivie.',
    recommendation: lifecycle.recommendedAction?.ctaLabel ? { label: lifecycle.recommendedAction.title || 'Préparer le devis', reason: lifecycle.recommendedAction.meta || 'Le dossier doit être préparé avant toute décision commerciale.', confidence: lifecycle.recommendedAction.nextAction?.confidence } : undefined,
    primaryAction: lifecycle.recommendedAction?.ctaLabel ? { label: lifecycle.recommendedAction.ctaLabel, target: 'quote' } : undefined,
  }
  const facts = [`Le devis${typeof latestDevis.amount === 'number' ? ` de ${input.formatAmount(latestDevis.amount)}` : ''} est ${latestDevis.accepted ? 'accepté' : latestDevis.declined ? 'refusé' : latestDevis.sent ? 'envoyé' : 'en préparation'}.`]
  if (latestDevis.quote_sent_at) facts.push(`Il a été envoyé le ${input.formatDate(latestDevis.quote_sent_at)}.`)
  if (Number(latestDevis.opens_count) > 0) facts.push(`Il a été ouvert ${latestDevis.opens_count} fois.`)
  const acceptedWithoutDeposit = Boolean(latestDevis.accepted && !hasDeposit(project))
  const recommendation = lifecycle.recommendedAction?.ctaLabel && lifecycle.recommendedAction.key !== 'monitor'
    ? { label: lifecycle.recommendedAction.title || 'Poursuivre le dossier', reason: lifecycle.recommendedAction.meta || 'Cette étape correspond à la situation commerciale actuelle.', confidence: lifecycle.recommendedAction.nextAction?.confidence }
    : undefined
  return {
    observedFacts: facts.slice(0, 2),
    understanding: acceptedWithoutDeposit ? 'La décision commerciale est acquise, mais le chantier n’est pas encore sécurisé financièrement.' : lifecycle.recommendedAction?.meta || 'La situation commerciale est suivie à partir des informations disponibles.',
    importance: acceptedWithoutDeposit ? 'Un acompte permet de sécuriser le passage à la préparation du chantier.' : undefined,
    possibleConsequence: latestDevis.declined ? 'Aucune relance ne sera proposée pour ce devis refusé.' : undefined,
    recommendation,
    primaryAction: recommendation ? { label: lifecycle.recommendedAction!.ctaLabel!, target: actionTarget(lifecycle.recommendedAction?.key) } : undefined,
    reassurance: lifecycle.recommendedAction?.key === 'monitor' ? 'Il est encore trop tôt pour agir ; la situation reste sous surveillance.' : undefined,
    confidence: lifecycle.recommendedAction?.nextAction?.confidence,
  }
}

function deriveQualificationSituation(input: ProjectSituationInput): ProjectSituation {
  const { project, lifecycle } = input
  const missing = getMissing(project)
  const confirmed = [hasText(project.trade) || hasText(project.projectType) || hasTradeAnswers(project.tradeAnswers) ? 'le besoin principal' : null, hasText(project.siteAddress) || hasText(project.city) ? 'la localisation' : null, hasText(project.budget) ? 'le budget' : null, hasText(project.desiredTimeline) ? 'le délai souhaité' : null].filter(Boolean) as string[]
  const ready = missing.filter((item) => item !== 'le budget' && item !== 'le délai souhaité').length === 0
  return {
    observedFacts: confirmed.length ? [`Informations confirmées : ${confirmed.join(', ')}.`] : ['Les éléments essentiels du projet sont encore peu renseignés.'],
    understanding: ready ? 'Le dossier est prêt pour préparer la prochaine étape sans risque immédiat.' : 'Le dossier n’est pas encore prêt pour engager la suite avec assez de fiabilité.',
    importance: missing.length ? `Sans ces éléments, il faudrait ${lifecycle.recommendedAction?.key === 'prepare_quote' ? 'préparer le devis avec des réserves' : 'faire avancer le dossier en supposant ce qui manque'}.` : 'Les éléments essentiels sont réunis pour avancer sereinement.',
    recommendation: missing.length && lifecycle.recommendedAction?.ctaLabel ? { label: lifecycle.recommendedAction.title || 'Compléter le dossier', reason: `Il manque encore ${missing.join(', ')}.`, confidence: lifecycle.recommendedAction.nextAction?.confidence } : undefined,
    primaryAction: missing.length && lifecycle.recommendedAction?.ctaLabel ? { label: lifecycle.recommendedAction.ctaLabel, target: 'qualification' } : undefined,
    reassurance: ready ? 'Aucune information bloquante n’est identifiée dans les éléments disponibles.' : undefined,
    missingInformation: missing,
  }
}

function derivePlanningSituation(input: ProjectSituationInput): ProjectSituation {
  const { appointment, responsibleName, project, lifecycle } = input
  if (!appointment?.start) {
    const canPlan = getMissing(project).filter((item) => item === 'un moyen de joindre le client' || item === 'le lieu du chantier').length === 0
    return {
      observedFacts: ['Aucun rendez-vous n’est prévu.'],
      understanding: canPlan ? 'Le dossier contient les éléments minimums pour organiser un échange ou une visite.' : 'Un rendez-vous ne peut pas encore être organisé sereinement.',
      recommendation: canPlan && lifecycle.recommendedAction?.ctaLabel ? { label: 'Planifier le prochain échange', reason: 'Un engagement permettra de confirmer les derniers éléments utiles au dossier.', confidence: lifecycle.recommendedAction.nextAction?.confidence } : undefined,
      primaryAction: canPlan && lifecycle.recommendedAction?.ctaLabel ? { label: 'Planifier', target: 'planning' } : undefined,
      reassurance: !canPlan ? 'Kadria reste silencieux sur la planification tant que les coordonnées ou le lieu ne sont pas confirmés.' : undefined,
      missingInformation: canPlan ? [] : getMissing(project),
      preparation: canPlan ? ['Préparer les points à confirmer pendant l’échange.'] : undefined,
      risks: canPlan ? undefined : ['Un rendez-vous sans coordonnées ou lieu confirmé risque de devoir être déplacé.'],
      expectedOutcome: canPlan ? 'À l’issue de l’échange, les éléments utiles à la suite du dossier pourront être confirmés.' : undefined,
    }
  }
  const appointmentResponsible = responsibleName || appointment.assignedUserName
  return {
    observedFacts: [
      `Le prochain engagement est prévu le ${input.formatDateTime(appointment.start)}${appointment.location ? `, ${appointment.location}` : ''}.`,
      appointmentResponsible ? `${appointmentResponsible} est associé à ce rendez-vous.` : 'Le responsable de ce rendez-vous n’est pas encore défini.',
    ],
    understanding: 'Le dossier a un prochain engagement concret ; la suite dépendra de ce qui sera confirmé pendant ce rendez-vous.',
    importance: 'Les informations utiles doivent être disponibles avant le rendez-vous pour éviter de déplacer une décision importante.',
    possibleConsequence: 'Après le rendez-vous, la qualification ou la préparation du devis pourra être mise à jour.',
    preparation: ['Relire le besoin déjà renseigné.', 'Préparer les points qui restent à confirmer.'],
    risks: appointmentResponsible ? undefined : ['Le responsable du rendez-vous reste à définir.'],
    expectedOutcome: 'À l’issue du rendez-vous, Kadria pourra confirmer la qualification ou préparer la prochaine décision.',
    reassurance: 'Aucun autre engagement n’est proposé tant que celui-ci reste le prochain élément déterminant.',
  }
}

function deriveDocumentsSituation(input: ProjectSituationInput): ProjectSituation {
  const photos = Array.isArray(input.project.photos) ? input.project.photos.filter(Boolean) : []
  const needsPhotos = input.lifecycle.recommendedAction?.key === 'complete_project' && photos.length === 0
  return {
    observedFacts: photos.length ? [`${photos.length} photo${photos.length > 1 ? 's sont disponibles' : ' est disponible'} pour comprendre le chantier.`] : ['Aucun document visuel n’est enregistré dans ce dossier.'],
    understanding: photos.length ? 'Les documents disponibles peuvent servir de preuve ou de préparation ; ils ne suffisent pas à eux seuls à conclure au-delà de ce qu’ils montrent.' : needsPhotos ? 'Des documents visuels pourraient réduire l’incertitude avant la prochaine décision.' : 'Aucun document complémentaire n’est nécessaire pour le moment au regard des informations disponibles.',
    importance: needsPhotos ? 'Une photo peut aider à limiter les réserves avant le devis ou la visite.' : undefined,
    recommendation: needsPhotos ? { label: 'Demander une photo', reason: 'Le dossier manque de preuve visuelle pour préciser la situation.', confidence: input.lifecycle.recommendedAction?.nextAction?.confidence } : undefined,
    primaryAction: needsPhotos ? { label: 'Demander une photo', target: 'documents' } : undefined,
    reassurance: !needsPhotos ? 'Aucun document supplémentaire n’est demandé sans raison identifiée.' : undefined,
    preparation: photos.length ? ['Ces documents peuvent confirmer ce qui est visible sur le chantier.'] : needsPhotos ? ['Une photo du point concerné permettrait de réduire l’incertitude.'] : undefined,
    expectedOutcome: photos.length ? 'Les éléments visibles pourront être pris en compte avec les autres informations du dossier.' : undefined,
  }
}

function deriveActivitySituation(input: ProjectSituationInput): ProjectSituation {
  const important = (input.activityItems || []).filter((item) => item.tone === 'error' || item.tone === 'success' || String(item.action || '').includes('DEVIS')).slice(0, 3)
  if (!important.length) return { observedFacts: ['Aucun changement significatif n’est remonté dans l’activité récente.'], understanding: 'La situation du dossier n’a pas évolué de façon à modifier une décision.', reassurance: 'L’historique détaillé reste disponible si vous souhaitez le consulter.' }
  return { observedFacts: important.map((item) => item.detail || item.title || 'Un changement significatif a été enregistré.').filter(Boolean), understanding: 'Ces événements sont affichés car ils peuvent modifier la compréhension ou la prochaine décision du dossier.', importance: 'Les événements secondaires restent consultables dans l’historique détaillé.' }
}

export function deriveProjectSituations(input: ProjectSituationInput): ProjectSituations {
  const action = deriveActionSituation(input)
  return {
    action,
    activity: deriveActivitySituation(input),
    commercial: deriveCommercialSituation(input),
    qualification: deriveQualificationSituation(input),
    planning: derivePlanningSituation(input),
    documents: deriveDocumentsSituation(input),
    context: { observedFacts: action.observedFacts.slice(0, 1), understanding: action.understanding, reassurance: action.reassurance, missingInformation: action.missingInformation },
  }
}

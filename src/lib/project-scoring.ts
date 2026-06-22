// Source unique de l'analyse commerciale IA affichee sur la fiche projet
// (bloc "Analyse Kadria") et dans la vue "Opportunites prioritaires". Toute
// logique de score/temperature/recommandation doit passer par
// getProjectCommercialAnalysis() plutot que d'etre reimplementee localement
// dans un composant (cf. l'ancien getVerdict/getRecommendation de
// app/dashboard-v2/projet/[id]/page.tsx, desormais delegues a ce module).

export type Temperature = 'hot' | 'warm' | 'cold'
export type Priority = 'high' | 'medium' | 'low'
export type Confidence = 'high' | 'medium' | 'low'
export type NextActionType = 'call' | 'quote' | 'followup' | 'ask_info' | 'archive' | 'wait'

export interface NextBestAction {
  type: NextActionType
  label: string
  reason: string
}

export interface ProjectCommercialAnalysis {
  score: number
  temperature: Temperature
  temperatureLabel: 'Chaud' | 'Tiède' | 'Froid'
  priority: Priority
  recommendation: string
  nextBestAction: NextBestAction
  strengths: string[]
  weaknesses: string[]
  missingInfo: string[]
  riskFlags: string[]
  confidence: Confidence
}

// Reprend uniquement les champs reellement disponibles sur un projet Supabase
// (cf. SupabaseProject dans src/lib/supabase/mapping.ts) plus, en option, le
// statut du dernier devis associe -- ces deux sources sont deja chargees
// separement sur la fiche projet (project / devisList[0]).
export interface ProjectAnalysisInput {
  status?: string
  clientName?: string
  clientFirstName?: string
  clientPhone?: string
  clientEmail?: string
  trade?: string
  projectType?: string
  budget?: string
  desiredTimeline?: string
  maturity?: string
  city?: string
  siteAddress?: string
  aiSummary?: string
  completenessScore?: number
  photos?: unknown[]
  source?: string
  latestDevis?: {
    sent?: boolean
    accepted?: boolean
    declined?: boolean
    declineReason?: string | null
    opensCount?: number
    lastFollowUpAt?: string | null
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

function parseBudgetValue(budget?: string): number {
  if (!hasText(budget)) return 0
  const matches = budget!.match(/\d+[\s\d]*/g)
  if (!matches) return 0
  const values = matches
    .map((value) => Number.parseInt(value.replace(/\s/g, ''), 10))
    .filter((value) => Number.isFinite(value) && value > 0)
  return values.length ? Math.max(...values) : 0
}

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

function isReadyMaturity(maturity?: string): boolean {
  if (!hasText(maturity)) return false
  const text = maturity!.toLowerCase()
  return text.includes('pret') || text.includes('prêt') || text.includes('urgent')
}

function isLowMaturity(maturity?: string): boolean {
  if (!hasText(maturity)) return false
  const text = maturity!.toLowerCase()
  return text.includes('renseigne') || text.includes('compare') || text.includes('comparer')
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function isClosedStatus(status?: string): boolean {
  return status === 'Gagné' || status === 'Perdu'
}

export function getProjectCommercialAnalysis(project: ProjectAnalysisInput): ProjectCommercialAnalysis {
  const status = project.status || ''
  const devis = project.latestDevis || null

  // Dossier gagne ou perdu : pas de scoring commercial agressif, l'analyse
  // se contente de refleter l'etat du dossier.
  if (status === 'Gagné') {
    return {
      score: 100,
      temperature: 'hot',
      temperatureLabel: 'Chaud',
      priority: 'low',
      recommendation: 'Le devis est accepté, le dossier est gagné.',
      nextBestAction: {
        type: 'wait',
        label: 'Planifier le chantier',
        reason: 'Le devis est accepté, le dossier est gagné.',
      },
      strengths: ['Devis accepté', 'Chantier à planifier'],
      weaknesses: [],
      missingInfo: [],
      riskFlags: [],
      confidence: 'high',
    }
  }

  if (status === 'Perdu') {
    const reason = devis?.declineReason || undefined
    return {
      score: 0,
      temperature: 'cold',
      temperatureLabel: 'Froid',
      priority: 'low',
      recommendation: reason
        ? `Le prospect a refusé le devis (motif : ${reason}). Le retour peut aider à ajuster l'offre ou clôturer le dossier.`
        : "Le dossier est marqué comme perdu. Le retour prospect peut aider à ajuster l'offre ou clôturer le dossier.",
      nextBestAction: {
        type: 'archive',
        label: 'Analyser le motif du refus',
        reason: 'Le retour prospect peut aider à ajuster l\'offre ou clôturer le dossier.',
      },
      strengths: [],
      weaknesses: reason ? [`Motif du refus : ${reason}`] : ['Dossier perdu'],
      missingInfo: [],
      riskFlags: ['Dossier perdu'],
      confidence: 'high',
    }
  }

  const strengths: string[] = []
  const weaknesses: string[] = []
  const missingInfo: string[] = []
  const riskFlags: string[] = []

  const hasPhone = hasText(project.clientPhone)
  const hasEmail = hasText(project.clientEmail)
  const hasCity = hasText(project.city) || hasText(project.siteAddress)
  const hasProjectType = hasText(project.projectType) || hasText(project.trade)
  const hasDescription = hasText(project.aiSummary) && project.aiSummary!.trim().length >= 25
  const budgetValue = parseBudgetValue(project.budget)
  const budgetKnown = hasText(project.budget) && !isVague(project.budget)
  const timelineKnown = hasText(project.desiredTimeline) && !isVague(project.desiredTimeline)
  const hasPhotos = !!(project.photos && project.photos.length > 0)
  const ready = isReadyMaturity(project.maturity)
  const lowMaturity = isLowMaturity(project.maturity)
  const completeness = Number(project.completenessScore) || 0

  // -- Score deterministe (0-100), construit par signaux additifs.
  let score = 0
  if (hasPhone) { score += 12; strengths.push('Téléphone renseigné') } else { weaknesses.push('Aucun téléphone'); missingInfo.push('Téléphone') }
  if (hasEmail) { score += 6 } else { missingInfo.push('Email') }
  if (hasCity) { score += 8 } else { missingInfo.push('Commune / adresse') }
  if (hasProjectType) { score += 12; strengths.push('Type de projet clair') } else { weaknesses.push('Type de projet non précisé') }
  if (hasDescription) { score += 12; strengths.push('Description détaillée') } else { weaknesses.push('Description trop vague'); missingInfo.push('Détails du projet') }
  if (budgetKnown) {
    score += 14
    strengths.push('Budget renseigné')
    if (budgetValue > 0) score += 6
  } else {
    weaknesses.push('Budget non défini')
    missingInfo.push('Budget')
  }
  if (timelineKnown) {
    score += 10
    if (isUrgentTimeline(project.desiredTimeline)) {
      score += 8
      strengths.push('Délai court')
    } else {
      strengths.push('Délai renseigné')
    }
  } else {
    weaknesses.push('Délai non précisé')
    missingInfo.push('Délai souhaité')
  }
  if (hasPhotos) { score += 6; strengths.push('Photos jointes') }
  if (ready) { score += 8; strengths.push('Prêt à démarrer') }
  if (lowMaturity) { score -= 10; weaknesses.push('Encore en phase de comparaison') }
  if (!hasPhone && !hasEmail) riskFlags.push('Aucun moyen de contact fiable')

  // Le completenessScore existant est un signal supplementaire, pas la seule
  // source de verite (mission : "ne pas s'y limiter").
  score = score * 0.85 + completeness * 0.15

  if (devis?.declined) {
    score = Math.min(score, 35)
    riskFlags.push('Devis refusé')
    if (devis.declineReason) weaknesses.push(`Motif du refus : ${devis.declineReason}`)
  }

  score = clampScore(score)

  const dataPointsKnown = [hasPhone, hasEmail, hasCity, hasProjectType, hasDescription, budgetKnown, timelineKnown].filter(Boolean).length
  const confidence: Confidence = dataPointsKnown >= 5 ? 'high' : dataPointsKnown >= 3 ? 'medium' : 'low'

  let temperature: Temperature = score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'cold'
  if (riskFlags.length > 0 && temperature === 'hot') temperature = 'warm'

  const temperatureLabel = temperature === 'hot' ? 'Chaud' : temperature === 'warm' ? 'Tiède' : 'Froid'
  const priority: Priority = temperature === 'hot' ? 'high' : temperature === 'warm' ? 'medium' : 'low'

  // -- Next best action : priorite aux signaux de cycle de vie du devis,
  // puis aux signaux de qualification.
  let nextBestAction: NextBestAction
  let recommendation: string

  if (devis?.declined) {
    nextBestAction = {
      type: 'archive',
      label: 'Analyser le motif du refus',
      reason: 'Le retour prospect peut aider à ajuster l\'offre ou clôturer le dossier.',
    }
    recommendation = nextBestAction.reason
  } else if (devis?.sent && !devis.accepted) {
    nextBestAction = {
      type: 'followup',
      label: 'Suivre le devis',
      reason: 'Le devis est envoyé mais aucune décision n\'a encore été prise.',
    }
    recommendation = nextBestAction.reason
  } else if (!budgetKnown) {
    nextBestAction = {
      type: 'ask_info',
      label: 'Demander le budget',
      reason: 'Le budget manque pour prioriser correctement le dossier.',
    }
    recommendation = nextBestAction.reason
  } else if (!hasDescription || !hasProjectType) {
    nextBestAction = {
      type: 'ask_info',
      label: 'Demander des précisions',
      reason: 'La demande ne permet pas encore d\'estimer le chantier.',
    }
    recommendation = nextBestAction.reason
  } else if (temperature === 'hot' && hasPhone) {
    nextBestAction = {
      type: 'call',
      label: 'Appeler maintenant',
      reason: 'Dossier complet, budget renseigné, délai court.',
    }
    recommendation = nextBestAction.reason
  } else if (hasPhone || hasEmail) {
    nextBestAction = {
      type: 'quote',
      label: 'Préparer un devis',
      reason: 'Le besoin est qualifié et les informations principales sont disponibles.',
    }
    recommendation = nextBestAction.reason
  } else {
    nextBestAction = {
      type: 'ask_info',
      label: 'Demander un moyen de contact',
      reason: 'Aucun moyen de contact fiable n\'est disponible pour avancer sur ce dossier.',
    }
    recommendation = nextBestAction.reason
  }

  if (confidence === 'low' && dataPointsKnown <= 1) {
    return {
      score,
      temperature: 'cold',
      temperatureLabel: 'Froid',
      priority: 'low',
      recommendation: 'Analyse limitée : informations insuffisantes.',
      nextBestAction: {
        type: 'ask_info',
        label: 'Compléter le dossier',
        reason: 'Trop peu d\'informations sont disponibles pour produire une analyse fiable.',
      },
      strengths: strengths.slice(0, 4),
      weaknesses: weaknesses.slice(0, 4),
      missingInfo: missingInfo.slice(0, 4),
      riskFlags,
      confidence: 'low',
    }
  }

  return {
    score,
    temperature,
    temperatureLabel,
    priority,
    recommendation,
    nextBestAction,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    missingInfo: missingInfo.slice(0, 4),
    riskFlags,
    confidence,
  }
}

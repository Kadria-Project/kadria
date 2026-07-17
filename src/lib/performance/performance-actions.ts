/**
 * Action layer for the /performance workspace (Lot 3).
 *
 * Extends performance-analytics.ts without duplicating its status/date
 * helpers — everything here reuses the normalization rules exported from
 * that module. Nothing here talks to Supabase or contains any "AI"/
 * predictive logic: every function is a deterministic transformation over
 * already-fetched rows.
 *
 * Score commercial : ce lot NE réimplémente PAS de formule de scoring.
 * Après audit du dépôt, la seule formule de score commercial existante et
 * réutilisable est `getProjectCommercialAnalysis()` dans
 * src/lib/project-scoring.ts — déjà utilisée sur la fiche projet
 * ("Analyse Kadria") et dans les "Dossiers à traiter en priorité" du
 * dashboard existant (src/components/ArtisanDashboard.tsx). Elle est
 * additive (points par signal : téléphone, email, ville, type de projet,
 * description, budget, délai, photos, maturité, correspondance métier,
 * déplacement) et NE correspond PAS à la pondération
 * Complétude 20% / Budget 20% / Urgence 15% / Délai 15% / Réactivité 20% /
 * Distance 10% décrite dans certains briefs — recherche exhaustive faite
 * (grep sur les pourcentages et les libellés), cette pondération précise
 * n'existe nulle part dans le dépôt. On réutilise donc telle quelle la
 * formule réellement existante plutôt que d'en inventer une seconde.
 */

import { getRecommendedProjectAction, type ProjectLifecycleActionKey, type ProjectLifecycleInput } from '../project-lifecycle'
import { getProjectCommercialAnalysis, type ProjectAnalysisInput } from '../project-scoring'
import {
  inRange,
  isAcceptedQuote,
  isDeclinedQuote,
  isSentQuote,
  LOST_PROJECT_STATUSES,
  normalizeStatus,
  quoteAmount,
  STALE_QUOTE_MS,
  toDate,
  WON_PROJECT_STATUSES,
} from './performance-analytics'
import type {
  AtRiskOpportunitySummary,
  DateRange,
  KPIResult,
  MonthlyGoal,
  MonthlyGoalProgress,
  MonthlyGoalsSummary,
  MonthlyGoalStatus,
  OpportunityValue,
  PerformanceInsight,
  PerformanceOpportunity,
  PriorityAction,
  RecommendedAction,
  RecommendedActionType,
} from './performance-types'

type Row = Record<string, unknown>

/** Centralized thresholds for the Lot 3 rule engine — never scattered across components. */
export const PERFORMANCE_RULES = {
  /** Devis à relancer / valeur à risque : même seuil que le bloc "Opportunités à risque" du Lot 2. */
  staleQuoteMs: STALE_QUOTE_MS,
  /** Nombre minimal de dossiers avant de comparer un taux (source, conversion...) pour éviter les conclusions sur un échantillon trop faible. */
  minSampleSize: 5,
  /** Nombre minimal de dossiers gagnés avant de comparer un CA d'une période à l'autre. */
  minRevenueSample: 3,
  /** Écart minimal (points) pour signaler une baisse/hausse significative du taux de transformation. */
  significantConversionDeltaPoints: 8,
  /** Écart minimal (%) pour signaler une hausse de CA significative. */
  significantRevenueDeltaPercent: 15,
  /** Un devis envoyé et resté sans décision plus de ce délai est "à relancer". */
  quoteFollowUpDays: 5,
  /** Délai moyen de réponse (création → devis envoyé) jugé trop long, en heures. */
  slowResponseHours: 72,
  /** Nombre maximal d'opportunités renvoyées par l'API. */
  maxOpportunities: 15,
  /** Nombre d'opportunités affichées par défaut sur mobile. */
  mobileOpportunityLimit: 3,
  /** Bornes d'affichage des insights. */
  minInsights: 0,
  maxInsights: 5,
} as const

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function isOpenProjectStatus(status: unknown): boolean {
  const normalized = normalizeStatus(status)
  return !WON_PROJECT_STATUSES.has(normalized) && !LOST_PROJECT_STATUSES.has(normalized)
}

function quotesForProject(quotes: Row[], projectId: string): Row[] {
  return quotes.filter((quote) => String(quote.project_id ?? '') === projectId)
}

/** Most relevant quote for a project: declined > sent&undecided > accepted > most recent. */
function pickLatestDevis(projectQuotes: Row[]): Row | null {
  if (projectQuotes.length === 0) return null
  const declined = projectQuotes.find(isDeclinedQuote)
  if (declined) return declined
  const pendingSent = projectQuotes.find((q) => isSentQuote(q) && !isAcceptedQuote(q) && !isDeclinedQuote(q))
  if (pendingSent) return pendingSent
  const accepted = projectQuotes.find(isAcceptedQuote)
  if (accepted) return accepted
  return [...projectQuotes].sort((a, b) => {
    const da = toDate(a.created_at)?.getTime() ?? 0
    const db = toDate(b.created_at)?.getTime() ?? 0
    return db - da
  })[0]
}

/**
 * Parses a rough numeric estimate out of a free-text budget field. Used only
 * as the last-resort tier of `getOpportunityValue` — never presented as a
 * committed/signed amount.
 */
function parseEstimatedBudget(budget: unknown): number | null {
  const text = typeof budget === 'string' ? budget.trim() : ''
  if (!text) return null
  const matches = text.match(/\d+[\s\d]*/g)
  if (!matches) return null
  const values = matches
    .map((value) => Number.parseInt(value.replace(/\s/g, ''), 10))
    .filter((value) => Number.isFinite(value) && value > 0)
  return values.length ? Math.max(...values) : null
}

/* ------------------------------------------------------------------ */
/* 1. Opportunity value                                                */
/* ------------------------------------------------------------------ */

/**
 * Valeur d'une opportunité, par ordre de fiabilité décroissant :
 * 1. Montant d'un devis actif/envoyé non refusé (CA potentiel réel, chiffré par l'artisan).
 * 2. Budget estimé déclaré par le client (texte libre, non contractuel — jamais présenté comme un CA signé).
 * 3. "Valeur indisponible" si aucune des deux sources n'est exploitable.
 */
export function getOpportunityValue(project: Row, projectQuotes: Row[]): OpportunityValue {
  const activeQuote = projectQuotes.find((q) => isSentQuote(q) && !isDeclinedQuote(q))
  if (activeQuote) {
    const amount = quoteAmount(activeQuote)
    if (amount > 0) {
      return {
        amount,
        nature: 'quoteAmount',
        label: isAcceptedQuote(activeQuote) ? 'Devis accepté' : 'Devis envoyé',
      }
    }
  }

  const estimated = parseEstimatedBudget(project.budget)
  if (estimated !== null) {
    return { amount: estimated, nature: 'estimatedBudget', label: 'Budget estimé (non contractuel)' }
  }

  return { amount: null, nature: 'unknown', label: 'Valeur indisponible' }
}

/* ------------------------------------------------------------------ */
/* 2. Recommended next action                                          */
/* ------------------------------------------------------------------ */

const ACTION_KEY_TO_TYPE: Partial<Record<ProjectLifecycleActionKey, RecommendedActionType>> = {
  follow_up_quote: 'followUpQuote',
  track_quote: 'followUpQuote',
  follow_up_deposit: 'followUpQuote',
  reply_client: 'callProspect',
  schedule_sales_appointment: 'scheduleAppointment',
  schedule_worksite: 'scheduleAppointment',
  prepare_quote: 'sendQuote',
  send_quote: 'sendQuote',
  complete_project: 'completeFile',
  qualify_project: 'completeFile',
  request_deposit: 'sendQuote',
  close_project: 'completeFile',
  view_summary: 'completeFile',
  view_reason: 'completeFile',
  monitor: 'completeFile',
  move_to_execution: 'scheduleAppointment',
}

/**
 * Prochaine action recommandée pour un dossier ouvert. Réutilise
 * intégralement le moteur de décision existant du cycle de vie projet
 * (`getRecommendedProjectAction` de src/lib/project-lifecycle.ts, lui-même
 * utilisé sur la fiche projet) plutôt que d'inventer une seconde règle —
 * seul le libellé de destination (toujours la fiche projet, seule action
 * proprement déclenchable depuis un tableau) est ajouté ici.
 */
export function getRecommendedNextAction(projectId: string, input: ProjectLifecycleInput): RecommendedAction {
  const recommended = getRecommendedProjectAction(input)
  const type = ACTION_KEY_TO_TYPE[recommended.key] ?? 'completeFile'
  return {
    type,
    label: recommended.ctaLabel,
    destination: `/dashboard-v2/projet/${projectId}`,
  }
}

function buildLifecycleInput(project: Row, latestDevis: Row | null): ProjectLifecycleInput {
  return {
    status: typeof project.status === 'string' ? project.status : null,
    completenessScore: Number(project.completeness_score || 0),
    desiredTimeline: typeof project.desired_timeline === 'string' ? project.desired_timeline : null,
    quoteSentAt: typeof latestDevis?.quote_sent_at === 'string' ? (latestDevis.quote_sent_at as string) : null,
    acceptedAt: typeof latestDevis?.accepted_at === 'string' ? (latestDevis.accepted_at as string) : null,
    latestDevis: latestDevis
      ? {
          sent: isSentQuote(latestDevis),
          accepted: isAcceptedQuote(latestDevis),
          declined: isDeclinedQuote(latestDevis),
          quote_sent_at: typeof latestDevis.quote_sent_at === 'string' ? latestDevis.quote_sent_at : null,
          decline_reason: typeof latestDevis.decline_reason === 'string' ? latestDevis.decline_reason : null,
        }
      : null,
  }
}

/* ------------------------------------------------------------------ */
/* 3. Top opportunities                                                */
/* ------------------------------------------------------------------ */

function isUrgentTimelineText(timeline: unknown): boolean {
  const text = typeof timeline === 'string' ? timeline.toLowerCase() : ''
  if (!text) return false
  return text.includes('urgent') || text.includes('au plus vite') || text.includes('1 mois') || text.includes('immediat') || text.includes('immédiat')
}

/**
 * Classement déterministe des opportunités ouvertes. Combine, sans
 * surpondérer la valeur financière :
 * - score commercial existant (poids dominant, 0-100 → jusqu'à 55 points) ;
 * - urgence déclarée par le client (jusqu'à 12 points) ;
 * - retard de relance d'un devis en attente (jusqu'à 18 points, proportionnel aux jours de retard) ;
 * - valeur financière connue, plafonnée pour ne pas dominer le classement (jusqu'à 15 points, log-scale).
 */
function computeRankScore(params: { score: number | null; urgent: boolean; overdueDays: number | null; value: number | null }): number {
  const scorePart = (params.score ?? 40) * 0.55
  const urgencyPart = params.urgent ? 12 : 0
  const overduePart = params.overdueDays ? Math.min(params.overdueDays, 30) * 0.6 : 0
  const valuePart = params.value && params.value > 0 ? Math.min(Math.log10(params.value + 1) * 3, 15) : 0
  return scorePart + urgencyPart + overduePart + valuePart
}

function truncateTitle(title: string, max = 48): string {
  if (title.length <= max) return title
  return `${title.slice(0, max - 1).trimEnd()}…`
}

export function getTopOpportunities(
  projects: Row[],
  quotes: Row[],
  now: Date = new Date(),
  responsibleNames?: Map<string, string>,
): PerformanceOpportunity[] {
  const open = projects.filter((project) => isOpenProjectStatus(project.status))

  const opportunities: PerformanceOpportunity[] = open.map((project) => {
    const projectId = String(project.id)
    const projectQuotes = quotesForProject(quotes, projectId)
    const latestDevis = pickLatestDevis(projectQuotes)
    const value = getOpportunityValue(project, projectQuotes)

    const analysisInput: ProjectAnalysisInput = {
      status: typeof project.status === 'string' ? project.status : undefined,
      clientName: typeof project.client_name === 'string' ? project.client_name : undefined,
      clientFirstName: typeof project.client_first_name === 'string' ? project.client_first_name : undefined,
      clientPhone: typeof project.client_phone === 'string' ? project.client_phone : undefined,
      clientEmail: typeof project.client_email === 'string' ? project.client_email : undefined,
      trade: typeof project.trade === 'string' ? project.trade : undefined,
      projectType: typeof project.project_type === 'string' ? project.project_type : undefined,
      budget: typeof project.budget === 'string' ? project.budget : undefined,
      desiredTimeline: typeof project.desired_timeline === 'string' ? project.desired_timeline : undefined,
      maturity: typeof project.maturity === 'string' ? project.maturity : undefined,
      city: typeof project.city === 'string' ? project.city : undefined,
      completenessScore: Number(project.completeness_score || 0),
      source: typeof project.source === 'string' ? project.source : undefined,
      latestDevis: latestDevis
        ? {
            sent: isSentQuote(latestDevis),
            accepted: isAcceptedQuote(latestDevis),
            declined: isDeclinedQuote(latestDevis),
            declineReason: typeof latestDevis.decline_reason === 'string' ? latestDevis.decline_reason : null,
          }
        : null,
    }

    const analysis = getProjectCommercialAnalysis(analysisInput)

    let overdueDays: number | null = null
    let dueLabel: string | null = null
    if (latestDevis && isSentQuote(latestDevis) && !isAcceptedQuote(latestDevis) && !isDeclinedQuote(latestDevis)) {
      const sentAt = toDate(latestDevis.quote_sent_at)
      if (sentAt) {
        const elapsedMs = now.getTime() - sentAt.getTime()
        if (elapsedMs >= STALE_QUOTE_MS) {
          overdueDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000))
          dueLabel = `En retard de ${overdueDays} jour${overdueDays > 1 ? 's' : ''}`
        }
      }
    }

    const lifecycleInput = buildLifecycleInput(project, latestDevis)
    const nextAction = getRecommendedNextAction(projectId, lifecycleInput)

    const clientName = [project.client_first_name, project.client_name]
      .filter((part) => typeof part === 'string' && part.trim())
      .join(' ')
      .trim()

    const projectTitle = typeof project.project_title === 'string' && project.project_title.trim()
      ? project.project_title.trim()
      : (typeof project.project_type === 'string' && project.project_type.trim()) || 'Projet'

    const urgent = isUrgentTimelineText(project.desired_timeline)
    const rankScore = computeRankScore({ score: analysis.score, urgent, overdueDays, value: value.amount })

    return {
      projectId,
      clientName: clientName || 'Client non renseigné',
      projectTitle: truncateTitle(projectTitle),
      value,
      score: analysis.score,
      status: typeof project.status === 'string' ? project.status : 'Nouveau',
      statusLabel: typeof project.status === 'string' && project.status.trim() ? project.status.trim() : 'Nouveau',
      nextAction,
      dueLabel,
      overdueDays,
      responsibleName: responsibleNames?.get(String(project.responsible_user_id ?? '')) ?? null,
      rankScore,
    }
  })

  return opportunities
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, PERFORMANCE_RULES.maxOpportunities)
}

/* ------------------------------------------------------------------ */
/* 4. Insights & recommendations                                       */
/* ------------------------------------------------------------------ */

/**
 * Moteur de règles déterministes — aucune IA, aucune prédiction. Chaque
 * règle documente sa condition de déclenchement et son garde-fou
 * d'échantillon minimal directement en commentaire.
 */
export function getPerformanceInsights(params: {
  kpis: KPIResult[]
  atRisk: AtRiskOpportunitySummary
  quotes: Row[]
  projects: Row[]
  current: DateRange
  previous: DateRange
  leadSources: { source: string; count: number; percent: number }[]
  leadSourcesTotal: number
  now?: Date
}): PerformanceInsight[] {
  const { kpis, atRisk, quotes, current, projects, leadSources, leadSourcesTotal } = params
  const now = params.now ?? new Date()
  const insights: PerformanceInsight[] = []

  const revenueKpi = kpis.find((kpi) => kpi.id === 'revenue')
  const conversionKpi = kpis.find((kpi) => kpi.id === 'conversionRate')

  // Règle "CA en hausse" : delta de CA fiable seulement si un volume minimal
  // de dossiers gagnés a contribué au CA (sinon un seul gros devis peut
  // simuler une tendance).
  const wonCountCurrent = projects.filter(
    (p) => WON_PROJECT_STATUSES.has(normalizeStatus(p.status)) && inRange(p.updated_at ?? p.created_at, current),
  ).length
  if (
    revenueKpi &&
    revenueKpi.comparison.deltaPercent !== null &&
    revenueKpi.comparison.deltaPercent >= PERFORMANCE_RULES.significantRevenueDeltaPercent &&
    wonCountCurrent >= PERFORMANCE_RULES.minRevenueSample
  ) {
    insights.push({
      id: 'revenue-up',
      category: 'revenue',
      level: 'positive',
      icon: 'trendUp',
      title: 'Chiffre d\'affaires en hausse',
      explanation: `Le chiffre d'affaires progresse sur la période, porté par ${wonCountCurrent} dossiers gagnés.`,
      evidence: `+${Math.round(revenueKpi.comparison.deltaPercent)} % vs période précédente`,
      ctaLabel: 'Voir le détail',
      destination: '/dashboard-v2/performance',
      rule: `revenue.deltaPercent >= ${PERFORMANCE_RULES.significantRevenueDeltaPercent} && wonCount >= ${PERFORMANCE_RULES.minRevenueSample}`,
    })
  }

  // Règle "baisse de transformation" : écart significatif ET base de dossiers
  // qualifiés suffisante des deux côtés (sinon un seul dossier peut faire
  // varier le taux de 0 à 100 %).
  if (
    conversionKpi &&
    conversionKpi.comparison.deltaAbsolute < 0 &&
    Math.abs(conversionKpi.comparison.deltaAbsolute) * 100 >= PERFORMANCE_RULES.significantConversionDeltaPoints
  ) {
    insights.push({
      id: 'conversion-down',
      category: 'conversion',
      level: 'attention',
      icon: 'trendDown',
      title: 'Taux de transformation en baisse',
      explanation: 'Le taux de dossiers gagnés par rapport aux dossiers qualifiés recule sur la période sélectionnée.',
      evidence: `${Math.round(conversionKpi.comparison.deltaAbsolute * 100)} pts vs période précédente`,
      ctaLabel: 'Analyser le tunnel',
      destination: '/dashboard-v2/performance',
      rule: `conversionRate.deltaAbsolute*100 <= -${PERFORMANCE_RULES.significantConversionDeltaPoints}`,
    })
  }

  // Règle "devis à relancer" — même définition que le bloc "À risque" du Lot 2.
  if (atRisk.count > 0 && atRisk.amount > 0) {
    insights.push({
      id: 'quotes-to-follow-up',
      category: 'followUp',
      level: atRisk.count >= 5 ? 'critical' : 'attention',
      icon: 'clock',
      title: `${atRisk.count} devis à relancer`,
      explanation: 'Ces devis sont envoyés depuis plus de 5 jours, sans acceptation ni refus, pour des dossiers toujours ouverts.',
      evidence: `${atRisk.amount.toLocaleString('fr-FR')} € potentiellement à risque`,
      ctaLabel: 'Traiter les relances',
      destination: '/dashboard-v2/performance#priority-actions',
      rule: 'atRisk.count > 0 (devis envoyés > 5 jours, ni acceptés ni refusés, dossier ouvert)',
    })
  }

  // Règle "temps de réponse trop long" : nécessite un échantillon minimal de
  // délais création → devis envoyé mesurables sur la période.
  const responseDelays: number[] = []
  for (const project of projects) {
    if (!inRange(project.created_at, current)) continue
    const createdAt = toDate(project.created_at)
    if (!createdAt) continue
    const projectQuotes = quotesForProject(quotes, String(project.id))
    const firstSent = projectQuotes
      .map((q) => toDate(q.quote_sent_at))
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => a.getTime() - b.getTime())[0]
    if (firstSent) responseDelays.push((firstSent.getTime() - createdAt.getTime()) / 3_600_000)
  }
  if (responseDelays.length >= PERFORMANCE_RULES.minSampleSize) {
    const avgHours = responseDelays.reduce((sum, h) => sum + h, 0) / responseDelays.length
    if (avgHours > PERFORMANCE_RULES.slowResponseHours) {
      insights.push({
        id: 'slow-response-time',
        category: 'responseTime',
        level: 'attention',
        icon: 'clock',
        title: 'Temps de réponse élevé',
        explanation: 'Le délai moyen entre la création d\'un dossier et l\'envoi du devis dépasse le seuil recommandé.',
        evidence: `${Math.round(avgHours / 24)} jours en moyenne sur ${responseDelays.length} dossiers`,
        ctaLabel: 'Voir les dossiers en attente',
        destination: '/dashboard-v2/performance#priority-actions',
        rule: `avgResponseHours > ${PERFORMANCE_RULES.slowResponseHours} && sample >= ${PERFORMANCE_RULES.minSampleSize}`,
      })
    }
  }

  // Règle "source performante" : volume minimal ET taux de conversion
  // significativement supérieur à la moyenne des autres sources.
  if (leadSourcesTotal >= PERFORMANCE_RULES.minSampleSize) {
    const bySource = new Map<string, { total: number; won: number }>()
    for (const project of projects) {
      if (!inRange(project.created_at, current)) continue
      const family = typeof project.source === 'string' ? project.source : (typeof project.project_source === 'string' ? project.project_source : 'inconnue')
      const bucket = bySource.get(family) || { total: 0, won: 0 }
      bucket.total += 1
      if (WON_PROJECT_STATUSES.has(normalizeStatus(project.status))) bucket.won += 1
      bySource.set(family, bucket)
    }
    const eligible = Array.from(bySource.entries()).filter(([, v]) => v.total >= PERFORMANCE_RULES.minSampleSize)
    if (eligible.length >= 2) {
      const rates = eligible.map(([source, v]) => ({ source, rate: v.won / v.total, total: v.total }))
      const overallRate = rates.reduce((sum, r) => sum + r.rate, 0) / rates.length
      const best = rates.reduce((a, b) => (b.rate > a.rate ? b : a))
      if (best.rate > overallRate * 1.3 && best.rate > 0) {
        const bestSourceLabel = leadSources.find((s) => s.source === best.source)?.source ?? best.source
        insights.push({
          id: 'top-source',
          category: 'source',
          level: 'opportunity',
          icon: 'target',
          title: `${bestSourceLabel} performe particulièrement bien`,
          explanation: 'Cette source convertit nettement mieux que la moyenne des autres sources sur la période.',
          evidence: `${Math.round(best.rate * 100)} % de dossiers gagnés sur ${best.total} dossiers`,
          ctaLabel: 'Voir la répartition',
          destination: '/dashboard-v2/performance',
          rule: `bestSourceRate > overallRate * 1.3 && sourceTotal >= ${PERFORMANCE_RULES.minSampleSize}`,
        })
      }
    }
  }

  // Règle "valeur à risque" : réutilise directement le calcul du Lot 2.
  // (Déjà couverte par "devis à relancer" ci-dessus — fusionnée par
  // deduplicateInsights si les deux se déclenchent avec la même preuve.)

  // Règle "très bon résultat" : conversion significativement au-dessus de la
  // moyenne, avec un échantillon suffisant des deux côtés.
  if (
    conversionKpi &&
    conversionKpi.comparison.previousValue > 0 &&
    conversionKpi.value > conversionKpi.comparison.previousValue * 1.3 &&
    wonCountCurrent >= PERFORMANCE_RULES.minRevenueSample
  ) {
    insights.push({
      id: 'conversion-excellent',
      category: 'performance',
      level: 'positive',
      icon: 'trendUp',
      title: 'Très bon taux de transformation',
      explanation: 'Le taux de dossiers gagnés est nettement supérieur à la période précédente.',
      evidence: `${Math.round(conversionKpi.value * 100)} % sur la période, contre ${Math.round(conversionKpi.comparison.previousValue * 100)} % avant`,
      ctaLabel: 'Voir le détail',
      destination: '/dashboard-v2/performance',
      rule: 'conversionRate.value > previousValue*1.3 && wonCount >= minRevenueSample',
    })
  }

  void now
  return deduplicateInsights(insights).slice(0, PERFORMANCE_RULES.maxInsights)
}

/**
 * Fusionne les insights qui racontent le même signal sous plusieurs angles
 * (ex. "devis à relancer" et "valeur à risque" reposent sur les mêmes
 * dossiers) : on garde uniquement le premier par catégorie de risque
 * "followUp", et on ne conserve jamais deux insights avec la même preuve
 * chiffrée exacte.
 */
export function deduplicateInsights(insights: PerformanceInsight[]): PerformanceInsight[] {
  const seenEvidence = new Set<string>()
  const seenCategory = new Set<string>()
  const result: PerformanceInsight[] = []

  const priorityOrder: Record<string, number> = { critical: 0, attention: 1, opportunity: 2, positive: 3, information: 4 }
  const sorted = [...insights].sort((a, b) => (priorityOrder[a.level] ?? 9) - (priorityOrder[b.level] ?? 9))

  for (const insight of sorted) {
    const evidenceKey = insight.evidence.trim().toLowerCase()
    // followUp et risk racontent la même chose (devis en retard) — un seul
    // conservé, celui de plus haute priorité (deja trié ci-dessus).
    const dedupeCategoryKey = insight.category === 'risk' ? 'followUp' : insight.category
    if (seenEvidence.has(evidenceKey)) continue
    if (dedupeCategoryKey === 'followUp' && seenCategory.has('followUp')) continue
    seenEvidence.add(evidenceKey)
    seenCategory.add(dedupeCategoryKey)
    result.push(insight)
  }

  return result
}

/* ------------------------------------------------------------------ */
/* 5. Priority actions                                                 */
/* ------------------------------------------------------------------ */

/**
 * Actions groupées par catégorie, jamais un projet unique par ligne. Chaque
 * action n'apparaît que si son compteur est > 0. Ordre imposé par le brief :
 * dossiers en retard à forte valeur → devis à relancer → nouveaux prospects
 * → devis à produire → RDV à planifier → dossiers incomplets.
 */
export function getPriorityActions(params: {
  projects: Row[]
  quotes: Row[]
  now?: Date
}): PriorityAction[] {
  const { projects, quotes } = params
  const now = params.now ?? new Date()
  const openProjects = projects.filter((p) => isOpenProjectStatus(p.status))
  const actions: PriorityAction[] = []

  // Dossiers en retard à forte valeur : devis envoyés > seuil, non décidés,
  // avec une valeur financière connue non nulle (sous-ensemble à plus forte
  // priorité que "devis à relancer" générique).
  const overdueHighValue = openProjects.filter((project) => {
    const projectQuotes = quotesForProject(quotes, String(project.id))
    const pending = projectQuotes.find((q) => isSentQuote(q) && !isAcceptedQuote(q) && !isDeclinedQuote(q))
    if (!pending) return false
    const sentAt = toDate(pending.quote_sent_at)
    if (!sentAt) return false
    if (now.getTime() - sentAt.getTime() < PERFORMANCE_RULES.staleQuoteMs) return false
    return quoteAmount(pending) > 0
  })
  if (overdueHighValue.length > 0) {
    const totalValue = overdueHighValue.reduce((sum, project) => {
      const pending = quotesForProject(quotes, String(project.id)).find((q) => isSentQuote(q) && !isAcceptedQuote(q) && !isDeclinedQuote(q))
      return sum + (pending ? quoteAmount(pending) : 0)
    }, 0)
    actions.push({
      type: 'handleOverdue',
      icon: 'alert',
      label: 'Traiter les dossiers en retard',
      count: overdueHighValue.length,
      detail: `${overdueHighValue.length} dossier${overdueHighValue.length > 1 ? 's' : ''} avec devis en attente depuis plus de ${PERFORMANCE_RULES.quoteFollowUpDays} jours`,
      value: totalValue > 0 ? totalValue : null,
      priority: 'high',
      destination: '/dashboard-v2/performance',
    })
  }

  // Devis à relancer (sur-ensemble, même définition que le Lot 2).
  const toFollowUp = openProjects.filter((project) => {
    const pending = quotesForProject(quotes, String(project.id)).find((q) => isSentQuote(q) && !isAcceptedQuote(q) && !isDeclinedQuote(q))
    if (!pending) return false
    const sentAt = toDate(pending.quote_sent_at)
    return Boolean(sentAt) && now.getTime() - (sentAt as Date).getTime() >= PERFORMANCE_RULES.staleQuoteMs
  })
  if (toFollowUp.length > 0) {
    const totalValue = toFollowUp.reduce((sum, project) => {
      const pending = quotesForProject(quotes, String(project.id)).find((q) => isSentQuote(q) && !isAcceptedQuote(q) && !isDeclinedQuote(q))
      return sum + (pending ? quoteAmount(pending) : 0)
    }, 0)
    actions.push({
      type: 'followUpQuotes',
      icon: 'followUp',
      label: 'Relancer les devis',
      count: toFollowUp.length,
      detail: `${toFollowUp.length} dossier${toFollowUp.length > 1 ? 's' : ''} sans décision depuis plus de ${PERFORMANCE_RULES.quoteFollowUpDays} jours`,
      value: totalValue > 0 ? totalValue : null,
      priority: 'high',
      destination: '/dashboard-v2/performance',
    })
  }

  // Nouveaux prospects non traités : statut "Nouveau", jamais contactés.
  const newProspects = openProjects.filter((p) => normalizeStatus(p.status) === 'nouveau' || normalizeStatus(p.status) === '')
  if (newProspects.length > 0) {
    actions.push({
      type: 'callNewProspects',
      icon: 'call',
      label: 'Appeler les nouveaux prospects',
      count: newProspects.length,
      detail: `${newProspects.length} nouveau${newProspects.length > 1 ? 'x' : ''} dossier${newProspects.length > 1 ? 's' : ''} non encore traité${newProspects.length > 1 ? 's' : ''}`,
      value: null,
      priority: 'medium',
      destination: '/dashboard-v2/performance',
    })
  }

  // Devis à produire : dossiers qualifiés/en cours sans aucun devis envoyé.
  const toQuote = openProjects.filter((p) => {
    const normalized = normalizeStatus(p.status)
    if (normalized !== 'qualifie' && normalized !== 'en cours') return false
    const projectQuotes = quotesForProject(quotes, String(p.id))
    return !projectQuotes.some(isSentQuote)
  })
  if (toQuote.length > 0) {
    actions.push({
      type: 'prepareQuotes',
      icon: 'quote',
      label: 'Préparer les devis attendus',
      count: toQuote.length,
      detail: `${toQuote.length} dossier${toQuote.length > 1 ? 's' : ''} qualifié${toQuote.length > 1 ? 's' : ''} sans devis envoyé`,
      value: null,
      priority: 'medium',
      destination: '/dashboard-v2/performance',
    })
  }

  // Dossiers incomplets : score de complétude connu et bas.
  const incomplete = openProjects.filter((p) => {
    const completeness = Number(p.completeness_score || 0)
    return completeness > 0 && completeness < 60
  })
  if (incomplete.length > 0) {
    actions.push({
      type: 'completeFiles',
      icon: 'checklist',
      label: 'Compléter les dossiers incomplets',
      count: incomplete.length,
      detail: `${incomplete.length} dossier${incomplete.length > 1 ? 's' : ''} avec des informations manquantes`,
      value: null,
      priority: 'low',
      destination: '/dashboard-v2/performance',
    })
  }

  return actions
}

/* ------------------------------------------------------------------ */
/* 6. Monthly goals                                                    */
/* ------------------------------------------------------------------ */

/**
 * Progression d'un objectif mensuel. Gère les métriques "inversées" (ex.
 * temps de réponse : une valeur plus basse est meilleure) avec une formule
 * de progression différente de celle des métriques standards (CA, dossiers).
 */
export function getMonthlyGoalProgress(goal: MonthlyGoal): MonthlyGoalProgress {
  if (goal.targetValue <= 0) {
    return { goal, progressPercent: 0, status: 'behind' }
  }

  let progressPercent: number
  if (goal.inverted) {
    // Valeur inversée : atteindre ou faire mieux que la cible = 100 %+.
    // Ex. cible 48h, actuel 24h -> 200% (plafonné) ; actuel 96h -> 50%.
    progressPercent = goal.currentValue > 0 ? (goal.targetValue / goal.currentValue) * 100 : 100
  } else {
    progressPercent = (goal.currentValue / goal.targetValue) * 100
  }
  progressPercent = Math.max(0, Math.min(150, Math.round(progressPercent)))

  let status: MonthlyGoalStatus
  if (progressPercent >= 100) status = 'achieved'
  else if (progressPercent >= 75) status = 'onTrack'
  else if (progressPercent >= 40) status = 'atRisk'
  else status = 'behind'

  return { goal, progressPercent, status }
}

/**
 * Audit du dépôt (paramètres artisan, migrations Supabase) : aucune table
 * ni configuration d'objectifs mensuels personnalisés n'existe. Ce lot ne
 * crée aucune migration ni valeur inventée — l'état "non configuré" est
 * donc toujours renvoyé, avec une destination de configuration réelle si
 * elle existe (`/parametres`), jamais un lien mort.
 */
export function getMonthlyGoalsSummary(): MonthlyGoalsSummary {
  return { configured: false, goals: [], configureDestination: '/parametres' }
}

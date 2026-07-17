/**
 * Shared types for the /performance workspace (Lot 1 — foundation only).
 *
 * KPI definitions (source of truth, do not duplicate elsewhere):
 * - Chiffre d'affaires = somme des `total_ttc` des devis gagnés (acceptés) sur la période.
 * - Panier moyen = chiffre d'affaires / nombre de dossiers gagnés sur la période.
 * - Taux de transformation = dossiers gagnés / dossiers qualifiés sur la période.
 * - Dossiers créés = nombre de nouveaux dossiers (Projects) créés sur la période.
 */

export type PerformancePeriodKey =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | '90d'
  | 'year'
  | 'custom'

export type DateRange = {
  start: Date
  end: Date
}

export type PerformancePeriod = {
  key: PerformancePeriodKey
  label: string
  /** Current range, inclusive start / exclusive end. */
  current: DateRange
  /** Equivalent-length range immediately preceding `current`, for comparison. */
  previous: DateRange
}

export type KPITrend = 'up' | 'down' | 'flat'

export type KPIComparison = {
  previousValue: number
  deltaAbsolute: number
  deltaPercent: number | null
  trend: KPITrend
}

export type KPIId = 'revenue' | 'createdProjects' | 'conversionRate' | 'averageBasket'

export type KPIFormat = 'currency' | 'integer' | 'percent'

export type KPIResult = {
  id: KPIId
  value: number
  format: KPIFormat
  comparison: KPIComparison
  /** Lightweight placeholder series for the mini sparkline (Lot 2 will enrich this). */
  sparkline: number[]
}

export type PerformanceSnapshot = {
  period: PerformancePeriod
  kpis: KPIResult[]
}

/* ------------------------------------------------------------------ */
/* Lot 2 — analytics core                                             */
/* ------------------------------------------------------------------ */

/** One bucket of the revenue evolution series. `bucketStart` is ISO. */
export type RevenueDataPoint = {
  bucketStart: string
  label: string
  revenue: number
}

export type RevenueSeries = {
  points: RevenueDataPoint[]
  /** Granularity actually used to build the buckets. */
  granularity: 'hour' | 'day' | 'week' | 'month'
  /** Total revenue for the current period — must equal the Lot 1 KPI value. */
  total: number
  previousTotal: number
}

/** Canonical, human-readable lead source family. */
export type LeadSourceFamily =
  | 'Assistant vocal'
  | 'Assistant web'
  | 'Site vitrine'
  | 'Google'
  | 'WhatsApp'
  | 'Réseaux sociaux'
  | 'Recommandation'
  | 'Saisie manuelle'
  | 'Autres'
  | 'Source inconnue'

export type LeadSourceMetric = {
  source: LeadSourceFamily
  count: number
  percent: number
}

export type LeadSourceDistribution = {
  total: number
  sources: LeadSourceMetric[]
}

export type FunnelStageId = 'received' | 'qualified' | 'quoteSent' | 'quoteAccepted' | 'won'

export type FunnelStage = {
  id: FunnelStageId
  label: string
  count: number
  /** Conversion rate from the previous stage, 0..1. Null for the first stage. */
  conversionFromPrevious: number | null
  /** Financial value associated with this stage, when it can be computed reliably. */
  value: number | null
}

export type AtRiskOpportunitySummary = {
  /** Whether the amount reflects genuinely "lost" value or merely "at risk" value. */
  nature: 'atRisk'
  amount: number
  count: number
  /** Short, honest explanation of the rule used to build this summary. */
  ruleDescription: string
  /** Main leak detected, in plain language, or null if none stands out. */
  mainLeak: string | null
}

export type ConversionRateDataPoint = {
  bucketStart: string
  label: string
  rate: number
  qualifiedCount: number
  wonCount: number
}

export type ConversionRateSeries = {
  points: ConversionRateDataPoint[]
  average: number
  previousAverage: number | null
}

export type StageDurationId = 'createdToQuoteSent' | 'quoteSentToAccepted' | 'createdToWon'

export type StageDurationMetric = {
  id: StageDurationId
  label: string
  available: boolean
  /** Average duration in minutes. Null when unavailable. */
  averageMinutes: number | null
  sampleSize: number
  /** Reason the metric is unavailable, shown to the user, when applicable. */
  unavailableReason: string | null
}

export type PipelineStatusMetric = {
  status: string
  count: number
  percent: number
}

export type PipelineDistribution = {
  total: number
  statuses: PipelineStatusMetric[]
}

export type PerformanceAnalytics = {
  revenueSeries: RevenueSeries
  leadSources: LeadSourceDistribution
  funnel: FunnelStage[]
  atRisk: AtRiskOpportunitySummary
  conversionRateSeries: ConversionRateSeries
  stageDurations: StageDurationMetric[]
  pipeline: PipelineDistribution
}

/* ------------------------------------------------------------------ */
/* Lot 3 — action layer (opportunities, insights, priority actions,   */
/* monthly goals)                                                     */
/* ------------------------------------------------------------------ */

/** Whether the financial value shown is a real quote amount or only an estimated budget declared by the client. */
export type OpportunityValueNature = 'quoteAmount' | 'estimatedBudget' | 'unknown'

export type OpportunityValue = {
  amount: number | null
  nature: OpportunityValueNature
  /** Human label clarifying the nature of the amount, e.g. "Devis envoyé" vs "Budget estimé (non contractuel)". */
  label: string
}

export type RecommendedActionType =
  | 'followUpQuote'
  | 'callProspect'
  | 'sendQuote'
  | 'scheduleAppointment'
  | 'completeFile'

export type RecommendedAction = {
  type: RecommendedActionType
  label: string
  /** In-app destination the CTA should navigate to. Always a real route, never a dead link. */
  destination: string
}

export type PerformanceOpportunity = {
  projectId: string
  clientName: string
  projectTitle: string
  value: OpportunityValue
  /** Score commercial 0-100 réutilisé de src/lib/project-scoring.ts (getProjectCommercialAnalysis), ou null si non calculable. */
  score: number | null
  status: string
  statusLabel: string
  nextAction: RecommendedAction
  /** "Aujourd'hui" / "Demain" / "En retard de X jours" / null quand aucune échéance fiable n'est disponible. */
  dueLabel: string | null
  overdueDays: number | null
  responsibleName: string | null
  /** Score de classement interne (jamais affiché tel quel) combinant score commercial, valeur, urgence, retard. */
  rankScore: number
}

export type InsightCategory = 'revenue' | 'conversion' | 'followUp' | 'responseTime' | 'source' | 'risk' | 'performance'
export type InsightLevel = 'positive' | 'attention' | 'critical' | 'opportunity' | 'information'
export type InsightIcon = 'trendUp' | 'trendDown' | 'alert' | 'clock' | 'target' | 'info'

export type PerformanceInsight = {
  id: string
  category: InsightCategory
  level: InsightLevel
  icon: InsightIcon
  title: string
  explanation: string
  /** Chiffre concret étayant l'insight, ex. "4 devis, 12 400 €". */
  evidence: string
  ctaLabel: string | null
  destination: string | null
  /** Règle métier ayant déclenché l'insight — documentation interne, jamais affichée à l'utilisateur. */
  rule: string
}

export type PriorityActionType =
  | 'followUpQuotes'
  | 'callNewProspects'
  | 'prepareQuotes'
  | 'scheduleAppointments'
  | 'handleOverdue'
  | 'completeFiles'

export type PriorityActionPriority = 'high' | 'medium' | 'low'
export type PriorityActionIcon = 'followUp' | 'call' | 'quote' | 'calendar' | 'alert' | 'checklist'

export type PriorityAction = {
  type: PriorityActionType
  icon: PriorityActionIcon
  label: string
  count: number
  detail: string
  /** Financial value only when reliably known (e.g. sum of real quote amounts). Never a guessed budget. */
  value: number | null
  priority: PriorityActionPriority
  destination: string
}

export type MonthlyGoalMetric = 'revenue' | 'wonProjects' | 'conversionRate' | 'averageResponseTime' | 'createdProjects'

export type MonthlyGoal = {
  metric: MonthlyGoalMetric
  label: string
  unit: string
  currentValue: number
  targetValue: number
  /** True for metrics where a lower value is better (e.g. average response time). */
  inverted: boolean
}

export type MonthlyGoalStatus = 'onTrack' | 'atRisk' | 'behind' | 'achieved'

export type MonthlyGoalProgress = {
  goal: MonthlyGoal
  progressPercent: number
  status: MonthlyGoalStatus
}

export type MonthlyGoalsSummary = {
  /** False when no goal configuration exists yet for the tenant — Lot 3 does not create one. */
  configured: boolean
  goals: MonthlyGoalProgress[]
  /** Real settings destination for "Configurer mes objectifs", or null if none exists. */
  configureDestination: string | null
}

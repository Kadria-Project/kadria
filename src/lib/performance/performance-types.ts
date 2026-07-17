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

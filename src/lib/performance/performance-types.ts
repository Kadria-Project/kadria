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

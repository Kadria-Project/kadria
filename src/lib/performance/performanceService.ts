/**
 * Centralized business logic for the /performance workspace.
 *
 * Nothing here talks to Supabase — it operates on already-fetched rows so it
 * stays trivially testable and reusable from any route or server component.
 * React components never compute KPI numbers themselves; they only render
 * what this module hands them.
 *
 * KPI definitions (single source of truth):
 * - Chiffre d'affaires (`getRevenue`)      = somme des `total_ttc` des devis gagnés sur la période.
 * - Panier moyen (`getAverageBasket`)      = chiffre d'affaires / nombre de dossiers gagnés.
 * - Taux de transformation (`getConversionRate`) = dossiers gagnés / dossiers qualifiés.
 * - Dossiers créés (`getCreatedProjects`)  = nombre de nouveaux dossiers (Projects) créés sur la période.
 */

import { getComparisonRange, getDateRange } from './date-range'
import type {
  DateRange,
  KPIComparison,
  KPIResult,
  KPITrend,
  PerformancePeriod,
  PerformancePeriodKey,
  PerformanceSnapshot,
} from './performance-types'

export { getDateRange } from './date-range'

type Row = Record<string, unknown>

const WON_PROJECT_STATUSES = new Set(['gagné', 'gagne', 'won'])
const QUALIFIED_PROJECT_STATUSES = new Set([
  'qualifié', 'qualifie',
  'en cours',
  'devis envoyé', 'devis envoye',
  'gagné', 'gagne', 'won',
  'perdu', 'lost',
])
const ACCEPTED_QUOTE_STATUSES = new Set(['accepté', 'accepte', 'accepted'])

function normalizeStatus(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function inRange(value: unknown, range: DateRange): boolean {
  const date = toDate(value)
  if (!date) return false
  return date >= range.start && date < range.end
}

function isAcceptedQuote(quote: Row): boolean {
  return quote.accepted === true || Boolean(quote.accepted_at) || ACCEPTED_QUOTE_STATUSES.has(normalizeStatus(quote.statut ?? quote.status))
}

function quoteAmount(quote: Row): number {
  return Number(quote.total_ttc ?? quote.total_ht ?? 0) || 0
}

function quoteWonDate(quote: Row): unknown {
  return quote.accepted_at ?? quote.updated_at ?? quote.created_at
}

/** Chiffre d'affaires = somme des devis gagnés (acceptés) sur la période. */
export function getRevenue(quotes: Row[], range: DateRange): number {
  return quotes
    .filter((quote) => isAcceptedQuote(quote) && inRange(quoteWonDate(quote), range))
    .reduce((total, quote) => total + quoteAmount(quote), 0)
}

/** Nombre de dossiers gagnés sur la période, dérivé du statut du dossier. */
export function getWonProjectsCount(projects: Row[], range: DateRange): number {
  return projects.filter((project) => WON_PROJECT_STATUSES.has(normalizeStatus(project.status)) && inRange(project.updated_at ?? project.created_at, range)).length
}

/** Panier moyen = chiffre d'affaires / nombre de dossiers gagnés. */
export function getAverageBasket(quotes: Row[], projects: Row[], range: DateRange): number {
  const wonCount = getWonProjectsCount(projects, range)
  if (wonCount <= 0) return 0
  return getRevenue(quotes, range) / wonCount
}

/** Taux de transformation = dossiers gagnés / dossiers qualifiés (0..1). */
export function getConversionRate(projects: Row[], range: DateRange): number {
  const qualified = projects.filter((project) => QUALIFIED_PROJECT_STATUSES.has(normalizeStatus(project.status)) && inRange(project.created_at, range)).length
  if (qualified <= 0) return 0
  const won = getWonProjectsCount(projects, range)
  return won / qualified
}

/** Dossiers créés = nombre de nouveaux dossiers (Projects) créés sur la période. */
export function getCreatedProjects(projects: Row[], range: DateRange): number {
  return projects.filter((project) => inRange(project.created_at, range)).length
}

function computeTrend(deltaPercent: number | null): KPITrend {
  if (deltaPercent === null || Math.abs(deltaPercent) < 0.5) return 'flat'
  return deltaPercent > 0 ? 'up' : 'down'
}

/** Compares a current numeric value against its equivalent previous-period value. */
export function getComparison(currentValue: number, previousValue: number): KPIComparison {
  const deltaAbsolute = currentValue - previousValue
  const deltaPercent = previousValue !== 0 ? (deltaAbsolute / previousValue) * 100 : currentValue !== 0 ? 100 : null
  return { previousValue, deltaAbsolute, deltaPercent, trend: computeTrend(deltaPercent) }
}

/** Coarse placeholder sparkline (Lot 2 will replace this with real daily buckets). */
function placeholderSparkline(currentValue: number, previousValue: number): number[] {
  const points = 6
  const start = previousValue
  const end = currentValue
  return Array.from({ length: points }, (_, index) => {
    const ratio = index / (points - 1)
    return start + (end - start) * ratio
  })
}

export type PerformanceRawData = {
  projects: Row[]
  quotes: Row[]
}

/**
 * Builds the full KPI snapshot for a period. This is the single entry point
 * routes/pages should call — it composes the individual KPI functions above
 * so adding a future KPI only means adding one more entry to this array.
 */
export function buildPerformanceSnapshot(
  data: PerformanceRawData,
  periodKey: PerformancePeriodKey,
  now: Date = new Date(),
  custom?: DateRange,
): PerformanceSnapshot {
  const period: PerformancePeriod = getDateRange(periodKey, now, custom)
  const { current, previous } = period

  const revenue = getRevenue(data.quotes, current)
  const revenuePrev = getRevenue(data.quotes, previous)

  const createdProjects = getCreatedProjects(data.projects, current)
  const createdProjectsPrev = getCreatedProjects(data.projects, previous)

  const conversionRate = getConversionRate(data.projects, current)
  const conversionRatePrev = getConversionRate(data.projects, previous)

  const averageBasket = getAverageBasket(data.quotes, data.projects, current)
  const averageBasketPrev = getAverageBasket(data.quotes, data.projects, previous)

  const kpis: KPIResult[] = [
    { id: 'revenue', value: revenue, format: 'currency', comparison: getComparison(revenue, revenuePrev), sparkline: placeholderSparkline(revenue, revenuePrev) },
    { id: 'createdProjects', value: createdProjects, format: 'integer', comparison: getComparison(createdProjects, createdProjectsPrev), sparkline: placeholderSparkline(createdProjects, createdProjectsPrev) },
    { id: 'conversionRate', value: conversionRate, format: 'percent', comparison: getComparison(conversionRate, conversionRatePrev), sparkline: placeholderSparkline(conversionRate, conversionRatePrev) },
    { id: 'averageBasket', value: averageBasket, format: 'currency', comparison: getComparison(averageBasket, averageBasketPrev), sparkline: placeholderSparkline(averageBasket, averageBasketPrev) },
  ]

  return { period, kpis }
}

export { getComparisonRange }

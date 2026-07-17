import type { DateRange, PerformancePeriod, PerformancePeriodKey } from './performance-types'

const DAY_MS = 24 * 60 * 60 * 1000

export const PERFORMANCE_PERIODS: Array<{ key: PerformancePeriodKey; label: string }> = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'yesterday', label: 'Hier' },
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '90 jours' },
  { key: 'year', label: 'Année' },
  { key: 'custom', label: 'Personnalisé' },
]

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Derives the current range for a given period key, plus the
 * equivalent-length preceding range used for comparison. This is the single
 * source of truth for period math — nothing else should compute date ranges.
 */
export function getDateRange(
  key: PerformancePeriodKey,
  now: Date = new Date(),
  custom?: DateRange,
): PerformancePeriod {
  const definition = PERFORMANCE_PERIODS.find((item) => item.key === key) || PERFORMANCE_PERIODS[2]
  let current: DateRange

  switch (key) {
    case 'today':
      current = { start: startOfDay(now), end: now }
      break
    case 'yesterday': {
      const end = startOfDay(now)
      current = { start: new Date(end.getTime() - DAY_MS), end }
      break
    }
    case '7d':
      current = { start: new Date(now.getTime() - 7 * DAY_MS), end: now }
      break
    case '30d':
      current = { start: new Date(now.getTime() - 30 * DAY_MS), end: now }
      break
    case '90d':
      current = { start: new Date(now.getTime() - 90 * DAY_MS), end: now }
      break
    case 'year':
      current = { start: new Date(now.getFullYear(), 0, 1), end: now }
      break
    case 'custom':
      current = custom && custom.start < custom.end ? custom : { start: new Date(now.getTime() - 30 * DAY_MS), end: now }
      break
    default:
      current = { start: new Date(now.getTime() - 30 * DAY_MS), end: now }
  }

  const previous = getComparisonRange(current)

  return { key, label: definition.label, current, previous }
}

/** Equivalent-length range immediately preceding `range`, for comparison. */
export function getComparisonRange(range: DateRange): DateRange {
  const duration = Math.max(range.end.getTime() - range.start.getTime(), DAY_MS)
  return { start: new Date(range.start.getTime() - duration), end: new Date(range.start.getTime()) }
}

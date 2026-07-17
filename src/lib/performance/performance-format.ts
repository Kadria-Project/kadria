import type { KPIFormat } from './performance-types'

/** Formats a raw KPI value according to its declared format. Never used for computation. */
export function formatKPIValue(value: number, format: KPIFormat): string {
  if (format === 'currency') {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  }
  if (format === 'percent') {
    return `${(value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
  }
  return Math.round(value).toLocaleString('fr-FR')
}

/** Formats a period-over-period delta percentage, e.g. "+12,4 %" / "−3 %". */
export function formatDeltaPercent(deltaPercent: number | null): string {
  if (deltaPercent === null) return 'Aucune donnée sur la période précédente'
  const rounded = Math.round(deltaPercent * 10) / 10
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${Math.abs(rounded).toLocaleString('fr-FR')} %`
}

/** Formats a raw percentage (0..100), e.g. "42,3 %". */
export function formatPercent(percent: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(percent)) return '0 %'
  return `${percent.toLocaleString('fr-FR', { maximumFractionDigits })} %`
}

/** Formats a ratio (0..1) as a percentage, e.g. 0.423 -> "42,3 %". */
export function formatRatioAsPercent(ratio: number, maximumFractionDigits = 1): string {
  return formatPercent((Number.isFinite(ratio) ? ratio : 0) * 100, maximumFractionDigits)
}

/**
 * Formats a duration expressed in minutes using the granularity mandated for
 * the "délai moyen par étape" block: minutes if <2h, hours if <48h, days beyond.
 */
export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return 'Indisponible'
  if (minutes < 120) return `${Math.round(minutes)} min`
  const hours = minutes / 60
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`
  const days = hours / 24
  return `${Math.round(days * 10) / 10} j`
}

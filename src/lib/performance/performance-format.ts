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

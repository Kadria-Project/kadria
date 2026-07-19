import type { KPIResult, PerformanceAnalytics, PerformanceSituation, RevenueSeries } from './performance-types'

function acceptedCount(series: RevenueSeries | null): number {
  return series?.points.filter((point) => point.revenue > 0).length ?? 0
}

export function deriveEvidenceLevel(series: RevenueSeries | null): PerformanceSituation['evidence'] {
  const sampleSize = acceptedCount(series)
  const comparablePeriod = Boolean(series && series.previousTotal > 0)
  if (sampleSize === 0) return { level: 'insufficient', sampleSize, comparablePeriod, caveats: ['Aucun devis accepté sur la période.'] }
  if (sampleSize === 1) return { level: 'weak', sampleSize, comparablePeriod, caveats: ['Un seul devis accepté et une seule journée active.'] }
  return { level: sampleSize >= 4 && comparablePeriod ? 'strong' : 'moderate', sampleSize, comparablePeriod, caveats: comparablePeriod ? [] : ['La période précédente ne permet pas une comparaison en pourcentage fiable.'] }
}

export function derivePerformanceConclusion(kpis: KPIResult[], analytics: PerformanceAnalytics | null, periodLabel: string): PerformanceSituation {
  const revenue = kpis.find((kpi) => kpi.id === 'revenue')
  const evidence = deriveEvidenceLevel(analytics?.revenueSeries ?? null)
  const amount = revenue?.value ?? 0
  if (amount <= 0) return { id: 'insufficient-production', kind: 'insufficient_evidence', observedFacts: ['Aucun devis accepté sur cette période.'], interpretation: 'Les données disponibles ne permettent pas de conclure sur la production commerciale.', evidence, conclusion: 'Conclusion impossible pour le moment.' }
  const count = evidence.sampleSize ?? 0
  const fact = `Sur ${periodLabel.toLowerCase()}, ${count === 1 ? 'un devis accepté représente' : `${count} journées avec des devis acceptés représentent`} ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)} TTC.`
  return { id: 'accepted-production', kind: 'production', observedFacts: [fact, 'Base temporelle : date d’acceptation du devis lorsque disponible.'], interpretation: evidence.level === 'weak' ? 'Le signal est positif, mais l’échantillon est trop faible pour parler de tendance durable.' : 'La production observée est étayée par plusieurs décisions commerciales.', evidence, conclusion: evidence.level === 'weak' ? 'Signal à confirmer.' : 'Évolution comprise.', recommendation: undefined }
}

export function derivePerformanceVisualization(series: RevenueSeries | null): 'empty_state' | 'single_event' | 'few_events' | 'time_series' {
  const count = acceptedCount(series)
  if (count === 0) return 'empty_state'
  if (count === 1) return 'single_event'
  if (count < 5) return 'few_events'
  return 'time_series'
}

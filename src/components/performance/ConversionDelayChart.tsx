'use client'

import ChartCard from './ChartCard'
import { formatDurationMinutes } from '@/src/lib/performance/performance-format'
import type { StageDurationMetric } from '@/src/lib/performance/performance-types'

export default function ConversionDelayChart({ metrics, loading, error, onRetry }: {
  metrics: StageDurationMetric[] | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const available = (metrics || []).filter((metric) => metric.available)
  const empty = !loading && !error && available.length === 0

  return (
    <ChartCard title="Delai moyen par etape" subtitle="Etapes avec date fiable" loading={loading} error={error} empty={empty} emptyMessage="Pas assez de donnees pour calculer ce delai." onRetry={onRetry}>
      {metrics && metrics.length > 0 && (
        <ul className="space-y-2" aria-label="Delai moyen par etape">
          {metrics.map((metric) => (
            <li key={metric.id} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700">{metric.label}</span>
                <span className="shrink-0 font-medium text-slate-600">{metric.available ? `${formatDurationMinutes(metric.averageMinutes || 0)} - ${metric.sampleSize} dossier${metric.sampleSize > 1 ? 's' : ''}` : 'Indisponible'}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{metric.available ? "Moyenne calculee sur les dossiers disposant d'une date fiable." : metric.unavailableReason}</p>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  )
}

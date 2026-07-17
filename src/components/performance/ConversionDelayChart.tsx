'use client'

import ChartCard from './ChartCard'
import { formatDurationMinutes } from '@/src/lib/performance/performance-format'
import type { StageDurationMetric } from '@/src/lib/performance/performance-types'

export default function ConversionDelayChart({
  metrics,
  loading,
  error,
  onRetry,
}: {
  metrics: StageDurationMetric[] | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const available = (metrics || []).filter((metric) => metric.available)
  const empty = !loading && !error && available.length === 0
  const maxMinutes = available.length > 0 ? Math.max(...available.map((metric) => metric.averageMinutes || 0), 1) : 1

  return (
    <ChartCard
      title="Délai moyen par étape"
      subtitle="Étapes avec date fiable"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Pas assez de données pour calculer ce délai."
      onRetry={onRetry}
    >
      {metrics && metrics.length > 0 && (
        <ul className="space-y-2" aria-label="Délai moyen par étape">
          {metrics.map((metric) => (
            <li key={metric.id}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700">{metric.label}</span>
                <span className="shrink-0 text-slate-500">
                  {metric.available
                    ? `${formatDurationMinutes(metric.averageMinutes || 0)} · ${metric.sampleSize} dossier${metric.sampleSize > 1 ? 's' : ''}`
                    : 'Indisponible'}
                </span>
              </div>
              {metric.available ? (
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-[width] duration-500"
                    style={{ width: `${Math.max(((metric.averageMinutes || 0) / maxMinutes) * 100, 6)}%` }}
                  />
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">{metric.unavailableReason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  )
}

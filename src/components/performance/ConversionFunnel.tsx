'use client'

import ChartCard from './ChartCard'
import { formatKPIValue, formatRatioAsPercent } from '@/src/lib/performance/performance-format'
import type { FunnelStage } from '@/src/lib/performance/performance-types'

export default function ConversionFunnel({
  stages,
  loading,
  error,
  onRetry,
}: {
  stages: FunnelStage[] | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const empty = !loading && !error && (!stages || stages.every((stage) => stage.count === 0))
  const maxCount = stages && stages.length > 0 ? Math.max(1, ...stages.map((stage) => stage.count)) : 1

  return (
    <ChartCard
      title="Tunnel de conversion commercial"
      subtitle="Dossiers créés sur la période"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Aucun dossier créé sur cette période."
      onRetry={onRetry}
    >
      {stages && stages.length > 0 && (
        <>
        <p className="mb-3 text-xs leading-5 text-slate-500">Le tunnel décrit les dossiers créés sur cette période. Il aide à localiser une attente, sans conclure à une baisse durable lorsque l’échantillon est faible.</p>
        <ol className="space-y-2" aria-label="Tunnel de conversion commercial">
          {stages.map((stage) => {
            const widthPercent = Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 8 : 0)
            return (
              <li key={stage.id}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700">{stage.label}</span>
                  <span className="shrink-0 text-slate-500">
                    {stage.count} dossier{stage.count > 1 ? 's' : ''}
                    {stage.conversionFromPrevious !== null && ` · ${formatRatioAsPercent(stage.conversionFromPrevious)}`}
                    {stage.value !== null && stage.value > 0 && ` · ${formatKPIValue(stage.value, 'currency')}`}
                  </span>
                </div>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-[width] duration-500"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ol>
        </>
      )}
    </ChartCard>
  )
}

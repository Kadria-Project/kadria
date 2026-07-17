'use client'

import { Download } from 'lucide-react'
import type { PerformancePeriodKey } from '@/src/lib/performance/performance-types'
import PerformanceFilters from './PerformanceFilters'

export default function PerformanceHeader({
  period,
  onPeriodChange,
}: {
  period: PerformancePeriodKey
  onPeriodChange: (period: PerformancePeriodKey) => void
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-950">Performance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Analysez votre activité et pilotez votre croissance.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PerformanceFilters value={period} onChange={onPeriodChange} />
        <button
          type="button"
          disabled
          aria-label="Exporter les données de performance (bientôt disponible)"
          title="Bientôt disponible"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
        >
          <Download className="size-4" aria-hidden="true" />
          Exporter
        </button>
      </div>
    </header>
  )
}

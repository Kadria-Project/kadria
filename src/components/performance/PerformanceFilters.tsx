'use client'

import { PERFORMANCE_PERIODS } from '@/src/lib/performance/date-range'
import type { PerformancePeriodKey } from '@/src/lib/performance/performance-types'

export default function PerformanceFilters({
  value,
  onChange,
}: {
  value: PerformancePeriodKey
  onChange: (period: PerformancePeriodKey) => void
}) {
  return (
    <div role="radiogroup" aria-label="Période d'analyse" className="flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
      {PERFORMANCE_PERIODS.map((option) => {
        const active = option.key === value
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.key)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 ${
              active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

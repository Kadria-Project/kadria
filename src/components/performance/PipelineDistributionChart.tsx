'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import ChartCard from './ChartCard'
import type { PipelineDistribution } from '@/src/lib/performance/performance-types'

const STATUS_COLORS: string[] = [
  '#059669', '#0891b2', '#7c3aed', '#2563eb', '#d97706',
  '#db2777', '#16a34a', '#64748b', '#94a3b8', '#e11d48', '#cbd5e1',
]

function colorFor(index: number): string {
  return STATUS_COLORS[index % STATUS_COLORS.length]
}

function TooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: { status: string; count: number; percent: number } }> }) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-950">{item.status}</p>
      <p className="mt-0.5 text-slate-600">
        {item.count} dossier{item.count > 1 ? 's' : ''} · {item.percent.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
      </p>
    </div>
  )
}

export default function PipelineDistributionChart({
  distribution,
  loading,
  error,
  onRetry,
}: {
  distribution: PipelineDistribution | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const empty = !loading && !error && (!distribution || distribution.total === 0)

  return (
    <ChartCard
      title="Répartition du pipeline"
      subtitle="Statut actuel des dossiers créés sur la période"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Aucun dossier créé sur cette période."
      onRetry={onRetry}
    >
      {distribution && distribution.total > 0 && (
        <div>
          <div className="relative mx-auto h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution.statuses}
                  dataKey="count"
                  nameKey="status"
                  innerRadius="60%"
                  outerRadius="100%"
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={500}
                >
                  {distribution.statuses.map((entry, index) => (
                    <Cell key={entry.status} fill={colorFor(index)} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-slate-950">{distribution.total}</span>
              <span className="text-[10px] text-slate-500">dossiers</span>
            </div>
          </div>

          <ul className="mt-3 space-y-1.5" aria-label="Répartition par statut">
            {distribution.statuses.map((item, index) => (
              <li key={item.status} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-slate-700">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(index) }} />
                  <span className="truncate">{item.status}</span>
                </span>
                <span className="shrink-0 font-semibold text-slate-950">
                  {item.count} · {item.percent.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}

'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from './ChartCard'
import { formatKPIValue } from '@/src/lib/performance/performance-format'
import type { RevenueSeries } from '@/src/lib/performance/performance-types'

function currencyAxis(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)} k€`
  return `${Math.round(value)} €`
}

function TooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-950">{label}</p>
      <p className="mt-0.5 text-emerald-700">{formatKPIValue(payload[0].value, 'currency')}</p>
    </div>
  )
}

export default function RevenueEvolutionChart({
  series,
  periodLabel,
  loading,
  error,
  onRetry,
}: {
  series: RevenueSeries | null
  periodLabel: string
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const empty = !loading && !error && (!series || series.points.every((point) => point.revenue === 0))

  return (
    <ChartCard
      title="Évolution du chiffre d'affaires"
      subtitle={periodLabel}
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Aucun chiffre d'affaires gagné sur cette période."
      onRetry={onRetry}
    >
      {series && series.points.length > 0 && (
        <>
          <div className="h-56 w-full" role="img" aria-label={`Évolution du chiffre d'affaires : ${series.points.map((p) => `${p.label} ${formatKPIValue(p.revenue, 'currency')}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tickFormatter={currencyAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<TooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                  isAnimationActive
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="sr-only">
            Tableau des valeurs : {series.points.map((p) => `${p.label} : ${formatKPIValue(p.revenue, 'currency')}`).join(' ; ')}
          </p>
        </>
      )}
    </ChartCard>
  )
}

'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from './ChartCard'
import { formatDeltaPercent, formatKPIValue } from '@/src/lib/performance/performance-format'
import type { RevenueSeries } from '@/src/lib/performance/performance-types'

function currencyAxis(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)} k€`
  return `${Math.round(value)} €`
}

function TooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-xl border border-emerald-100 bg-white/95 px-3 py-2 text-xs shadow-[0_10px_28px_rgba(15,34,50,0.14)] backdrop-blur">
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
  const activePoints = series?.points.filter((point) => point.revenue > 0) ?? []
  const bestPoint = activePoints.reduce<RevenueSeries['points'][number] | null>((best, point) => (!best || point.revenue > best.revenue ? point : best), null)
  const variation = series && series.previousTotal > 0
    ? ((series.total - series.previousTotal) / series.previousTotal) * 100
    : null
  const weeklyAverage = series?.granularity === 'week' && activePoints.length > 0
    ? series.total / activePoints.length
    : null

  return (
    <ChartCard
      title="Évolution du chiffre d'affaires"
      subtitle={periodLabel}
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Aucun chiffre d'affaires gagné sur cette période."
      onRetry={onRetry}
      footer={series && activePoints.length > 0 ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {activePoints.length === 1 && <p className="mb-2 text-[11px] text-slate-500">Une seule journée de chiffre d&apos;affaires enregistrée sur cette période.</p>}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
            <div><dt className="text-slate-500">CA total</dt><dd className="mt-0.5 font-semibold text-slate-900">{formatKPIValue(series.total, 'currency')}</dd></div>
            <div><dt className="text-slate-500">Variation</dt><dd className="mt-0.5 font-semibold text-slate-900">{variation === null ? '—' : formatDeltaPercent(variation)}</dd></div>
            <div><dt className="text-slate-500">Meilleur jour</dt><dd className="mt-0.5 truncate font-semibold text-slate-900">{bestPoint ? `${bestPoint.label} · ${formatKPIValue(bestPoint.revenue, 'currency')}` : '—'}</dd></div>
            <div><dt className="text-slate-500">Jours actifs</dt><dd className="mt-0.5 font-semibold text-slate-900">{activePoints.length}</dd></div>
            {weeklyAverage !== null && <div className="col-span-2 sm:col-span-4"><dt className="inline text-slate-500">Moyenne par semaine active</dt><dd className="ml-1 inline font-semibold text-slate-900">{formatKPIValue(weeklyAverage, 'currency')}</dd></div>}
          </dl>
        </div>
      ) : undefined}
    >
      {series && series.points.length > 0 && (
        <>
          <div className="h-32 w-full" role="img" aria-label={`Évolution du chiffre d'affaires : ${series.points.map((point) => `${point.label} ${formatKPIValue(point.revenue, 'currency')}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tickFormatter={currencyAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<TooltipContent />} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill="url(#revenueFill)" isAnimationActive animationDuration={650} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="sr-only">Tableau des valeurs : {series.points.map((point) => `${point.label} : ${formatKPIValue(point.revenue, 'currency')}`).join(' ; ')}</p>
        </>
      )}
    </ChartCard>
  )
}

'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from './ChartCard'
import { formatRatioAsPercent } from '@/src/lib/performance/performance-format'
import type { ConversionRateSeries } from '@/src/lib/performance/performance-types'

function TooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-950">{label}</p>
      <p className="mt-0.5 text-emerald-700">{formatRatioAsPercent(payload[0].value)}</p>
    </div>
  )
}

export default function ConversionRateChart({
  series,
  loading,
  error,
  onRetry,
}: {
  series: ConversionRateSeries | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const empty = !loading && !error && (!series || series.points.every((point) => point.qualifiedCount === 0))
  const chartData = (series?.points || []).map((point) => ({ ...point, ratePercent: point.rate * 100 }))

  return (
    <ChartCard
      title="Évolution du taux de transformation"
      subtitle={series ? `Moyenne : ${formatRatioAsPercent(series.average)}` : undefined}
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Pas assez de dossiers qualifiés pour calculer ce taux."
      onRetry={onRetry}
    >
      {series && chartData.length > 0 && (
        <div className="h-52 w-full" role="img" aria-label={`Taux de transformation : ${chartData.map((p) => `${p.label} ${formatRatioAsPercent(p.rate)}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<TooltipContent />} />
              <Line type="monotone" dataKey="ratePercent" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} isAnimationActive animationDuration={500} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

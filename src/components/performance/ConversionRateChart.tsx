'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from './ChartCard'
import { formatRatioAsPercent } from '@/src/lib/performance/performance-format'
import type { ConversionRateSeries, FunnelStage } from '@/src/lib/performance/performance-types'

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
  funnel,
  loading,
  error,
  onRetry,
}: {
  series: ConversionRateSeries | null
  funnel?: FunnelStage[] | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const empty = !loading && !error && (!series || series.points.every((point) => point.qualifiedCount === 0))
  const chartData = (series?.points || []).map((point) => ({ ...point, ratePercent: point.rate * 100 }))
  const funnelById = new Map((funnel || []).map((stage) => [stage.id, stage]))
  const received = funnelById.get('received')?.count ?? 0
  const qualified = funnelById.get('qualified')?.count ?? 0
  const quoteSent = funnelById.get('quoteSent')?.count ?? 0
  const quoteAccepted = funnelById.get('quoteAccepted')?.count ?? 0
  const largestDrop = (funnel || []).slice(1).reduce<FunnelStage | null>((largest, stage) => {
    if (stage.conversionFromPrevious === null) return largest
    return !largest || stage.conversionFromPrevious < (largest.conversionFromPrevious ?? 1) ? stage : largest
  }, null)

  return (
    <ChartCard
      title="Évolution du taux de transformation"
      subtitle={series ? `Moyenne : ${formatRatioAsPercent(series.average)}` : undefined}
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Pas assez de dossiers qualifiés pour calculer ce taux."
      onRetry={onRetry}
      footer={series ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {quoteAccepted === 0 && <p className="mb-2 text-[11px] text-slate-500">Aucun devis accepté sur la période.</p>}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
            <div><dt className="text-slate-500">Taux actuel</dt><dd className="mt-0.5 font-semibold text-slate-900">{formatRatioAsPercent(series.average)}</dd></div>
            <div><dt className="text-slate-500">Demandes</dt><dd className="mt-0.5 font-semibold text-slate-900">{received}</dd></div>
            <div><dt className="text-slate-500">Qualifiés</dt><dd className="mt-0.5 font-semibold text-slate-900">{qualified}</dd></div>
            <div><dt className="text-slate-500">Devis envoyés</dt><dd className="mt-0.5 font-semibold text-slate-900">{quoteSent}</dd></div>
            <div><dt className="text-slate-500">Devis acceptés</dt><dd className="mt-0.5 font-semibold text-slate-900">{quoteAccepted}</dd></div>
            <div><dt className="text-slate-500">Plus forte déperdition</dt><dd className="mt-0.5 font-semibold text-slate-900">{largestDrop ? `${largestDrop.label} · ${formatRatioAsPercent(largestDrop.conversionFromPrevious ?? 0)}` : '—'}</dd></div>
          </dl>
        </div>
      ) : undefined}
    >
      {series && chartData.length > 0 && (
        <div className="h-32 w-full" role="img" aria-label={`Taux de transformation : ${chartData.map((point) => `${point.label} ${formatRatioAsPercent(point.rate)}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<TooltipContent />} />
              <Line type="monotone" dataKey="ratePercent" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} isAnimationActive animationDuration={650} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

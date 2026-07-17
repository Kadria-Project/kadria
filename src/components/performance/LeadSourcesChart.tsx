'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import ChartCard from './ChartCard'
import type { LeadSourceDistribution } from '@/src/lib/performance/performance-types'

const SOURCE_COLORS: Record<string, string> = {
  'Assistant vocal': '#059669',
  'Assistant web': '#0891b2',
  'Site vitrine': '#7c3aed',
  Google: '#2563eb',
  WhatsApp: '#16a34a',
  'Réseaux sociaux': '#db2777',
  Recommandation: '#d97706',
  'Saisie manuelle': '#64748b',
  Autres: '#94a3b8',
  'Source inconnue': '#cbd5e1',
}

function TooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: { source: string; count: number; percent: number } }> }) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-950">{item.source}</p>
      <p className="mt-0.5 text-slate-600">
        {item.count} dossier{item.count > 1 ? 's' : ''} · {item.percent.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
      </p>
    </div>
  )
}

export default function LeadSourcesChart({
  distribution,
  loading,
  error,
  onRetry,
}: {
  distribution: LeadSourceDistribution | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const empty = !loading && !error && (!distribution || distribution.total === 0)

  return (
    <ChartCard
      title="Sources des dossiers"
      subtitle="Origine des dossiers créés"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Aucune source de dossier disponible sur cette période."
      onRetry={onRetry}
    >
      {distribution && distribution.total > 0 && (
        <div>
          <div className="relative mx-auto h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution.sources}
                  dataKey="count"
                  nameKey="source"
                  innerRadius="65%"
                  outerRadius="100%"
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={500}
                >
                  {distribution.sources.map((entry) => (
                    <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || SOURCE_COLORS.Autres} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-slate-950">{distribution.total}</span>
              <span className="text-[11px] text-slate-500">dossiers</span>
            </div>
          </div>

          <ul className="mt-4 space-y-1.5" aria-label="Détail des sources de dossiers">
            {distribution.sources.map((item) => (
              <li key={item.source} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-slate-700">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: SOURCE_COLORS[item.source] || SOURCE_COLORS.Autres }}
                  />
                  <span className="truncate">{item.source}</span>
                </span>
                <span className="shrink-0 font-semibold text-slate-950">
                  {item.count} · {item.percent.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Bientôt disponible"
            className="mt-4 text-xs font-semibold text-slate-400"
          >
            Voir le détail des sources
          </button>
        </div>
      )}
    </ChartCard>
  )
}

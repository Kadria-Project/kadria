'use client'

import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatDeltaPercent, formatKPIValue } from '@/src/lib/performance/performance-format'
import type { KPIResult } from '@/src/lib/performance/performance-types'

export type KPICardContent = { id: string; title: string; icon: LucideIcon; ariaLabel: string }

export default function KPICard({ content, result, loading, error, onRetry }: { content: KPICardContent; result?: KPIResult; loading?: boolean; error?: string | null; onRetry?: () => void }) {
  const Icon = content.icon
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alert"><p className="text-sm font-bold text-slate-950">{content.title}</p><p className="mt-1 text-xs text-slate-600">Indicateur indisponible.</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 text-xs font-semibold text-rose-700">Réessayer</button>}</div>
  if (loading || !result) return <div className="rounded-2xl border border-slate-200 bg-white p-4" aria-hidden="true"><div className="h-4 w-24 animate-pulse rounded bg-slate-100" /><div className="mt-3 h-7 w-28 animate-pulse rounded bg-slate-100" /></div>
  const down = result.comparison.trend === 'down'
  const Trend = down ? TrendingDown : TrendingUp
  const wording = content.id === 'revenue' ? (down ? 'La production ralentit.' : 'Très bonne période.') : content.id === 'conversionRate' ? (down ? 'Des devis restent sans décision.' : 'Les décisions progressent.') : (down ? 'Le flux de nouveaux dossiers baisse.' : 'Le flux de dossiers se maintient.')
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,34,50,.03)]" aria-label={content.ariaLabel}><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{content.title}</p><span className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-600"><Icon className="size-4" aria-hidden="true" /></span></div><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{formatKPIValue(result.value, result.format)}</p><p className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${down ? 'text-rose-700' : 'text-emerald-700'}`}><Trend className="size-3.5" aria-hidden="true" />{formatDeltaPercent(result.comparison.deltaPercent)}</p><p className="mt-1 text-xs leading-5 text-slate-600">{wording}</p></article>
}

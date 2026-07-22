'use client'

import Link from 'next/link'
import { AlertCircle, Clock, Info, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import type { InsightIcon, PerformanceInsight } from '@/src/lib/performance/performance-types'

const ICONS: Record<InsightIcon, typeof TrendingUp> = { trendUp: TrendingUp, trendDown: TrendingDown, alert: AlertCircle, clock: Clock, target: Sparkles, info: Info }
const TONES: Record<PerformanceInsight['level'], string> = { positive: 'bg-emerald-50 text-emerald-700', attention: 'bg-amber-50 text-amber-700', critical: 'bg-rose-50 text-rose-700', opportunity: 'bg-sky-50 text-sky-700', information: 'bg-slate-50 text-slate-600' }

export default function InsightsPanel({ insights, loading, error, onRetry }: { insights: PerformanceInsight[] | null; loading: boolean; error?: string | null; onRetry?: () => void }) {
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alert"><p className="text-sm text-slate-700">Les signaux sont momentanément indisponibles.</p>{onRetry && <button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold text-rose-700">Réessayer</button>}</div>
  if (loading || !insights) return <div aria-hidden="true" className="animate-pulse space-y-2"><div className="h-20 rounded-xl bg-slate-100" /><div className="h-20 rounded-xl bg-slate-100" /></div>
  if (!insights.length) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucun signal commercial important sur cette période.</p>
  return <ul className="grid gap-3 md:grid-cols-3">{insights.slice(0, 3).map((insight) => { const Icon = ICONS[insight.icon]; return <li key={insight.id} className="rounded-2xl border border-slate-200 bg-white p-4"><span className={`grid size-8 place-items-center rounded-lg ${TONES[insight.level]}`}><Icon className="size-4" aria-hidden="true" /></span><h3 className="mt-3 text-sm font-bold text-slate-950">{insight.title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{insight.explanation}</p>{insight.ctaLabel && insight.destination && <Link href={insight.destination} className="mt-3 inline-flex text-xs font-semibold text-emerald-700 hover:text-emerald-800">{insight.ctaLabel} →</Link>}</li> })}</ul>
}

'use client'

import { BriefcaseBusiness, TrendingDown, TrendingUp } from 'lucide-react'
import { formatDeltaPercent, formatKPIValue } from '@/src/lib/performance/performance-format'
import type { KPIResult, PerformanceAnalytics } from '@/src/lib/performance/performance-types'

export type ExecutiveSummaryProps = { kpis: KPIResult[]; analytics: PerformanceAnalytics | null }

export default function ExecutiveSummary({ kpis, analytics }: ExecutiveSummaryProps) {
  const revenue = kpis.find((kpi) => kpi.id === 'revenue')
  const conversion = kpis.find((kpi) => kpi.id === 'conversionRate')
  const revenueUp = revenue?.comparison.trend === 'up'
  const atRisk = analytics?.atRisk
  const headline = revenueUp ? 'Votre activité progresse.' : revenue?.comparison.trend === 'down' ? 'Votre activité demande une attention ciblée.' : 'Votre activité reste stable.'

  return <section className="rounded-2xl border border-emerald-100 bg-[linear-gradient(100deg,rgba(236,253,245,0.92),rgba(255,255,255,0.96))] px-4 py-3.5 shadow-[0_6px_20px_rgba(15,34,50,0.035)] sm:px-5" aria-label="Synthèse exécutive"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><BriefcaseBusiness className="size-4" aria-hidden="true" /></span><div className="min-w-0"><p className="text-sm font-bold tracking-tight text-slate-950">{headline}</p><div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-slate-600">{revenue?.comparison.deltaPercent !== null && revenue?.comparison.deltaPercent !== undefined && <span className="inline-flex items-center gap-1"><TrendingUp className={`size-3.5 ${revenueUp ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true" />Le chiffre d&apos;affaires évolue de <strong className="font-semibold text-slate-800">{formatDeltaPercent(revenue.comparison.deltaPercent)}</strong>.</span>}{atRisk && atRisk.count > 0 && <span><strong className="font-semibold text-slate-800">{atRisk.count} devis</strong> représentent <strong className="font-semibold text-slate-800">{formatKPIValue(atRisk.amount, 'currency')}</strong> à sécuriser.</span>}{conversion?.comparison.trend === 'down' && <span className="inline-flex items-center gap-1"><TrendingDown className="size-3.5 text-amber-600" aria-hidden="true" />Le taux de transformation baisse : une relance rapide est recommandée.</span>}</div></div></div></section>
}

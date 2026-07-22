'use client'

import { BriefcaseBusiness } from 'lucide-react'
import { formatKPIValue } from '@/src/lib/performance/performance-format'
import type { KPIResult, PerformanceAnalytics } from '@/src/lib/performance/performance-types'

export type ExecutiveSummaryProps = { kpis: KPIResult[]; analytics: PerformanceAnalytics | null }

export default function ExecutiveSummary({ kpis, analytics }: ExecutiveSummaryProps) {
  const revenue = kpis.find((kpi) => kpi.id === 'revenue')
  const atRisk = analytics?.atRisk
  const activity = revenue?.comparison.trend === 'up' ? 'progresse fortement' : revenue?.comparison.trend === 'down' ? 'demande votre attention' : 'reste stable'
  const decision = atRisk && atRisk.count > 0
    ? `Aujourd’hui, la meilleure décision est d’obtenir une réponse sur ces dossiers avant de chercher de nouveaux projets.`
    : 'Aujourd’hui, vous pouvez vous concentrer sur les prochains dossiers à faire avancer.'

  return <section className="rounded-2xl border border-emerald-100 bg-[linear-gradient(100deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))] px-5 py-5 shadow-[0_8px_26px_rgba(15,34,50,0.04)] sm:px-6" aria-label="Lecture dirigeant"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><BriefcaseBusiness className="size-5" aria-hidden="true" /></span><div className="min-w-0 max-w-3xl"><p className="text-base font-bold tracking-tight text-slate-950">Bonjour. Ton activité {activity}.</p><p className="mt-2 text-sm leading-6 text-slate-700">{formatKPIValue(revenue?.value ?? 0, 'currency')} ont été signés sur la période.</p>{atRisk && atRisk.count > 0 && <p className="mt-1 text-sm leading-6 text-slate-700">En revanche, {formatKPIValue(atRisk.amount, 'currency')} attendent encore une décision sur {atRisk.count} devis.</p>}<p className="mt-2 text-sm font-semibold leading-6 text-emerald-900">{decision}</p></div></div></section>
}

'use client'

import { ChevronDown, CircleCheck, CircleHelp, FileCheck2, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { formatKPIValue } from '@/src/lib/performance/performance-format'
import type { KPIResult, PerformanceSituation } from '@/src/lib/performance/performance-types'

const evidenceCopy = { strong: 'Preuve solide', moderate: 'Preuve étayée', weak: 'Signal à confirmer', insufficient: 'Conclusion impossible pour le moment' } as const

export default function PerformanceEvidence({ situation, kpis }: { situation: PerformanceSituation; kpis: KPIResult[] }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const revenue = kpis.find((kpi) => kpi.id === 'revenue')
  const created = kpis.find((kpi) => kpi.id === 'createdProjects')
  const conversion = kpis.find((kpi) => kpi.id === 'conversionRate')
  const basket = kpis.find((kpi) => kpi.id === 'averageBasket')
  const accepted = revenue?.value ?? 0
  const proofTone = situation.evidence.level === 'weak' || situation.evidence.level === 'insufficient' ? 'bg-amber-50 text-amber-800 ring-amber-100' : 'bg-emerald-50 text-emerald-800 ring-emerald-100'
  return <>
    <section aria-label="Conclusion de performance" className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-[radial-gradient(circle_at_90%_15%,rgba(209,250,229,.72),transparent_30%),linear-gradient(110deg,#f0fdf7,#ffffff_64%)] px-5 py-5 shadow-[0_8px_30px_rgba(15,34,50,0.035)] sm:px-6">
      <div className="max-w-4xl"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Performance vérifiée</p><h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{situation.observedFacts[0]}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{situation.interpretation}</p><div className="mt-4 flex flex-wrap items-center gap-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${proofTone}`}><CircleCheck className="size-3.5" />{evidenceCopy[situation.evidence.level]}</span><button type="button" onClick={() => setDetailsOpen((open) => !open)} aria-expanded={detailsOpen} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Pourquoi cette conclusion reste prudente <ChevronDown className={`size-3.5 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} /></button></div>{detailsOpen && <div className="mt-3 rounded-xl border border-white/80 bg-white/70 px-3.5 py-3 text-xs leading-5 text-slate-600">{situation.evidence.caveats.length ? situation.evidence.caveats.join(' ') : 'Les données sont comparables et suffisamment nombreuses pour cette lecture.'}</div>}</div>
    </section>
    <section aria-label="Preuves essentielles" className="grid gap-3 md:grid-cols-[minmax(0,1.45fr)_minmax(220px,.8fr)]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,34,50,.03)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[.13em] text-slate-500">Preuve principale</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{formatKPIValue(accepted, 'currency')}</p><p className="mt-1 text-sm font-semibold text-slate-800">Montant TTC des devis acceptés</p><p className="mt-1 text-xs leading-5 text-slate-500">Selon la date d’acceptation lorsqu’elle est disponible.</p></div><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><FileCheck2 className="size-5" /></span></div></article>
      <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"><p className="text-[11px] font-bold uppercase tracking-[.13em] text-slate-500">Contexte</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{created?.value ?? 0} dossiers créés</p><p className="mt-1 text-xs leading-5 text-slate-500">{created && created.comparison.previousValue > 0 ? `${created.comparison.deltaAbsolute >= 0 ? '+' : ''}${created.comparison.deltaAbsolute} par rapport à la période comparable.` : 'La période précédente ne permet pas une comparaison solide.'}</p>{accepted === 0 && <p className="mt-4 flex gap-2 text-xs leading-5 text-slate-600"><CircleHelp className="mt-0.5 size-3.5 shrink-0" />Aucun montant accepté ne permet encore de calculer une production commerciale.</p>}{accepted > 0 && (conversion?.value ?? 0) === 0 && <p className="mt-4 flex gap-2 text-xs leading-5 text-slate-600"><ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />{basket?.value ? `Panier moyen calculé sur les devis acceptés : ${formatKPIValue(basket.value, 'currency')}.` : 'Pas encore assez de décisions finalisées pour calculer un indicateur complémentaire représentatif.'}</p>}</article>
    </section>
  </>
}

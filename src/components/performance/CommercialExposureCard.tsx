'use client'

import Link from 'next/link'
import { ArrowRight, Clock3 } from 'lucide-react'
import { formatKPIValue } from '@/src/lib/performance/performance-format'
import type { AtRiskOpportunitySummary } from '@/src/lib/performance/performance-types'

export default function CommercialExposureCard({ summary, loading }: { summary: AtRiskOpportunitySummary | null; loading: boolean }) {
  if (loading) return <div className="min-h-40 animate-pulse rounded-2xl border border-slate-200 bg-white p-5" aria-hidden="true" />
  const count = summary?.count ?? 0
  return <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700"><Clock3 className="size-4" /></span><div><p className="text-sm font-bold text-slate-950">Devis sans décision</p>{count > 0 ? <><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{formatKPIValue(summary?.amount ?? 0, 'currency')}</p><p className="mt-1 text-xs leading-5 text-slate-700">{count} devis restent sans décision depuis plus de 5 jours.</p><p className="mt-1 text-xs leading-5 text-slate-500">Ce constat ne signifie pas que ces devis sont perdus.</p><Link href="/dashboard-v2/suivi" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-900">Voir les devis à suivre <ArrowRight className="size-3.5" /></Link></> : <p className="mt-2 text-sm text-slate-600">Aucun devis sans décision prolongée détecté.</p>}</div></div></section>
}

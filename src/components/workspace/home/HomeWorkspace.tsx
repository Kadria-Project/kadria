'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert, RefreshCw, Sparkles } from 'lucide-react'
import type { HomeBrief, HomeBriefItem } from './home-contract'

type Props = {
  firstName: string | null
  brief: HomeBrief | null
  loadState: 'loading' | 'ready' | 'error'
  onRefresh: () => Promise<void>
}

const proofStyles = {
  high: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-slate-200 bg-slate-50 text-slate-700',
} as const

function BriefCard({ item, primary = false }: { item: HomeBriefItem; primary?: boolean }) {
  return <article className={`rounded-2xl border p-5 shadow-sm ${primary ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Fait observé</p><h3 className="mt-1 text-base font-semibold text-[#0b2232]">{item.observation}</h3></div>
      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${proofStyles[item.proofLevel]}`}>{item.proofLabel}</span>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Pourquoi c’est important</p><p className="mt-1 text-sm leading-6 text-slate-700">{item.whyItMatters}</p></div>
      <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Conséquence possible</p><p className="mt-1 text-sm leading-6 text-slate-700">{item.consequence}</p></div>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"><p className="text-sm font-medium text-[#0b2232]">Je vous recommande : {item.recommendation}</p><Link href={item.action.href} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 focus-visible:outline-offset-2">{item.action.label}<ArrowRight className="size-4" aria-hidden="true" /></Link></div>
  </article>
}

function FocusCard({ label, item, icon: Icon }: { label: string; item: HomeBriefItem; icon: typeof Sparkles }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-slate-600"><Icon className="size-4 text-emerald-700" aria-hidden="true" /><p className="text-[11px] font-bold uppercase tracking-[0.14em]">{label}</p></div><h3 className="mt-3 text-lg font-semibold text-[#0b2232]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{item.whyItMatters}</p><p className="mt-3 text-sm font-medium text-slate-900">{item.recommendation}</p><Link href={item.action.href} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">{item.action.label}<ArrowRight className="size-4" aria-hidden="true" /></Link></section>
}

export default function HomeWorkspace({ firstName, brief, loadState, onRefresh }: Props) {
  if (loadState === 'loading' || !brief && loadState !== 'error') return <div className="mx-auto max-w-[960px] space-y-5 pb-4" aria-busy="true"><div className="h-40 animate-pulse rounded-2xl bg-slate-200" /><div className="h-64 animate-pulse rounded-2xl bg-slate-200" /></div>
  if (!brief) return <div className="mx-auto max-w-[760px] rounded-2xl border border-slate-200 bg-white p-6"><CircleAlert className="size-5 text-amber-600" aria-hidden="true" /><h2 className="mt-3 text-xl font-semibold text-[#0b2232]">Le brief est momentanément indisponible.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Vos données n’ont pas été modifiées. Réessayez pour actualiser la lecture de votre journée.</p><button type="button" onClick={() => void onRefresh()} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-emerald-950"><RefreshCw className="size-4" />Réessayer</button></div>

  return <div className="mx-auto max-w-[960px] space-y-6 pb-4">
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Votre brief du jour</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2232]">Bonjour{firstName ? ` ${firstName}` : ''}.</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{brief.situation}</p></section>
    {brief.attention.length > 0 ? <section><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Ce qui mérite votre attention</p><div className="mt-3 space-y-3">{brief.attention.map((item, index) => <BriefCard key={item.id} item={item} primary={index === 0} />)}</div></section> : <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" /><div><h2 className="font-semibold text-emerald-950">Votre journée est sous contrôle.</h2><p className="mt-1 text-sm leading-6 text-emerald-900/80">Aucune décision immédiate n’est identifiée à partir des données disponibles.</p></div></div></section>}
    {(brief.opportunity || brief.risk) && <section className="grid gap-4 md:grid-cols-2">{brief.opportunity && <FocusCard label="Meilleure opportunité" item={brief.opportunity} icon={Sparkles} />}{brief.risk && <FocusCard label="Risque principal" item={brief.risk} icon={AlertTriangle} />}</section>}
    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Ce qui peut attendre</p><p className="mt-2 text-sm leading-6 text-slate-700">{brief.canWait}</p></section>
  </div>
}

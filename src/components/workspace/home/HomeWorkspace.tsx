'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, ClipboardList, FilePlus2, FolderPlus, RefreshCw, Sparkles, UserPlus } from 'lucide-react'
import type { HomeBrief, HomeBriefItem } from './home-contract'

type Props = { firstName: string | null; brief: HomeBrief | null; loadState: 'loading' | 'ready' | 'error'; onRefresh: () => Promise<void> }

const tones = ['border-rose-100 bg-rose-50/60 text-rose-700', 'border-amber-100 bg-amber-50/60 text-amber-700', 'border-emerald-100 bg-emerald-50/60 text-emerald-700']
const quickActions = [
  { label: 'Nouveau devis', href: '/dashboard-v2/suivi', icon: FilePlus2 },
  { label: 'Nouveau dossier', href: '/dashboard-v2/clients', icon: FolderPlus },
  { label: 'Créer un rendez-vous', href: '/dashboard-v2/agenda', icon: CalendarDays },
  { label: 'Ajouter un client', href: '/dashboard-v2/clients', icon: UserPlus },
  { label: 'Catalogue prestations', href: '/parametres/activite', icon: ClipboardList },
]

function PriorityCard({ item, index }: { item: HomeBriefItem; index: number }) {
  return <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,34,50,.035)] sm:grid-cols-[42px_minmax(0,1fr)_auto] sm:items-center sm:p-5">
    <span className={`grid size-10 place-items-center rounded-xl border text-sm font-bold ${tones[index]}`}>{index + 1}</span>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold tracking-tight text-slate-950">{item.title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{item.proofLabel}</span></div>{item.context ? <><p className="mt-1 text-sm font-semibold text-slate-800">{item.context.clientName}</p><p className="mt-0.5 text-xs text-slate-500">{item.context.projectTitle} · {item.context.status} · {item.context.value}</p></> : <p className="mt-1 text-sm text-slate-700">{item.observation}</p>}<p className="mt-2 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-700">Pourquoi aujourd’hui :</span> {item.whyItMatters}</p></div>
    <Link href={item.action.href} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">{item.action.label}<ArrowRight className="size-3.5" /></Link>
  </article>
}

function CanWait({ brief }: { brief: HomeBrief }) {
  const items = [brief.opportunity, brief.risk].filter((item): item is HomeBriefItem => Boolean(item)).slice(0, 2)
  return <section aria-labelledby="home-can-wait"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /><h2 id="home-can-wait" className="text-xs font-bold uppercase tracking-[.14em] text-slate-600">Ce qui peut attendre</h2></div><div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm leading-6 text-slate-600">{brief.canWait}</p>{items.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{items.map((item) => <Link key={item.id} href={item.action.href} className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"><span className="block truncate">{item.title}</span><span className="mt-0.5 block truncate font-normal text-slate-500">{item.recommendation}</span></Link>)}</div>}</div></section>
}

export default function HomeWorkspace({ firstName, brief, loadState, onRefresh }: Props) {
  if (loadState === 'loading' || (!brief && loadState !== 'error')) return <div className="mx-auto max-w-[1180px] space-y-4 pb-6" aria-busy="true"><div className="h-28 animate-pulse rounded-2xl bg-slate-200" /><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /></div>
  if (!brief) return <div className="mx-auto max-w-[760px] rounded-2xl border border-slate-200 bg-white p-6"><CircleAlert className="size-5 text-amber-600" /><h2 className="mt-3 text-xl font-semibold text-slate-950">Le brief est momentanément indisponible.</h2><button type="button" onClick={() => void onRefresh()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-emerald-950"><RefreshCw className="size-4" />Réessayer</button></div>
  const priorities = brief.attention.slice(0, 3)
  return <div className="mx-auto max-w-[1180px] space-y-7 pb-7">
    <header><h1 className="text-2xl font-bold tracking-tight text-slate-950">Bonjour{firstName ? ` ${firstName.trim()}` : ''}.</h1><p className="mt-2 text-sm text-slate-600">Voici les {priorities.length || 3} actions les plus importantes pour bien avancer aujourd’hui.</p></header>
    <section aria-labelledby="home-priorities"><div className="mb-3 flex items-center gap-2"><Sparkles className="size-4 text-emerald-600" /><h2 id="home-priorities" className="text-xs font-bold uppercase tracking-[.14em] text-slate-600">Vos 3 priorités du jour</h2></div>{priorities.length ? <div className="space-y-2">{priorities.map((item, index) => <PriorityCard key={item.id} item={item} index={index} />)}</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">Votre journée est sous contrôle. Aucun dossier ne demande une décision immédiate.</div>}</section>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]"><CanWait brief={brief} /><section aria-labelledby="home-agenda" className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Mon agenda</p><h2 id="home-agenda" className="mt-2 text-base font-bold text-slate-950">Aujourd’hui, puis demain</h2><p className="mt-2 text-sm leading-6 text-slate-600">Consultez vos rendez-vous sans alourdir votre brief du jour.</p><Link href="/dashboard-v2/agenda" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800">Voir l’agenda<ArrowRight className="size-4" /></Link></section></div>
    <section aria-labelledby="home-quick" className="rounded-2xl border border-slate-200 bg-white p-5"><h2 id="home-quick" className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Accès rapides</h2><div className="mt-3 grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">{quickActions.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="flex items-center gap-2 px-3 py-3 text-sm font-semibold text-slate-700 hover:text-emerald-700"><Icon className="size-4 text-slate-400" />{label}</Link>)}</div></section>
  </div>
}

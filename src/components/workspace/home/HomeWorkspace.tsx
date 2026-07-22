'use client'

import Link from 'next/link'
import { ArrowRight, CalendarCheck2, CalendarDays, CircleAlert, CircleDollarSign, ClipboardList, Clock3, FilePlus2, FileText, FileWarning, FolderPlus, MapPin, Phone, RefreshCw, Sparkles, TrendingUp, UserPlus, UserRound } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { ReactNode } from 'react'
import type { HomeBrief, HomeBriefItem } from './home-contract'
import { useShellContext } from '../shell/ShellContextProvider'
import { formatDeltaPercent, formatKPIValue } from '@/src/lib/performance/performance-format'
import { derivePerformanceVisualization } from '@/src/lib/performance/performance-insights'
import type { KPIResult, PerformanceAnalytics } from '@/src/lib/performance/performance-types'

type Props = { firstName: string | null; brief: HomeBrief | null; loadState: 'loading' | 'ready' | 'error'; onRefresh: () => Promise<void>; performance: { kpis: KPIResult[]; analytics: PerformanceAnalytics } | null }

const priorityStyles = [
  { accent: 'border-emerald-300 bg-emerald-50/45', number: 'border-emerald-200 bg-emerald-600 text-white', icon: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', cta: 'bg-emerald-600 text-white hover:bg-emerald-700', reason: 'text-emerald-700' },
  { accent: 'border-orange-200 bg-white', number: 'border-orange-200 bg-orange-500 text-white', icon: 'bg-orange-100 text-orange-600', dot: 'bg-orange-500', cta: 'border border-slate-200 bg-white text-slate-800 hover:border-orange-200 hover:bg-orange-50', reason: 'text-orange-700' },
  { accent: 'border-blue-200 bg-white', number: 'border-blue-200 bg-blue-600 text-white', icon: 'bg-blue-100 text-blue-600', dot: 'bg-blue-500', cta: 'border border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50', reason: 'text-blue-700' },
] as const

const quickActions = [
  { label: 'Nouveau dossier', href: '/dashboard-v2/clients', icon: FolderPlus },
  { label: 'Nouveau devis', href: '/dashboard-v2/suivi', icon: FilePlus2 },
  { label: 'Créer un rendez-vous', href: '/dashboard-v2/agenda', icon: CalendarDays },
  { label: 'Ajouter un client', href: '/dashboard-v2/clients', icon: UserPlus },
  { label: 'Catalogue prestations', href: '/parametres/activite', icon: ClipboardList },
]

function iconFor(item: HomeBriefItem, className: string): ReactNode {
  const text = `${item.title} ${item.action.label}`.toLowerCase()
  if (text.includes('rendez-vous') || text.includes('rendez vous')) return <CalendarCheck2 className={className} />
  if (text.includes('relance') || text.includes('appel')) return <Phone className={className} />
  if (text.includes('paiement')) return <CircleDollarSign className={className} />
  if (text.includes('dossier') || text.includes('compléter')) return <FileWarning className={className} />
  if (text.includes('client') || text.includes('avis')) return <UserRound className={className} />
  return <FileText className={className} />
}

function PriorityCard({ item, index }: { item: HomeBriefItem; index: number }) {
  const style = priorityStyles[index] || priorityStyles[2]
  const context = item.context
  return <article className={`flex h-full flex-col rounded-2xl border-l-[3px] p-4 shadow-[0_4px_18px_rgba(15,34,50,.035)] ${style.accent}`}>
    <div className="grid grid-cols-[28px_48px_minmax(0,1fr)] items-center gap-2.5"><span className={`grid size-6 place-items-center rounded-md text-[11px] font-bold ${style.number}`}>{index + 1}</span><span className={`grid size-12 place-items-center rounded-full ${style.icon}`}>{iconFor(item, 'size-5')}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="text-sm font-bold tracking-tight text-slate-950">{item.title}</h3><span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200/80">{item.proofLabel}</span></div></div></div>
    {context ? <><div className="mt-3"><p className="text-xs font-semibold text-slate-800">{context.clientName}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{context.projectTitle}</p></div><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500"><span className="font-semibold text-slate-700">{context.value}</span><span>{context.status}</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{context.timing}</span></div></> : <p className="mt-3 text-xs leading-5 text-slate-600">{item.observation}</p>}
    <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-slate-600"><span className={`mt-1 size-1.5 shrink-0 rounded-full ${style.dot}`} /><span><strong className={style.reason}>Pourquoi aujourd’hui :</strong> {item.whyItMatters}</span></p>
    <Link href={item.action.href} className={`mt-auto inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${style.cta}`}>{item.action.label}<ArrowRight className="size-3.5" /></Link>
  </article>
}

function Agenda({ brief }: { brief: HomeBrief }) {
  const events = brief.agenda.slice(0, 5)
  return <section aria-labelledby="home-agenda" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,34,50,.025)]">
    <div className="flex items-center justify-between gap-3"><h2 id="home-agenda" className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Mon agenda</h2><Link href="/dashboard-v2/agenda" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800">Voir l’agenda <ArrowRight className="ml-1 inline size-3" /></Link></div>
    {events.length ? <div className="mt-3 overflow-x-auto pb-1"><div className="grid min-w-[720px] grid-flow-col auto-cols-[minmax(210px,1fr)] gap-5">{events.map((event, index) => <article key={event.id} className="relative min-w-0"><div className="flex items-center gap-2"><span className="rounded-md bg-emerald-50 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">{event.day === 'today' ? 'Aujourd’hui' : 'Demain'}</span><span className="text-xs font-bold text-slate-900">{event.time}</span></div>{index < events.length - 1 ? <span className="absolute left-[calc(100%-10px)] top-[21px] h-px w-5 bg-emerald-200" /> : null}<span className="absolute left-0 top-[18px] size-2 rounded-full bg-emerald-500 ring-4 ring-white" /><div className="mt-3 border-l-2 border-emerald-100 pl-3"><div className="flex flex-wrap items-center gap-1.5"><p className="text-xs font-bold text-slate-800">{event.title}</p><span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">Rendez-vous</span></div><p className="mt-1 text-[11px] text-slate-500">{event.context}</p>{event.location ? <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="size-3" />{event.location}</p> : null}</div></article>)}</div></div> : <p className="mt-4 text-xs text-slate-500">Aucun rendez-vous prévu aujourd’hui ou demain.</p>}
  </section>
}

function CompactProduction({ performance }: { performance: { kpis: KPIResult[]; analytics: PerformanceAnalytics } }) {
  const series = performance.analytics.revenueSeries
  const revenue = performance.kpis.find((kpi) => kpi.id === 'revenue')
  if (!revenue || series.points.every((point) => point.revenue === 0)) return null
  const mode = derivePerformanceVisualization(series)
  const bestPoint = series.points.reduce<typeof series.points[number] | null>((best, point) => !best || point.revenue > best.revenue ? point : best, null)
  const trend = revenue.comparison.trend === 'up' ? 'text-emerald-700' : revenue.comparison.trend === 'down' ? 'text-rose-700' : 'text-slate-600'
  const trendLabel = revenue.comparison.trend === 'up' ? 'En hausse' : revenue.comparison.trend === 'down' ? 'En baisse' : 'Stable'
  return <div className="h-full border-slate-100 lg:border-l lg:pl-5">
    <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Production observée</p><p className="mt-0.5 text-xs text-slate-500">30 derniers jours</p></div><Link href="/dashboard-v2/performance" className="shrink-0 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">Voir Performance <ArrowRight className="ml-0.5 inline size-3" /></Link></div>
    <div className="mt-2 h-28" role="img" aria-label={`Évolution du CA signé : ${series.points.map((point) => `${point.label} ${formatKPIValue(point.revenue, 'currency')}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        {mode === 'few_events' ? <BarChart data={series.points} margin={{ top: 4, right: 2, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis hide /><Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} animationDuration={360} /></BarChart> : <AreaChart data={series.points} margin={{ top: 4, right: 2, left: -20, bottom: 0 }}><defs><linearGradient id="homeRevenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.28} /><stop offset="100%" stopColor="#059669" stopOpacity={0.03} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis hide /><Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill="url(#homeRevenueFill)" isAnimationActive animationDuration={420} /></AreaChart>}
      </ResponsiveContainer>
    </div>
    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[11px] sm:grid-cols-3"><div><p className="text-slate-500">CA signé</p><p className="mt-0.5 font-bold text-slate-900">{formatKPIValue(revenue.value, 'currency')}</p></div><div><p className="text-slate-500">Tendance</p><p className={`mt-0.5 font-bold ${trend}`}>{trendLabel}{revenue.comparison.deltaPercent === null ? '' : ` · ${formatDeltaPercent(revenue.comparison.deltaPercent)}`}</p></div><div className="col-span-2 sm:col-span-1"><p className="text-slate-500">Meilleur jour</p><p className="mt-0.5 font-bold text-slate-900">{bestPoint ? `${bestPoint.label} · ${formatKPIValue(bestPoint.revenue, 'currency')}` : '—'}</p></div></div>
  </div>
}

function ActivitySummary({ brief, performance }: { brief: HomeBrief; performance: Props['performance'] }) {
  const metrics = [
    ['Devis envoyés', brief.summary.quoteSent],
    ['Devis acceptés', brief.summary.quoteAccepted],
    ['Dossiers actifs', brief.summary.activeProjects],
    ['Rendez-vous', brief.agenda.length],
  ]
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,34,50,.025)]"><div className="grid gap-5 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]"><div><h2 className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Résumé de votre activité</h2><div className="mt-3 grid grid-cols-2 gap-2">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><p className="text-[10px] leading-4 text-slate-500">{label}</p><p className="mt-1 text-xl font-bold tracking-tight text-slate-950">{value}</p></div>)}</div></div>{performance ? <CompactProduction performance={performance} /> : null}</div></section>
}

export default function HomeWorkspace({ firstName, brief, loadState, onRefresh, performance }: Props) {
  const { openCollaborator } = useShellContext()
  if (loadState === 'loading' || (!brief && loadState !== 'error')) return <div className="w-full max-w-none space-y-4 pb-6" aria-busy="true"><div className="h-24 animate-pulse rounded-2xl bg-slate-200" /><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /></div>
  if (!brief) return <div className="mx-auto max-w-[760px] rounded-2xl border border-slate-200 bg-white p-6"><CircleAlert className="size-5 text-amber-600" /><h2 className="mt-3 text-xl font-semibold text-slate-950">Le brief est momentanément indisponible.</h2><button type="button" onClick={() => void onRefresh()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-emerald-950"><RefreshCw className="size-4" />Réessayer</button></div>
  const priorities = brief.attention.slice(0, 3)
  return <div className="w-full max-w-none space-y-4 pb-4">
    <header><h1 className="text-2xl font-bold tracking-tight text-slate-950">Bonjour{firstName ? ` ${firstName.trim()}` : ''}.</h1><p className="mt-1 text-sm text-slate-600">Voici les {priorities.length || 3} actions les plus importantes pour bien avancer aujourd’hui.</p></header>
    <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-[0_4px_18px_rgba(15,34,50,.025)]"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><TrendingUp className="size-5" /></span><div className="min-w-0"><p className="text-sm font-bold text-slate-950">{brief.impact.headline}</p><p className="mt-0.5 text-xs text-slate-500">{brief.impact.detail}</p></div></section>
    <section aria-labelledby="home-priorities"><div className="mb-2.5 flex items-center gap-2"><Sparkles className="size-4 text-emerald-600" /><h2 id="home-priorities" className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-600">Vos 3 priorités du jour</h2></div>{priorities.length ? <div className="grid gap-3 xl:grid-cols-3">{priorities.map((item, index) => <PriorityCard key={item.id} item={item} index={index} />)}</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">Votre journée est sous contrôle. Aucun dossier ne demande une décision immédiate.</div>}</section>
    <Agenda brief={brief} />
    <ActivitySummary brief={brief} performance={performance} />
    <section aria-labelledby="home-quick" className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_4px_18px_rgba(15,34,50,.025)]"><div className="flex items-center justify-between gap-3"><h2 id="home-quick" className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Accès rapides</h2><span className="text-[10px] font-semibold text-slate-400">Actions courantes</span></div><div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{quickActions.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="group flex min-h-20 flex-col items-center justify-center rounded-xl border border-slate-200 px-2 py-2.5 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50"><Icon className="size-5 text-slate-500 transition-colors group-hover:text-emerald-700" /><span className="mt-1.5 text-[10px] font-bold leading-3.5 text-slate-700">{label}</span></Link>)}</div></section>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5"><div><p className="text-sm font-bold text-slate-900">Besoin d’aide pour avancer ?</p><p className="text-xs text-slate-600">Demandez à Kadria ou parcourez vos actions recommandées.</p></div><button type="button" onClick={() => openCollaborator({ mode: 'actions' })} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-white px-3 py-2 text-xs font-bold text-emerald-700">Ouvrir le collaborateur<ArrowRight className="size-3.5" /></button></section>
  </div>
}

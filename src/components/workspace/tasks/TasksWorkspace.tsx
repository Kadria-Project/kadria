'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Bot, CalendarDays, CheckCircle2, CircleAlert, Eye, Lightbulb, LoaderCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  deriveWorkCalmState,
  deriveWorkSituations,
  prioritizeWorkSituations,
  type OperationsLoadState,
  type TasksWorkspaceData,
  type WorkSituation,
  type WorkSituationAction,
} from './work-situations'

type Props = {
  firstName: string | null
  operationsCenter: TasksWorkspaceData | null
  loadState: OperationsLoadState
  onRefresh: () => Promise<void>
}

type WorkView = 'all' | 'decide' | 'prepare' | 'waiting' | 'plan' | 'overdue'
type WorkLane = Exclude<WorkView, 'all' | 'decide'>

const kindLabels = {
  execute: 'À exécuter',
  validate: 'À valider',
  automate: 'À automatiser',
  recover: 'À récupérer',
  observe: 'À observer',
} as const

const laneMeta: Record<Exclude<WorkView, 'all'>, { label: string; empty: string; tone: string }> = {
  decide: { label: 'À décider', empty: 'Aucune décision en attente.', tone: 'text-amber-600 bg-amber-50 border-amber-100' },
  prepare: { label: 'À préparer', empty: 'Rien à préparer pour le moment.', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  waiting: { label: 'En attente client', empty: 'Aucune attente client détectée.', tone: 'text-violet-700 bg-violet-50 border-violet-100' },
  plan: { label: 'À planifier', empty: 'Aucune planification en attente.', tone: 'text-blue-700 bg-blue-50 border-blue-100' },
  overdue: { label: 'En retard', empty: 'Aucun retard à traiter.', tone: 'text-red-700 bg-red-50 border-red-100' },
}

const planningSources = new Set(['schedule_intervention', 'appointment_change_requested', 'appointment_address', 'assign_collaborator', 'planning_conflict', 'travel_warning', 'member_overloaded'])
const waitingSources = new Set(['follow_up_quote', 'risk_followup', 'set_callback', 'appointment_confirmation'])

function workLane(situation: WorkSituation): Exclude<WorkView, 'all'> {
  if (situation.kind === 'recover') return 'overdue'
  if (situation.workbenchCategory === 'approval') return 'decide'
  if (situation.sourceType && planningSources.has(situation.sourceType)) return 'plan'
  if (situation.sourceType && waitingSources.has(situation.sourceType)) return 'waiting'
  if (situation.workbenchCategory === 'attention') return 'overdue'
  return 'prepare'
}

function kindIcon(kind: WorkSituation['kind']) {
  if (kind === 'recover') return <CircleAlert className="size-5" aria-hidden="true" />
  if (kind === 'validate') return <ShieldCheck className="size-5" aria-hidden="true" />
  if (kind === 'automate') return <Bot className="size-5" aria-hidden="true" />
  if (kind === 'observe') return <Eye className="size-5" aria-hidden="true" />
  return <Sparkles className="size-5" aria-hidden="true" />
}

function contextLabel(situation: WorkSituation) {
  const context = [situation.projectContext?.clientName, situation.projectContext?.projectTitle]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
  return context.length ? context.join(' · ') : 'Dossier à identifier'
}

function freshnessLabel(generatedAt: string | undefined) {
  if (!generatedAt) return null
  const date = new Date(generatedAt)
  if (Number.isNaN(date.getTime())) return null
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'Vérifié à l’instant'
  if (minutes < 60) return `Vérifié il y a ${minutes} min`
  return `Vérifié à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

function proofLabel(confidence: WorkSituation['confidence']) {
  if (confidence === 'high') return 'Confiance élevée'
  if (confidence === 'medium') return 'À confirmer'
  return 'À vérifier'
}

function SituationCard({ situation, onAction, busy }: { situation: WorkSituation; onAction: (action: WorkSituationAction) => void; busy: boolean }) {
  const lane = workLane(situation)
  const accent = lane === 'overdue'
    ? 'before:bg-red-400'
    : lane === 'plan'
      ? 'before:bg-blue-400'
      : lane === 'waiting'
        ? 'before:bg-violet-400'
        : lane === 'decide'
          ? 'before:bg-amber-400'
          : 'before:bg-emerald-400'

  return (
    <article id={`workspace-action-${situation.id}`} className={`group relative overflow-hidden rounded-[18px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_3px_12px_rgba(15,34,50,0.035)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_10px_24px_rgba(15,34,50,0.06)] before:absolute before:inset-y-0 before:left-0 before:w-[3px] ${accent}`}>
      <div className="grid items-center gap-3 xl:grid-cols-[minmax(230px,0.85fr)_minmax(340px,1.45fr)_minmax(175px,0.55fr)]">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border ${laneMeta[lane].tone}`}>{kindIcon(situation.kind)}</span>
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${laneMeta[lane].tone.split(' ')[0]}`}>{kindLabels[situation.kind]}</p>
            <p className="mt-1 truncate text-[14px] font-semibold tracking-[-0.015em] text-[#0b2232]">{contextLabel(situation)}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">{situation.observedFacts.join(' ')}</p>
          </div>
        </div>

        <div className="min-w-0 space-y-1 text-xs leading-4.5 text-slate-600">
          <p className="flex gap-2"><Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden="true" /><span><span className="font-semibold text-slate-800">Pourquoi ?</span> {situation.understanding}</span></p>
          <p className="flex gap-2"><CircleAlert className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" /><span><span className="font-semibold text-slate-800">Impact si rien n’est fait :</span> {situation.consequence || situation.importance}</span></p>
          {situation.recommendation && <p className="flex gap-2 text-emerald-950"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" /><span><span className="font-semibold">Je recommande :</span> {situation.recommendation}</span></p>}
        </div>

        <div className="flex min-w-0 flex-row items-center gap-2 xl:flex-col xl:items-stretch">
          <span className="hidden self-start rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 xl:inline-flex">{proofLabel(situation.confidence)}</span>
          {situation.primaryAction && <button type="button" disabled={busy} onClick={() => onAction(situation.primaryAction!)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_5px_12px_rgba(5,150,105,0.16)] transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70">{busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}{situation.primaryAction.label}<ArrowRight className="size-3.5" aria-hidden /></button>}
          {situation.secondaryAction && <button type="button" disabled={busy} onClick={() => onAction(situation.secondaryAction!)} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-70">{situation.secondaryAction.label}</button>}
        </div>
      </div>
    </article>
  )
}

function SecondaryLane({ lane, situations, onShowAll, onAction, busyAction }: { lane: WorkLane; situations: WorkSituation[]; onShowAll: () => void; onAction: (situation: WorkSituation) => void; busyAction: string | null }) {
  const meta = laneMeta[lane]
  return (
    <section className="min-w-0 rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_2px_8px_rgba(15,34,50,0.025)]">
      <div className="flex items-center justify-between gap-2"><h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{meta.label} ({situations.length})</h3><span className={`size-2 rounded-full ${meta.tone.split(' ')[1]}`} /></div>
      <div className="mt-1.5 divide-y divide-slate-100">
        {situations.length ? situations.slice(0, 3).map((situation) => <button key={situation.id} type="button" disabled={busyAction === situation.id} onClick={() => onAction(situation)} className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:text-emerald-700 disabled:opacity-60"><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#0b2232]">{contextLabel(situation)}</span><span className="block truncate text-[11px] text-slate-500">{situation.primaryAction?.label || situation.observedFacts[0]}</span></span><ArrowRight className="size-3.5 shrink-0 text-slate-400" aria-hidden /></button>) : <p className="py-2.5 text-[11px] leading-4 text-slate-400">{meta.empty}</p>}
      </div>
      {situations.length > 0 && <button type="button" onClick={onShowAll} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800">Voir tout <ArrowRight className="size-3" aria-hidden /></button>}
    </section>
  )
}

export default function TasksWorkspace({ firstName, operationsCenter, loadState, onRefresh }: Props) {
  const router = useRouter()
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<WorkView>('all')
  const allSituations = useMemo(() => deriveWorkSituations(operationsCenter), [operationsCenter])
  const lanes = useMemo(() => ({
    decide: allSituations.filter((situation) => workLane(situation) === 'decide'),
    prepare: allSituations.filter((situation) => workLane(situation) === 'prepare'),
    waiting: allSituations.filter((situation) => workLane(situation) === 'waiting'),
    plan: allSituations.filter((situation) => workLane(situation) === 'plan'),
    overdue: allSituations.filter((situation) => workLane(situation) === 'overdue'),
  }), [allSituations])
  const focusedSituations = useMemo(() => activeView === 'all' ? allSituations : lanes[activeView], [activeView, allSituations, lanes])
  const situations = useMemo(() => prioritizeWorkSituations(focusedSituations), [focusedSituations])
  const state = deriveWorkCalmState(loadState, operationsCenter, situations)
  const freshness = freshnessLabel(operationsCenter?.generatedAt)

  const handleAction = async (situation: WorkSituation, action: WorkSituationAction) => {
    if (!action.target) return
    setActionError(null)
    if (!action.target.startsWith('/api/')) {
      router.push(action.target)
      return
    }
    setBusyAction(situation.id)
    try {
      const response = await fetch(action.target, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.success === false) throw new Error(payload?.error || 'Kadria n’a pas pu terminer cette action.')
      await onRefresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Kadria n’a pas pu terminer cette action.')
    } finally {
      setBusyAction(null)
    }
  }

  const setView = (view: WorkView) => {
    setActiveView(view)
    requestAnimationFrame(() => document.getElementById('workspace-section-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="w-full max-w-none space-y-3.5 pb-4">
      <section className="relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-[linear-gradient(108deg,#ffffff_0%,#fbfefd_62%,#ecfbf5_100%)] px-5 py-4 sm:px-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[32%] [background:radial-gradient(circle_at_65%_40%,rgba(110,231,183,.26),transparent_44%)] sm:block" />
        <div className="relative"><h2 className="text-[22px] font-semibold tracking-[-0.035em] text-[#0b2232]">Bonjour{firstName ? ` ${firstName}` : ''}.</h2><p className="mt-1 text-sm text-slate-600">{state.message}</p>{freshness && state.kind !== 'loading' && <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-500"><CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />{freshness}</p>}</div>
      </section>

      {state.kind === 'loading' && <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600"><LoaderCircle className="mr-2 inline size-4 animate-spin" aria-hidden="true" />Analyse en cours.</section>}
      {state.kind === 'insufficient' && <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-6 text-amber-950"><AlertTriangle className="mr-2 inline size-4" aria-hidden="true" />Les sources nécessaires ne sont pas toutes disponibles. Réessayez dans un instant avant de prendre une décision sur cette base.<button type="button" onClick={() => void onRefresh()} className="ml-3 inline-flex items-center gap-1 font-semibold underline underline-offset-4"><RefreshCw className="size-3.5" aria-hidden="true" />Vérifier à nouveau</button></section>}

      {state.kind === 'active' && <>
        <section aria-label="Vue d’ensemble" className="rounded-[18px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,34,50,0.025)]">
          <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Vue d’ensemble</p>{activeView !== 'all' && <button type="button" onClick={() => setView('all')} className="text-[11px] font-semibold text-emerald-700">Tout afficher</button>}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(Object.keys(laneMeta) as Exclude<WorkView, 'all'>[]).map((lane) => <button key={lane} type="button" aria-pressed={activeView === lane} onClick={() => setView(lane)} className={`flex min-h-[62px] items-center justify-between rounded-xl border px-3 text-left transition-colors ${activeView === lane ? laneMeta[lane].tone : 'border-slate-200 bg-white hover:border-slate-300'}`}><span><span className="block text-lg font-semibold tracking-[-0.03em] text-[#0b2232]">{lanes[lane].length}</span><span className="block text-[11px] font-medium text-slate-600">{laneMeta[lane].label}</span></span>{lane === 'plan' ? <CalendarDays className="size-4 text-blue-500" aria-hidden /> : lane === 'overdue' ? <CircleAlert className="size-4 text-red-500" aria-hidden /> : lane === 'waiting' ? <Eye className="size-4 text-violet-500" aria-hidden /> : lane === 'decide' ? <AlertTriangle className="size-4 text-amber-500" aria-hidden /> : <Sparkles className="size-4 text-emerald-500" aria-hidden />}</button>)}
          </div>
        </section>

        <section id="workspace-section-queue" aria-label="Situations à traiter maintenant">
          <div className="mb-2.5 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">{activeView === 'all' || activeView === 'decide' ? '🔥 À faire maintenant' : laneMeta[activeView].label}</p><p className="mt-0.5 text-xs text-slate-500">{activeView === 'all' ? 'Les trois actions qui demandent votre intervention en premier.' : `Les actions ${laneMeta[activeView].label.toLowerCase()} à traiter en priorité.`}</p></div><span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 sm:inline-flex">{situations.length} à traiter</span></div>
          {situations.length ? <div className="space-y-2.5">{situations.map((situation) => <SituationCard key={situation.id} situation={situation} busy={busyAction === situation.id} onAction={(action) => void handleAction(situation, action)} />)}</div> : <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">Aucune action dans cette vue pour le moment.</div>}
          {actionError && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</p>}
        </section>

        <section aria-label="Actions à traiter ensuite" className="space-y-2.5">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">📅 Aujourd’hui</p><p className="mt-0.5 text-xs text-slate-500">Les actions qui peuvent avancer ou qui ne doivent plus attendre.</p></div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {(['prepare', 'waiting', 'overdue'] as WorkLane[]).map((lane) => <SecondaryLane key={lane} lane={lane} situations={lanes[lane]} busyAction={busyAction} onShowAll={() => setView(lane)} onAction={(situation) => situation.primaryAction && void handleAction(situation, situation.primaryAction)} />)}
          </div>
          <div className="pt-0.5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">📆 Cette semaine</p><p className="mt-0.5 text-xs text-slate-500">Les créneaux et interventions à organiser avant qu’ils ne bloquent la suite.</p></div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3"><SecondaryLane lane="plan" situations={lanes.plan} busyAction={busyAction} onShowAll={() => setView('plan')} onAction={(situation) => situation.primaryAction && void handleAction(situation, situation.primaryAction)} /></div>
        </section>
      </>}

      {state.kind === 'calm' && <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-700" aria-hidden="true" /><p className="mt-3 font-semibold text-emerald-950">Situation maîtrisée</p><p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-emerald-900">Les prochaines actions restent dans leurs workspaces respectifs tant qu’aucune décision n’est requise.</p></section>}
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Bot, CheckCircle2, CircleAlert, Clock3, LoaderCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { OperationsCenterResult } from '@/src/lib/recommendations'
import {
  deriveWorkCalmState,
  deriveWorkSituations,
  prioritizeWorkSituations,
  type OperationsLoadState,
  type WorkSituation,
  type WorkSituationAction,
} from './work-situations'

type Props = {
  firstName: string | null
  operationsCenter: OperationsCenterResult | null
  loadState: OperationsLoadState
  onRefresh: () => Promise<void>
}

const kindLabels = {
  execute: 'À exécuter',
  validate: 'À valider',
  automate: 'À automatiser',
  recover: 'À récupérer',
  observe: 'À observer',
} as const

function kindIcon(kind: WorkSituation['kind']) {
  if (kind === 'recover') return <CircleAlert className="size-5" aria-hidden="true" />
  if (kind === 'validate') return <ShieldCheck className="size-5" aria-hidden="true" />
  if (kind === 'automate') return <Bot className="size-5" aria-hidden="true" />
  return <Sparkles className="size-5" aria-hidden="true" />
}

function contextLabel(situation: WorkSituation) {
  const context = [situation.projectContext?.clientName, situation.projectContext?.projectTitle]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
  return context.length ? context.join(' · ') : 'Je ne peux pas identifier précisément le dossier concerné.'
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

function SituationCard({ situation, onAction, busy }: { situation: WorkSituation; onAction: (action: WorkSituationAction) => void; busy: boolean }) {
  const tone = situation.kind === 'recover'
    ? 'border-amber-200 bg-amber-50/40'
    : situation.kind === 'validate'
      ? 'border-blue-200 bg-blue-50/40'
      : 'border-emerald-200 bg-emerald-50/35'

  return (
    <article id={`workspace-action-${situation.id}`} className={`rounded-2xl border p-5 shadow-[0_2px_8px_rgba(15,34,50,0.04)] ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">{kindIcon(situation.kind)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">{kindLabels[situation.kind]}</p>
            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">Confiance {situation.confidence === 'high' ? 'élevée' : situation.confidence === 'medium' ? 'moyenne' : 'limitée'}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">{contextLabel(situation)}</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <section><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Observation</p><p className="mt-1 font-medium text-[#0b2232]">{situation.observedFacts.join(' ')}</p></section>
            <section><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Compréhension</p><p className="mt-1">{situation.understanding}</p></section>
            <section><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Pourquoi maintenant</p><p className="mt-1">{situation.importance}</p></section>
            {situation.consequence && <section><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Conséquence</p><p className="mt-1">{situation.consequence}</p></section>}
            {situation.recommendation && <section><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Recommandation</p><p className="mt-1 font-medium text-[#0b2232]">{situation.recommendation}</p></section>}
            {situation.canBeAutomated && situation.automationExplanation && <p className="rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-xs text-emerald-900"><Bot className="mr-1 inline size-3.5" aria-hidden="true" />{situation.automationExplanation}</p>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {situation.primaryAction && <button type="button" disabled={busy} onClick={() => onAction(situation.primaryAction!)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70">{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{situation.primaryAction.label}</button>}
            {situation.secondaryAction && <button type="button" disabled={busy} onClick={() => onAction(situation.secondaryAction!)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-70">{situation.secondaryAction.label}</button>}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function TasksWorkspace({ firstName, operationsCenter, loadState, onRefresh }: Props) {
  const router = useRouter()
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const allSituations = useMemo(() => deriveWorkSituations(operationsCenter), [operationsCenter])
  const situations = useMemo(() => prioritizeWorkSituations(allSituations), [allSituations])
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

  return (
    <div className="mx-auto max-w-[920px] space-y-6 pb-6">
      <section className="rounded-2xl border border-[#EAEAEA] bg-white px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">À faire</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#0b2232]">Bonjour{firstName ? ` ${firstName}` : ''}.</h2>
        <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-slate-700">{state.message}</p>
        {freshness && state.kind !== 'loading' && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="size-3.5" aria-hidden="true" />{freshness}</p>}
      </section>

      {state.kind === 'loading' && <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600"><LoaderCircle className="mr-2 inline size-4 animate-spin" aria-hidden="true" />Analyse en cours.</section>}

      {state.kind === 'insufficient' && <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-6 text-amber-950"><AlertTriangle className="mr-2 inline size-4" aria-hidden="true" />Les sources nécessaires ne sont pas toutes disponibles. Réessayez dans un instant avant de prendre une décision sur cette base.<button type="button" onClick={() => void onRefresh()} className="ml-3 inline-flex items-center gap-1 font-semibold underline underline-offset-4"><RefreshCw className="size-3.5" aria-hidden="true" />Vérifier à nouveau</button></section>}

      {state.kind === 'active' && <section id="workspace-section-queue" aria-label="Situations à traiter maintenant">
        <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">À décider maintenant</p><p className="mt-1 text-sm text-slate-500">Kadria a retenu uniquement les situations qui demandent une action, une validation ou une reprise immédiate.</p></div>
        <div className="space-y-4">{situations.map((situation) => <SituationCard key={situation.id} situation={situation} busy={busyAction === situation.id} onAction={(action) => void handleAction(situation, action)} />)}</div>
        {actionError && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</p>}
      </section>}

      {state.kind === 'calm' && <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-700" aria-hidden="true" /><p className="mt-3 font-semibold text-emerald-950">Situation maîtrisée</p><p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-emerald-900">Les prochaines actions restent dans leurs workspaces respectifs tant qu’aucune décision n’est requise.</p></section>}
    </div>
  )
}

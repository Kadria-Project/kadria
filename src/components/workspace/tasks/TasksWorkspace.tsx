'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, CircleAlert, Eye, Lightbulb, LoaderCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
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
    ? 'before:bg-amber-400 bg-[linear-gradient(110deg,#fffdfa,#ffffff)]'
    : situation.kind === 'validate'
      ? 'before:bg-blue-400 bg-[linear-gradient(110deg,#fbfdff,#ffffff)]'
      : 'before:bg-emerald-400 bg-[linear-gradient(110deg,#fafffd,#ffffff)]'

  return (
    <article id={`workspace-action-${situation.id}`} className={`group relative overflow-hidden rounded-[20px] border border-slate-200/80 px-5 py-4 shadow-[0_3px_12px_rgba(15,34,50,0.035)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_10px_24px_rgba(15,34,50,0.06)] before:absolute before:inset-y-0 before:left-0 before:w-[3px] ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">{kindIcon(situation.kind)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">{kindLabels[situation.kind]}</p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Confiance {situation.confidence === 'high' ? 'élevée' : situation.confidence === 'medium' ? 'moyenne' : 'limitée'}</span>
          </div>
          <p className="mt-1 text-[15px] font-semibold tracking-[-0.015em] text-[#0b2232]">{contextLabel(situation)}</p>
          <div className="mt-3 space-y-2 text-[13px] leading-5 text-slate-600">
            <p className="flex gap-2"><Eye className="mt-0.5 size-3.5 shrink-0 text-emerald-700" aria-hidden /><span className="font-medium text-[#0b2232]">{situation.observedFacts.join(' ')}</span></p>
            <p className="flex gap-2"><Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden /><span><span className="font-semibold text-slate-800">Ce que cela signifie :</span> {situation.understanding}</span></p>
            {situation.recommendation && <p className="flex gap-2 font-semibold text-emerald-950"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />{situation.recommendation}</p>}
            {situation.canBeAutomated && situation.automationExplanation && <p className="rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-xs text-emerald-900"><Bot className="mr-1 inline size-3.5" aria-hidden="true" />{situation.automationExplanation}</p>}
          </div>
          {(situation.importance || situation.consequence) && <details className="mt-2 text-xs leading-5 text-slate-600"><summary className="cursor-pointer font-medium text-slate-500">Voir pourquoi cela compte</summary><div className="mt-1.5 space-y-1.5"><p><span className="font-semibold text-slate-700">Pourquoi cela compte :</span> {situation.importance}</p>{situation.consequence && <p><span className="font-semibold text-slate-700">Ce qui peut arriver :</span> {situation.consequence}</p>}</div></details>}
          <div className="mt-4 flex flex-wrap gap-2">
            {situation.primaryAction && <button type="button" disabled={busy} onClick={() => onAction(situation.primaryAction!)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(5,150,105,0.16)] transition-all duration-200 hover:bg-emerald-700 hover:shadow-[0_8px_16px_rgba(5,150,105,0.2)] disabled:cursor-wait disabled:opacity-70">{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{situation.primaryAction.label}<ArrowRight className="size-4" aria-hidden /></button>}
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
      <section className="relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-[linear-gradient(112deg,#ffffff_0%,#fbfefd_58%,#eefbf6_100%)] px-6 py-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%] [background:radial-gradient(circle_at_70%_22%,rgba(110,231,183,.28),transparent_42%),radial-gradient(circle_at_50%_110%,rgba(186,230,253,.24),transparent_45%)]" />
        <div className="relative"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">À faire</p>
        <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.035em] text-[#0b2232]">Bonjour{firstName ? ` ${firstName}` : ''}.</h2>
        <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-slate-700">{state.message}</p>
        {freshness && state.kind !== 'loading' && <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />{freshness}</p>}</div>
      </section>

      {state.kind === 'loading' && <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600"><LoaderCircle className="mr-2 inline size-4 animate-spin" aria-hidden="true" />Analyse en cours.</section>}

      {state.kind === 'insufficient' && <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-6 text-amber-950"><AlertTriangle className="mr-2 inline size-4" aria-hidden="true" />Les sources nécessaires ne sont pas toutes disponibles. Réessayez dans un instant avant de prendre une décision sur cette base.<button type="button" onClick={() => void onRefresh()} className="ml-3 inline-flex items-center gap-1 font-semibold underline underline-offset-4"><RefreshCw className="size-3.5" aria-hidden="true" />Vérifier à nouveau</button></section>}

      {state.kind === 'active' && <section id="workspace-section-queue" aria-label="Situations à traiter maintenant">
        <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">À décider maintenant</p><p className="mt-1 text-sm text-slate-500">Voici uniquement ce qui demande votre intervention maintenant.</p></div>
        <div className="space-y-3">{situations.map((situation) => <SituationCard key={situation.id} situation={situation} busy={busyAction === situation.id} onAction={(action) => void handleAction(situation, action)} />)}</div>
        <p className="mt-3 text-sm text-slate-500">Pendant que vous avancez, je continue de surveiller le reste de votre activité.</p>
        {actionError && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</p>}
      </section>}

      {state.kind === 'calm' && <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-700" aria-hidden="true" /><p className="mt-3 font-semibold text-emerald-950">Situation maîtrisée</p><p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-emerald-900">Les prochaines actions restent dans leurs workspaces respectifs tant qu’aucune décision n’est requise.</p></section>}
    </div>
  )
}

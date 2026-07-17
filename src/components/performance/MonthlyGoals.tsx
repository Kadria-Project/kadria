'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { Target } from 'lucide-react'
import type { MonthlyGoalProgress, MonthlyGoalsSummary } from '@/src/lib/performance/performance-types'

const STATUS_LABEL: Record<MonthlyGoalProgress['status'], string> = {
  achieved: 'Objectif atteint',
  onTrack: 'Sur la bonne voie',
  atRisk: 'À surveiller',
  behind: 'En retard',
}

const STATUS_BAR_COLOR: Record<MonthlyGoalProgress['status'], string> = {
  achieved: 'bg-emerald-500',
  onTrack: 'bg-emerald-400',
  atRisk: 'bg-amber-400',
  behind: 'bg-rose-400',
}

function formatGoalValue(value: number, unit: string): string {
  if (unit === '€') return `${Math.round(value).toLocaleString('fr-FR')} €`
  if (unit === '%') return `${Math.round(value)} %`
  if (unit === 'h') return `${Math.round(value)} h`
  return `${Math.round(value)}`
}

function GoalRow({ progress }: { progress: MonthlyGoalProgress }) {
  const { goal, progressPercent, status } = progress
  const barWidth = Math.min(100, progressPercent)

  return (
    <li className="rounded-xl border border-slate-100 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-slate-950">{goal.label}</p>
        <span className="text-xs font-semibold text-slate-500">
          {formatGoalValue(goal.currentValue, goal.unit)} / {formatGoalValue(goal.targetValue, goal.unit)}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`Progression : ${goal.label}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${STATUS_BAR_COLOR[status]}`}
        />
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-500">
        {progressPercent}% — {STATUS_LABEL[status]}
      </p>
    </li>
  )
}

function NotConfiguredState({ destination }: { destination: string | null }) {
  return (
    <div className="rounded-xl bg-slate-50 p-5 text-center">
      <div className="mx-auto grid size-10 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
        <Target className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm text-slate-600">Définissez vos objectifs pour suivre votre progression commerciale.</p>
      {destination ? (
        <Link
          href={destination}
          className="mt-3 inline-flex items-center rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
        >
          Configurer mes objectifs
        </Link>
      ) : (
        <span className="mt-3 inline-flex cursor-not-allowed items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400">
          Bientôt disponible
        </span>
      )}
    </div>
  )
}

export default function MonthlyGoals({
  summary,
  loading,
  error,
  onRetry,
}: {
  summary: MonthlyGoalsSummary | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div>
        <h3 className="text-sm font-bold text-slate-950">Objectifs mensuels</h3>
        <p className="mt-0.5 text-xs text-slate-500">Suivi de votre progression par rapport à vos objectifs commerciaux.</p>
      </div>

      <div className="mt-3">
        {error ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
            <p className="text-sm text-slate-700">Ce bloc est momentanément indisponible.</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
              >
                Réessayer
              </button>
            )}
          </div>
        ) : loading || !summary ? (
          <div aria-hidden="true" className="animate-pulse space-y-2">
            <div className="h-16 w-full rounded-xl bg-slate-100" />
            <div className="h-16 w-full rounded-xl bg-slate-100" />
          </div>
        ) : !summary.configured || summary.goals.length === 0 ? (
          <NotConfiguredState destination={summary.configureDestination} />
        ) : (
          <ul className="flex flex-col gap-3">
            {summary.goals.map((progress) => (
              <GoalRow key={progress.goal.metric} progress={progress} />
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}

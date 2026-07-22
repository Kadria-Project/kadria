'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, Calendar, CheckSquare, PhoneCall, RefreshCw, Repeat } from 'lucide-react'
import { formatKPIValue } from '@/src/lib/performance/performance-format'
import type { PriorityAction, PriorityActionIcon } from '@/src/lib/performance/performance-types'

const ICONS: Record<PriorityActionIcon, typeof Repeat> = {
  followUp: Repeat,
  call: PhoneCall,
  quote: CheckSquare,
  calendar: Calendar,
  alert: AlertTriangle,
  checklist: CheckSquare,
}

const PRIORITY_LABEL: Record<PriorityAction['priority'], string> = {
  high: 'Priorité haute',
  medium: 'Priorité moyenne',
  low: 'Priorité basse',
}

const PRIORITY_TONE: Record<PriorityAction['priority'], string> = {
  high: 'border-rose-200 bg-rose-50 text-rose-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-slate-200 bg-slate-50 text-slate-600',
}

function ActionRow({ action }: { action: PriorityAction }) {
  const Icon = ICONS[action.icon]
  const destination = '/dashboard-v2/suivi'
  const ctaLabel = action.type === 'callNewProspects' ? 'Voir les nouveaux dossiers' : action.type === 'followUpQuotes' ? 'Voir les devis' : 'Voir les dossiers'
  return (
    <li className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-950">{action.label}</p>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_TONE[action.priority]}`}>
            {PRIORITY_LABEL[action.priority]}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {action.count} dossier{action.count > 1 ? 's' : ''}
          {action.value !== null ? ` · ${formatKPIValue(action.value, 'currency')} concernés` : ''}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{action.detail}</p>
      </div>
      <Link
        href={destination}
        className="shrink-0 self-center whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
        aria-label={`${ctaLabel} : ${action.label}`}
      >
        {ctaLabel}
      </Link>
    </li>
  )
}

export default function PriorityActions({
  actions,
  impactAmount,
  loading,
  error,
  onRetry,
}: {
  actions: PriorityAction[] | null
  impactAmount?: number | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      id="priority-actions"
    >
      <div>
        <h3 className="text-sm font-bold text-slate-950">Actions à prioriser</h3>
        <p className="mt-0.5 text-xs text-slate-500">Catégories d&apos;actions triées par impact commercial.</p>
        {impactAmount !== null && impactAmount !== undefined && impactAmount > 0 && <p className="mt-2 text-xs text-slate-500">Impact estimé <strong className="ml-1 text-base text-slate-950">{formatKPIValue(impactAmount, 'currency')}</strong></p>}
      </div>

      <div className="mt-3">
        {error ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
            <p className="text-sm text-slate-700">Ce bloc est momentanément indisponible.</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Réessayer
              </button>
            )}
          </div>
        ) : loading || !actions ? (
          <div aria-hidden="true" className="animate-pulse space-y-2">
            <div className="h-16 w-full rounded-xl bg-slate-100" />
            <div className="h-16 w-full rounded-xl bg-slate-100" />
          </div>
        ) : actions.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucune action prioritaire pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {actions.map((action) => (
              <ActionRow key={action.type} action={action} />
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}

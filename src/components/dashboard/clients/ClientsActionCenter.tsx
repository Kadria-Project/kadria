'use client'

import { motion, useReducedMotion } from 'motion/react'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import type { ClientActionItem, ClientActionPriority, ClientActionReason, ClientActionsSummary } from '@/src/lib/clients/clients-action-types'
import { CLIENT_ACTION_CONFIG, CLIENT_ACTION_QUICK_COUNTERS } from '@/src/lib/clients/clients-action-config'
import { formatDueLabel, formatSinceLabel } from '@/src/lib/clients/clients-action-format'
import { CLIENT_ACTION_ICONS } from './clients-action-icons'

const PRIORITY_BAR: Record<ClientActionPriority, string> = {
  critical: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-sky-500',
  low: 'bg-slate-300',
}

const PRIORITY_TEXT: Record<ClientActionPriority, string> = {
  critical: 'Priorité haute',
  high: 'Priorité élevée',
  medium: 'Priorité moyenne',
  low: 'Priorité faible',
}

function dueLabelFor(action: ClientActionItem): string | null {
  if (action.reason === 'appointment_change_requested' || action.reason === 'appointment_awaiting_confirmation') return formatDueLabel(action.appointmentAt)
  if (action.reason === 'quote_pending_too_long') return formatSinceLabel(action.dueAt)
  return null
}

export function ClientActionRow({ action, onOpen, compact }: { action: ClientActionItem; onOpen: (action: ClientActionItem) => void; compact?: boolean }) {
  const config = CLIENT_ACTION_CONFIG[action.reason]
  const Icon = CLIENT_ACTION_ICONS[config.icon]
  const due = dueLabelFor(action)
  const canAct = Boolean(action.href) || action.reason === 'possible_duplicate'
  return (
    <div className="flex items-stretch gap-3 rounded-xl border border-slate-200 bg-white pl-0 pr-3 py-3 transition hover:border-emerald-200 hover:bg-emerald-50/30">
      <span aria-hidden className={`w-1 shrink-0 rounded-full ${PRIORITY_BAR[action.priority]}`} />
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="truncate text-sm font-semibold text-slate-950">{action.clientName}</p>
          <span className="text-xs font-medium text-slate-500">{config.label}</span>
        </div>
        {!compact && <p className="mt-0.5 truncate text-xs text-slate-500">{action.description}</p>}
        {due && <p className="mt-0.5 truncate text-xs font-medium text-slate-600">{due}</p>}
        <span className="sr-only">{PRIORITY_TEXT[action.priority]}</span>
      </div>
      <button
        type="button"
        onClick={() => onOpen(action)}
        disabled={!canAct}
        className="shrink-0 self-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {config.ctaLabel}
      </button>
    </div>
  )
}

function CounterChip({
  reason,
  count,
  active,
  onToggle,
}: {
  reason: ClientActionReason
  count: number
  active: boolean
  onToggle: (reason: ClientActionReason) => void
}) {
  const config = CLIENT_ACTION_CONFIG[reason]
  const Icon = CLIENT_ACTION_ICONS[config.icon]
  const disabled = count === 0
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={() => onToggle(reason)}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 ${
        active
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : disabled
            ? 'cursor-default border-slate-100 bg-slate-50 text-slate-400'
            : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/60'
      }`}
    >
      <Icon className="size-3.5" aria-hidden />
      {config.categoryLabel}
      <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
    </button>
  )
}

export function ClientsActionCounters({
  summary,
  activeReason,
  onToggle,
}: {
  summary: ClientActionsSummary
  activeReason: ClientActionReason | null
  onToggle: (reason: ClientActionReason) => void
}) {
  const counts: Record<ClientActionReason, number> = {
    appointment_change_requested: summary.appointmentChanges,
    project_to_call_back: summary.callbacks,
    appointment_awaiting_confirmation: summary.appointmentsToConfirm,
    quote_pending_too_long: summary.quotesWaiting,
    possible_duplicate: summary.contactsToReconcile,
    stale_active_project: summary.staleProjects,
    client_follow_up: summary.followUps,
    legacy_unlinked: 0,
  }
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer par catégorie d’action">
      {CLIENT_ACTION_QUICK_COUNTERS.map((reason) => (
        <CounterChip key={reason} reason={reason} count={counts[reason]} active={activeReason === reason} onToggle={onToggle} />
      ))}
    </div>
  )
}

function ActionCenterSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )
}

export function ClientsActionCenter({
  actions,
  summary,
  loading,
  error,
  activeReason,
  onToggleReason,
  onOpenAction,
  onOpenPanel,
}: {
  actions: ClientActionItem[]
  summary: ClientActionsSummary | null
  loading: boolean
  error: boolean
  activeReason: ClientActionReason | null
  onToggleReason: (reason: ClientActionReason) => void
  onOpenAction: (action: ClientActionItem) => void
  onOpenPanel: () => void
}) {
  const reduceMotion = Boolean(useReducedMotion())
  const visible = actions.slice(0, 5)

  return (
    <motion.section
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-label="Priorités du jour"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">Priorités du jour</h2>
          <p className="mt-0.5 text-sm text-slate-500">Les actions commerciales les plus importantes de votre portefeuille client.</p>
        </div>
        {summary && summary.total > 0 && (
          <button type="button" onClick={onOpenPanel} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">
            Voir toutes les actions ({summary.total})
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>

      {summary && (
        <div className="mt-4">
          <ClientsActionCounters summary={summary} activeReason={activeReason} onToggle={onToggleReason} />
        </div>
      )}

      <div className="mt-4">
        {loading && <ActionCenterSkeleton />}
        {!loading && error && <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Les priorités ne sont pas disponibles pour le moment.</p>}
        {!loading && !error && summary?.total === 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-4">
            <ShieldCheck className="size-5 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-slate-950">Tout est sous contrôle</p>
              <p className="text-sm text-slate-600">Aucun client ne nécessite d’action immédiate.</p>
            </div>
          </div>
        )}
        {!loading && !error && visible.length > 0 && (
          <div className="space-y-2">
            {visible.map((action) => <ClientActionRow key={action.id} action={action} onOpen={onOpenAction} />)}
          </div>
        )}
      </div>
    </motion.section>
  )
}

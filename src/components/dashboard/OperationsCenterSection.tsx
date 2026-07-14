'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type {
  CommercialLoadItem,
  FieldLoadItem,
  OperationsCenterResult,
  OperationsWorkbenchItem,
  RecommendationPriority,
  RecommendationItem,
} from '@/src/lib/recommendations'

const PRIORITY_META: Record<RecommendationPriority, { icon: string; label: string; badge: string }> = {
  critical: { icon: '!!', label: 'Critique', badge: 'border-red-500/30 bg-red-500/10 text-red-200' },
  high: { icon: '!', label: 'Haute', badge: 'border-orange-500/30 bg-orange-500/10 text-orange-100' },
  normal: { icon: 'i', label: 'Normale', badge: 'border-blue-500/30 bg-blue-500/10 text-blue-100' },
  low: { icon: 'o', label: 'Faible', badge: 'border-zinc-700 bg-zinc-900 text-zinc-300' },
}

const HEALTH_META = {
  Excellent: 'text-emerald-300',
  Bon: 'text-green-300',
  'A ameliorer': 'text-amber-300',
  Critique: 'text-red-300',
} as const

type ToastState = { message: string; error?: boolean } | null

function formatHealthLabel(label: keyof typeof HEALTH_META | string) {
  return label === 'A ameliorer' ? 'À améliorer' : label
}

function formatCurrency(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} MEUR`
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} kEUR`
  return `${Math.round(value)} EUR`
}

function toMinutesLabel(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (hours <= 0) return `${minutes} min`
  if (minutes <= 0) return `${hours} h`
  return `${hours} h ${minutes}`
}

function SectionCard({
  title,
  subtitle,
  children,
  compact = false,
}: {
  title: string
  subtitle: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="mb-4">
        <p className="text-base font-bold text-[var(--text-1)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--text-2)]">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function recommendationToWorkbenchItem(
  item: RecommendationItem,
  category: OperationsWorkbenchItem['category'],
): OperationsWorkbenchItem {
  return {
    id: item.id,
    category,
    title: item.title,
    description: item.description,
    reason: item.reason,
    priority: item.priority,
    statusLabel: null,
    dateLabel: null,
    entityType: item.entityType,
    entityId: item.entityId,
    entityLabel: null,
    projectId: item.entityType === 'project' ? item.entityId : null,
    quoteId: typeof item.actionPayload?.quoteId === 'string' ? item.actionPayload.quoteId : null,
    appointmentId:
      item.entityType === 'appointment'
        ? item.entityId
        : typeof item.actionPayload?.appointmentId === 'string'
          ? item.actionPayload.appointmentId
          : null,
    clientName: null,
    projectTitle: null,
    primaryActionLabel: item.actionLabel,
    primaryActionType: item.actionType,
    primaryActionRoute: item.actionRoute,
    primaryActionPayload: item.actionPayload,
    secondaryActionLabel: item.secondaryLabel,
    secondaryActionType: item.secondaryAction,
    secondaryActionRoute: item.secondaryRoute,
    secondaryActionPayload: item.secondaryPayload,
    canExecuteDirectly: item.actionType === 'execute_automation_run',
    source: 'recommendation',
    sourceType: item.type,
  }
}

async function logExecutedAction(item: OperationsWorkbenchItem) {
  try {
    await fetch('/api/operations-center/actions/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommendationId: item.id,
        actionType: item.primaryActionType,
        title: item.title,
        entityType: item.entityType,
        entityId: item.entityId,
        actionRoute: item.primaryActionRoute,
      }),
    })
  } catch {
    // Best effort only.
  }
}

async function postAction(url: string) {
  const response = await fetch(url, { method: 'POST' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || "Kadria n'a pas pu terminer cette action.")
  }
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-2)]">
      <span className="font-semibold text-[var(--text-1)]">{value}</span> {label}
    </div>
  )
}

function WorkbenchActionButtons({
  item,
  onAction,
  busy,
}: {
  item: OperationsWorkbenchItem
  onAction: (item: OperationsWorkbenchItem, variant?: 'primary' | 'secondary') => void
  busy: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {item.primaryActionLabel && item.primaryActionRoute ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(item)}
          className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1.5 text-xs font-semibold text-green-300 transition-colors hover:bg-green-500/[0.16] disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? 'Mise à jour…' : item.primaryActionLabel}
        </button>
      ) : null}
      {item.secondaryActionLabel && item.secondaryActionRoute ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(item, 'secondary')}
          className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] transition-colors hover:text-[var(--text-1)] disabled:cursor-wait disabled:opacity-60"
        >
          {item.secondaryActionLabel}
        </button>
      ) : null}
    </div>
  )
}

function WorkbenchCard({
  item,
  onAction,
  busy,
}: {
  item: OperationsWorkbenchItem
  onAction: (item: OperationsWorkbenchItem, variant?: 'primary' | 'secondary') => void
  busy: boolean
}) {
  const meta = PRIORITY_META[item.priority]
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-[var(--text-2)]">{meta.icon}</span>
            <p className="text-sm font-semibold text-[var(--text-1)]">{item.title}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>{meta.label}</span>
            {item.statusLabel ? (
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-2 py-0.5 text-[11px] text-[var(--text-2)]">
                {item.statusLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-[var(--text-2)]">{item.description}</p>
          <p className="mt-2 text-xs text-[var(--text-3)]">{item.reason}</p>
          {item.entityLabel ? <p className="mt-2 text-xs text-[var(--text-3)]">{item.entityLabel}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {item.dateLabel ? <span className="text-xs text-[var(--text-3)]">{item.dateLabel}</span> : null}
          <WorkbenchActionButtons item={item} onAction={onAction} busy={busy} />
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-4">
      <p className="text-sm font-medium text-[var(--text-2)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-3)]">{description}</p>
    </div>
  )
}

function WorkbenchColumn({
  title,
  subtitle,
  items,
  onAction,
  busyIds,
  emptyTitle,
  emptyDescription,
  secondary = false,
}: {
  title: string
  subtitle: string
  items: OperationsWorkbenchItem[]
  onAction: (item: OperationsWorkbenchItem, variant?: 'primary' | 'secondary') => void
  busyIds: Record<string, true>
  emptyTitle: string
  emptyDescription: string
  secondary?: boolean
}) {
  return (
    <div className={`rounded-2xl border ${secondary ? 'border-white/5 bg-[var(--bg)]/70' : 'border-[var(--border)] bg-[var(--bg)]'} p-4`}>
      <div className="mb-3">
        <p className="text-sm font-semibold text-[var(--text-1)]">{title}</p>
        <p className="mt-1 text-xs text-[var(--text-3)]">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          items.map((item) => (
            <WorkbenchCard key={item.id} item={item} onAction={onAction} busy={Boolean(busyIds[item.id])} />
          ))
        )}
      </div>
    </div>
  )
}

function CommercialLoadTable({ items }: { items: CommercialLoadItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {items.slice(0, 6).map((item) => (
        <div key={item.userId} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">{item.name}</p>
              <p className="text-xs text-[var(--text-3)]">{item.role}</p>
            </div>
            <span className="rounded-full border border-green-500/30 bg-green-500/[0.08] px-2 py-1 text-xs font-semibold text-green-300">
              Score {item.commercialScore}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-[var(--text-3)]">Dossiers</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.projectCount}</p></div>
            <div><p className="text-[var(--text-3)]">Prospects</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.prospectsCount}</p></div>
            <div><p className="text-[var(--text-3)]">Devis</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.quotesCount}</p></div>
            <div><p className="text-[var(--text-3)]">Gagnés</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.wonCount}</p></div>
            <div><p className="text-[var(--text-3)]">Perdus</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.lostCount}</p></div>
            <div><p className="text-[var(--text-3)]">CA estimé</p><p className="mt-1 font-semibold text-[var(--text-1)]">{formatCurrency(item.estimatedRevenue)}</p></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function FieldLoadTable({ items }: { items: FieldLoadItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {items.slice(0, 6).map((item) => (
        <div key={item.userId} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">{item.name}</p>
              <p className="text-xs text-[var(--text-3)]">{item.role}</p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                item.availability === 'busy'
                  ? 'bg-red-500/10 text-red-200'
                  : item.availability === 'soon'
                    ? 'bg-orange-500/10 text-orange-200'
                    : 'bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {item.availability === 'busy' ? 'Occupé' : item.availability === 'soon' ? 'Bientôt occupé' : 'Disponible'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-[var(--text-3)]">Interventions</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.appointmentCount}</p></div>
            <div><p className="text-[var(--text-3)]">Temps planifié</p><p className="mt-1 font-semibold text-[var(--text-1)]">{toMinutesLabel(item.plannedMinutes)}</p></div>
            <div><p className="text-[var(--text-3)]">Temps libre</p><p className="mt-1 font-semibold text-[var(--text-1)]">{toMinutesLabel(item.freeMinutes)}</p></div>
            <div><p className="text-[var(--text-3)]">Conflits</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.conflicts}</p></div>
            <div><p className="text-[var(--text-3)]">Km estimés</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.estimatedKm.toFixed(1)} km</p></div>
            <div><p className="text-[var(--text-3)]">Trajets incohérents</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.incoherentTravelCount}</p></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OperationsCenterSection({
  data,
  compact = false,
}: {
  data: OperationsCenterResult
  compact?: boolean
}) {
  const router = useRouter()
  const [busyIds, setBusyIds] = useState<Record<string, true>>({})
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({})
  const [toast, setToast] = useState<ToastState>(null)
  const healthClassName = HEALTH_META[data.health.label] || 'text-[var(--text-1)]'

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const sections = useMemo(() => {
    const filterHidden = (items: OperationsWorkbenchItem[]) => items.filter((item) => !hiddenIds[item.id])
    return {
      approvals: filterHidden(data.workbench.waitingForApproval),
      today: filterHidden(data.workbench.todayActions),
      attention: filterHidden(data.workbench.needsAttention),
      completed: filterHidden(data.workbench.recentlyCompleted),
    }
  }, [data.workbench, hiddenIds])

  const handleAction = async (item: OperationsWorkbenchItem, variant: 'primary' | 'secondary' = 'primary') => {
    const route = variant === 'secondary' ? item.secondaryActionRoute : item.primaryActionRoute
    if (!route) return

    const actionLabel = variant === 'secondary' ? item.secondaryActionLabel : item.primaryActionLabel
    const isServerAction =
      route.startsWith('/api/automations/runs/') ||
      (variant === 'primary' ? item.canExecuteDirectly : false)

    if (isServerAction) {
      setBusyIds((current) => ({ ...current, [item.id]: true }))
      try {
        await postAction(route)
        setHiddenIds((current) => ({ ...current, [item.id]: true }))
        setToast({
          message:
            actionLabel === 'Ne rien faire'
              ? 'Cette action a été laissée de côté.'
              : actionLabel === 'Réessayer'
                ? "C'est fait."
                : "C'est fait.",
        })
      } catch (error) {
        setToast({
          message: error instanceof Error ? error.message : "Kadria n'a pas pu terminer cette action.",
          error: true,
        })
      } finally {
        setBusyIds((current) => {
          const next = { ...current }
          delete next[item.id]
          return next
        })
      }
      return
    }

    if (route.startsWith('/dashboard-v2') || route.startsWith('/parametres')) {
      void logExecutedAction(item)
      setToast({ message: 'Ouverture en cours.' })
      router.push(route)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <SectionCard
        title="Centre d'actions"
        subtitle="Votre bureau du jour : ce que vous devez faire, ce que Kadria a préparé, ce qui a déjà été traité et ce qui mérite une vérification."
        compact={compact}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SummaryPill label="à faire aujourd'hui" value={data.workbench.summary.todayCount} />
          <SummaryPill label="accord(s) attendu(s)" value={data.workbench.summary.approvalCount} />
          <SummaryPill label="action(s) faite(s)" value={data.workbench.summary.completedTodayCount} />
          <SummaryPill label="point(s) à vérifier" value={data.workbench.summary.attentionCount} />
          <button
            type="button"
            onClick={() => router.push('/parametres/automatisations/historique')}
            className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] transition-colors hover:text-[var(--text-1)]"
          >
            Voir tout l'historique
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkbenchColumn
            title="Kadria attend votre accord"
            subtitle="Les actions sont prêtes. Vous pouvez décider tout de suite."
            items={sections.approvals}
            onAction={handleAction}
            busyIds={busyIds}
            emptyTitle="Aucune décision en attente."
            emptyDescription="Kadria vous signalera ici les actions qui demandent votre accord."
          />
          <WorkbenchColumn
            title="À faire aujourd'hui"
            subtitle="Les prochaines actions utiles pour garder vos dossiers en mouvement."
            items={sections.today}
            onAction={handleAction}
            busyIds={busyIds}
            emptyTitle="Tout est à jour pour le moment."
            emptyDescription="Kadria vous signalera ici ce qui mérite votre attention."
          />
          <WorkbenchColumn
            title="À vérifier"
            subtitle="Les points bloqués ou les situations qui demandent une intervention."
            items={sections.attention}
            onAction={handleAction}
            busyIds={busyIds}
            emptyTitle="Aucun point à vérifier."
            emptyDescription="Kadria n'a rien de bloquant à vous signaler pour le moment."
          />
          <WorkbenchColumn
            title="Ce que Kadria a fait"
            subtitle="Un résumé compact des dernières actions utiles déjà prises en charge."
            items={sections.completed}
            onAction={handleAction}
            busyIds={busyIds}
            emptyTitle="Kadria n'a encore réalisé aucune action aujourd'hui."
            emptyDescription="Les dernières actions utiles apparaîtront ici."
            secondary
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Santé de l'entreprise" subtitle="Une lecture rapide des points commerciaux et de planning à surveiller." compact={compact}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={`text-3xl font-bold ${healthClassName}`}>{data.health.score}/100</p>
              <p className="mt-1 text-sm text-[var(--text-2)]">{formatHealthLabel(data.health.label)}</p>
            </div>
            <span className="rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold text-green-300">
              {data.recommendations.length} signaux suivis
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {data.health.breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-3 py-2 text-sm">
                <span className="text-[var(--text-2)]">{item.label}</span>
                <span
                  className={
                    item.status === 'critical'
                      ? 'font-semibold text-red-200'
                      : item.status === 'warning'
                        ? 'font-semibold text-amber-200'
                        : 'font-semibold text-emerald-200'
                  }
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Opportunités et risques" subtitle="Les signaux commerciaux les plus utiles, sans doublons avec les actions préparées." compact={compact}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">Opportunités</p>
              <div className="mt-3 space-y-3">
                {data.opportunities.slice(0, 3).map((item) => (
                  <WorkbenchCard
                    key={`opp-${item.id}`}
                    item={recommendationToWorkbenchItem(item, 'today')}
                    onAction={handleAction}
                    busy={Boolean(busyIds[item.id])}
                  />
                ))}
                {data.opportunities.length === 0 ? <EmptyState title="Rien d'urgent pour le moment." description="Les prochaines opportunités apparaîtront ici." /> : null}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">Risques</p>
              <div className="mt-3 space-y-3">
                {data.risks.slice(0, 3).map((item) => (
                  <WorkbenchCard
                    key={`risk-${item.id}`}
                    item={recommendationToWorkbenchItem(item, 'attention')}
                    onAction={handleAction}
                    busy={Boolean(busyIds[item.id])}
                  />
                ))}
                {data.risks.length === 0 ? <EmptyState title="Aucun risque remonté." description="Kadria vous signalera ici les points sensibles." /> : null}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Charge commerciale" subtitle="Vue par responsable commercial : dossiers, devis, gagnés/perdus et potentiel." compact={compact}>
        <CommercialLoadTable items={data.commercialLoad} />
      </SectionCard>

      <SectionCard title="Charge terrain" subtitle="Vue par collaborateur : interventions du jour, temps planifié, disponibilité et incohérences." compact={compact}>
        <FieldLoadTable items={data.fieldLoad} />
      </SectionCard>

      <div
        className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-opacity duration-300 ${
          toast ? 'opacity-100' : 'pointer-events-none opacity-0'
        } ${toast?.error ? 'border-red-600 bg-[var(--bg-elevated)] text-red-400' : 'border-green-500/30 bg-[var(--bg-elevated)] text-[var(--text-1)]'}`}
      >
        {toast?.message || ''}
      </div>
    </div>
  )
}

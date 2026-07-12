'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type {
  CommercialLoadItem,
  FieldLoadItem,
  OperationsCenterResult,
  RecommendationItem,
  RecommendationPriority,
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

function formatCurrency(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} MEUR`
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} kEUR`
  return `${Math.round(value)} EUR`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Maintenant'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
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

async function logExecutedAction(item: RecommendationItem) {
  try {
    await fetch('/api/operations-center/actions/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommendationId: item.id,
        actionType: item.actionType,
        title: item.title,
        entityType: item.entityType,
        entityId: item.entityId,
        actionRoute: item.actionRoute,
      }),
    })
  } catch {
    // Best effort only.
  }
}

async function postAutomationAction(url: string) {
  const response = await fetch(url, { method: 'POST' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'Action impossible.')
  }
}

function RecommendationActions({
  item,
  onExecute,
  small = false,
}: {
  item: RecommendationItem
  onExecute: (item: RecommendationItem, variant?: 'primary' | 'secondary') => void
  small?: boolean
}) {
  const primaryClassName = small
    ? 'inline-flex items-center rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1.5 text-xs font-semibold text-green-300 transition-colors hover:bg-green-500/[0.16] focus:outline-none focus:ring-2 focus:ring-green-500/50'
    : 'inline-flex items-center rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1.5 text-xs font-semibold text-green-300 transition-colors hover:bg-green-500/[0.16] focus:outline-none focus:ring-2 focus:ring-green-500/50'
  const secondaryClassName =
    'inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] transition-colors hover:text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--border)]'

  return (
    <div className={`flex ${small ? 'flex-wrap justify-end gap-2' : 'flex-wrap gap-2'}`}>
      <button type="button" onClick={() => onExecute(item)} className={primaryClassName}>
        {item.actionLabel}
      </button>
      {item.secondaryAction && item.secondaryLabel && (
        <button type="button" onClick={() => onExecute(item, 'secondary')} className={secondaryClassName}>
          {item.secondaryLabel}
        </button>
      )}
    </div>
  )
}

function RecommendationRow({
  item,
  onExecute,
  executed,
}: {
  item: RecommendationItem
  onExecute: (item: RecommendationItem, variant?: 'primary' | 'secondary') => void
  executed: boolean
}) {
  const meta = PRIORITY_META[item.priority]
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 transition-all ${executed ? 'ring-1 ring-green-500/40' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-[var(--text-2)]">{meta.icon}</span>
            <p className="text-sm font-semibold text-[var(--text-1)]">{item.title}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>{meta.label}</span>
            {item.automationLabel ? (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                item.automationLabel === 'Automatique'
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-100'
                  : item.automationLabel === 'A valider'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300'
              }`}>
                {item.automationLabel}
              </span>
            ) : null}
            {item.estimatedMinutes ? (
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-2 py-0.5 text-[11px] text-[var(--text-3)]">
                ~{item.estimatedMinutes} min
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-[var(--text-2)]">{item.description}</p>
          <p className="mt-2 text-xs text-[var(--text-3)]">{item.reason}</p>
          {executed ? <p className="mt-2 text-xs font-semibold text-green-300">Action realisee. Recalcul au prochain chargement.</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs text-[var(--text-3)]">{formatDate(item.createdAt)}</span>
          <RecommendationActions item={item} onExecute={onExecute} />
        </div>
      </div>
    </div>
  )
}

function SmallList({
  title,
  items,
  onExecute,
}: {
  title: string
  items: RecommendationItem[]
  onExecute: (item: RecommendationItem, variant?: 'primary' | 'secondary') => void
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <p className="text-sm font-semibold text-[var(--text-1)]">{title}</p>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">Aucune action prioritaire pour cette rubrique.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-1)]">{item.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-3)]">{item.reason}</p>
                </div>
                <RecommendationActions item={item} onExecute={onExecute} small />
              </div>
            </div>
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
            <div><p className="text-[var(--text-3)]">Gagnes</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.wonCount}</p></div>
            <div><p className="text-[var(--text-3)]">Perdus</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.lostCount}</p></div>
            <div><p className="text-[var(--text-3)]">CA estime</p><p className="mt-1 font-semibold text-[var(--text-1)]">{formatCurrency(item.estimatedRevenue)}</p></div>
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
              {item.availability === 'busy' ? 'Occupe' : item.availability === 'soon' ? 'Bientot occupe' : 'Disponible'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-[var(--text-3)]">Interventions</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.appointmentCount}</p></div>
            <div><p className="text-[var(--text-3)]">Temps planifie</p><p className="mt-1 font-semibold text-[var(--text-1)]">{toMinutesLabel(item.plannedMinutes)}</p></div>
            <div><p className="text-[var(--text-3)]">Temps libre</p><p className="mt-1 font-semibold text-[var(--text-1)]">{toMinutesLabel(item.freeMinutes)}</p></div>
            <div><p className="text-[var(--text-3)]">Conflits</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.conflicts}</p></div>
            <div><p className="text-[var(--text-3)]">Km estimes</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.estimatedKm.toFixed(1)} km</p></div>
            <div><p className="text-[var(--text-3)]">Trajets incoherents</p><p className="mt-1 font-semibold text-[var(--text-1)]">{item.incoherentTravelCount}</p></div>
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
  const [executedIds, setExecutedIds] = useState<Record<string, true>>({})
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null)
  const healthClassName = HEALTH_META[data.health.label] || 'text-[var(--text-1)]'

  const groupedColumns = useMemo(
    () => [
      { label: 'Commercial', items: data.groupedActions.relances },
      { label: 'Planning', items: [...data.groupedActions.planifications, ...data.groupedActions.affectations].slice(0, 4) },
      { label: 'Entreprise', items: data.groupedActions.configuration.slice(0, 2) },
      { label: 'Configuration', items: data.groupedActions.configuration },
      { label: 'Avis', items: data.groupedActions.avis },
    ],
    [data],
  )

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const handleExecute = async (item: RecommendationItem, variant: 'primary' | 'secondary' = 'primary') => {
    const route = variant === 'secondary' ? item.secondaryRoute : item.actionRoute
    if (!route) return
    if ((variant === 'primary' ? item.actionType : item.secondaryAction) === 'execute_automation_run' || (variant === 'secondary' ? item.secondaryAction : item.actionType) === 'ignore_automation_run') {
      try {
        await postAutomationAction(route)
        setExecutedIds((current) => ({ ...current, [item.id]: true }))
        setToast({ message: variant === 'secondary' ? 'Action ignoree.' : 'Action effectuee.' })
      } catch (error) {
        setToast({ message: error instanceof Error ? error.message : 'Action impossible.', error: true })
      }
      return
    }
    setExecutedIds((current) => ({ ...current, [item.id]: true }))
    setToast({ message: variant === 'secondary' ? 'Redirection terminee.' : 'Action effectuee.' })
    void logExecutedAction(item)
    router.push(route)
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <SectionCard
        title="Centre d'actions"
        subtitle="Les actions a traiter maintenant, calculees a partir de vos statuts, delais, conflits et opportunites."
        compact={compact}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            {data.todayFocus.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--text-3)]">
                Rien de critique aujourd'hui. Votre cockpit est a jour.
              </div>
            ) : (
              data.todayFocus.map((item) => (
                <RecommendationRow key={item.id} item={item} onExecute={handleExecute} executed={Boolean(executedIds[item.id])} />
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <p className="text-sm font-semibold text-[var(--text-1)]">Sante de l'entreprise</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className={`text-3xl font-bold ${healthClassName}`}>{data.health.score}/100</p>
                  <p className="mt-1 text-sm text-[var(--text-2)]">{data.health.label}</p>
                </div>
                <span className="rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold text-green-300">
                  {data.recommendations.length} signaux suivis
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {data.health.breakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl bg-[var(--bg-hover)] px-3 py-2 text-sm">
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
            </div>

            <SmallList title="Ce qu'il faut faire aujourd'hui" items={data.todayFocus.slice(0, 5)} onExecute={handleExecute} />
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SmallList title="Opportunites" items={data.opportunities} onExecute={handleExecute} />
        <SmallList title="Risques" items={data.risks} onExecute={handleExecute} />
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <p className="text-sm font-semibold text-[var(--text-1)]">Mur des actions</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {groupedColumns.map((group) => (
              <div key={group.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--text-1)]">{group.label}</p>
                  <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs text-[var(--text-2)]">{group.items.length}</span>
                </div>
                <div className="mt-3 space-y-3">
                  {group.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-1)]">{item.title}</p>
                          <p className="mt-1 text-[11px] text-[var(--text-3)]">{item.estimatedMinutes ? `~${item.estimatedMinutes} min` : 'Action rapide'}</p>
                        </div>
                        <button type="button" onClick={() => handleExecute(item)} className="text-xs font-semibold text-green-300 hover:text-green-200">
                          {item.actionLabel}
                        </button>
                      </div>
                    </div>
                  ))}
                  {group.items.length === 0 ? <p className="text-xs text-[var(--text-3)]">Aucune action.</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionCard title="Charge commerciale" subtitle="Vue par responsable commercial : dossiers, devis, gagne/perdu et potentiel." compact={compact}>
        <CommercialLoadTable items={data.commercialLoad} />
      </SectionCard>

      <SectionCard title="Charge terrain" subtitle="Vue par collaborateur : interventions du jour, temps planifie, disponibilite et incoherences." compact={compact}>
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

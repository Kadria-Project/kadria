'use client'
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react/no-unescaped-entities */

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type AutomationHistoryRun = {
  id: string
  automationId: string
  automationType: string
  automationTitle: string
  mode: 'manual' | 'approval_required' | 'automatic'
  modeLabel: string
  status: 'pending' | 'prepared' | 'executing' | 'succeeded' | 'failed' | 'ignored'
  statusLabel: string
  entityType: 'project' | 'appointment' | 'configuration'
  entityId: string
  entityLabel: string
  entityHref: string | null
  triggerReason: string
  createdAt: string | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  executedBy: string | null
  executedByLabel: string | null
  errorMessage: string | null
  errorLabel: string | null
  idempotencyKeyPreview: string | null
  canExecute: boolean
  canIgnore: boolean
  canRetry: boolean
}

type RunsPayload = {
  success: boolean
  runs?: AutomationHistoryRun[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary?: {
    activeAutomations: number
    executedToday: number
    success: number
    failed: number
    pendingApproval: number
    ignored: number
    successRate: number
    estimatedMinutesSaved: number
  }
  systemState?: {
    paused: boolean
    pausedAt: string | null
    pausedBy: string | null
    pauseReason: string | null
    lastCronAt: string | null
    lastCronSuccessAt: string | null
    lastCronErrorAt: string | null
    lastCronErrorMessage: string | null
  }
  error?: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Toutes les situations' },
  { value: 'pending', label: 'En attente' },
  { value: 'prepared', label: "Kadria attend votre accord" },
  { value: 'executing', label: 'En cours' },
  { value: 'succeeded', label: 'Bien passee' },
  { value: 'failed', label: 'A revoir' },
  { value: 'ignored', label: 'Laissee de cote' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Toutes les automatisations' },
  { value: 'quote_followup', label: 'Relance devis' },
  { value: 'review_request', label: "Demande d'avis" },
  { value: 'won_project_followup', label: 'Projet gagne sans suivi' },
  { value: 'unassigned_project_alert', label: 'Dossier non affecte' },
  { value: 'appointment_reminder', label: 'Rappel rendez-vous' },
  { value: 'assignment_notification', label: "Notification d'affectation" },
]

const MODE_OPTIONS = [
  { value: '', label: 'Toutes les facons d agir' },
  { value: 'manual', label: 'Je decide a chaque fois' },
  { value: 'approval_required', label: "Kadria me demande avant d'agir" },
  { value: 'automatic', label: 'Kadria agit seul' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'Tous les elements' },
  { value: 'project', label: 'Dossier' },
  { value: 'appointment', label: 'Rendez-vous' },
  { value: 'configuration', label: 'Configuration' },
]

const PERIOD_OPTIONS = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '1', label: "Aujourd'hui" },
]

function formatDateTime(value: string | null) {
  if (!value) return 'Aucune'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Aucune'
  return date.toLocaleString('fr-FR')
}

function formatDuration(value: number | null) {
  if (!value || value <= 0) return 'n/a'
  if (value < 1000) return `${value} ms`
  const seconds = Math.round(value / 1000)
  return `${seconds}s`
}

function getReadableStatusLabel(status: AutomationHistoryRun['status']) {
  switch (status) {
    case 'pending':
      return 'En attente'
    case 'prepared':
      return "Kadria attend votre accord"
    case 'executing':
      return 'En cours'
    case 'succeeded':
      return 'Bien passee'
    case 'failed':
      return 'A revoir'
    case 'ignored':
      return 'Laissee de cote'
    default:
      return 'En attente'
  }
}

function getReadableModeLabel(mode: AutomationHistoryRun['mode']) {
  switch (mode) {
    case 'manual':
      return 'Je decide a chaque fois'
    case 'approval_required':
      return "Kadria me demande avant d'agir"
    case 'automatic':
      return 'Kadria agit seul'
    default:
      return 'A definir'
  }
}

function getReadableEntityLabel(entityType: AutomationHistoryRun['entityType']) {
  switch (entityType) {
    case 'project':
      return 'Dossier'
    case 'appointment':
      return 'Rendez-vous'
    case 'configuration':
      return 'Configuration'
    default:
      return 'Element'
  }
}

function getChronologyLabel(value: string | null) {
  if (!value) return 'Plus ancien'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Plus ancien'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - 6)

  if (date >= today) return "Aujourd'hui"
  if (date >= yesterday) return 'Hier'
  if (date >= weekStart) return 'Cette semaine'
  return 'Plus ancien'
}

function buildDateFrom(period: string) {
  const value = Number(period || 7)
  const date = new Date()
  date.setDate(date.getDate() - Math.max(0, value - 1))
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function AutomationsHistoryPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [runs, setRuns] = useState<AutomationHistoryRun[]>([])
  const [summary, setSummary] = useState<RunsPayload['summary'] | null>(null)
  const [systemState, setSystemState] = useState<RunsPayload['systemState'] | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<AutomationHistoryRun | null>(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    mode: '',
    entityType: '',
    period: '7',
  })

  useEffect(() => {
    const incomingStatus = searchParams?.get('status')
    if (incomingStatus) {
      setFilters((current) => ({ ...current, status: incomingStatus }))
    }
  }, [searchParams])

  async function load(page = 1, nextFilters = filters) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
        dateFrom: buildDateFrom(nextFilters.period),
      })
      if (nextFilters.status) params.set('status', nextFilters.status)
      if (nextFilters.type) params.set('type', nextFilters.type)
      if (nextFilters.mode) params.set('mode', nextFilters.mode)
      if (nextFilters.entityType) params.set('entityType', nextFilters.entityType)

      const response = await fetch(`/api/automations/runs?${params.toString()}`, { cache: 'no-store' })
      const payload = (await response.json()) as RunsPayload
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Impossible de charger l'historique.")
      }
      setRuns(payload.runs || [])
      setSummary(payload.summary || null)
      setSystemState(payload.systemState || null)
      setPagination(payload.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 })
      setSelectedRun((current) => {
        if (!current) return null
        return (payload.runs || []).find((run) => run.id === current.id) || null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger l'historique.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1, filters)
  }, [filters.period, filters.status, filters.type, filters.mode, filters.entityType])

  const filteredRuns = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr-FR')
    if (!normalizedQuery) return runs
    return runs.filter((run) => [run.automationTitle, run.entityLabel, run.triggerReason, run.statusLabel].some((value) => value.toLocaleLowerCase('fr-FR').includes(normalizedQuery)))
  }, [query, runs])
  const hasRuns = filteredRuns.length > 0

  async function runAction(run: AutomationHistoryRun, action: 'execute' | 'ignore' | 'retry') {
    const path =
      action === 'execute'
        ? `/api/automations/runs/${run.id}/execute`
        : action === 'ignore'
          ? `/api/automations/runs/${run.id}/ignore`
          : `/api/automations/runs/${run.id}/retry`

    setSubmittingId(run.id)
    setError(null)
    try {
      const response = await fetch(path, { method: 'POST' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || 'Action impossible.')
      }
      await load(pagination.page, filters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.')
    } finally {
      setSubmittingId(null)
    }
  }

  const headerLabel = useMemo(() => {
    if (!systemState) return 'Ce que Kadria a fait pour vous'
    if (systemState.paused) return 'Les actions automatiques sont en pause'
    return 'Ce que Kadria a fait pour vous'
  }, [systemState])

  const groupedRuns = useMemo(() => {
    const groups = new Map<string, AutomationHistoryRun[]>()
    for (const run of filteredRuns) {
      const key = getChronologyLabel(run.createdAt)
      const items = groups.get(key) || []
      items.push(run)
      groups.set(key, items)
    }

    return ["Aujourd'hui", 'Hier', 'Cette semaine', 'Plus ancien']
      .map((label) => ({ label, runs: groups.get(label) || [] }))
      .filter((group) => group.runs.length > 0)
  }, [filteredRuns])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 text-slate-900">
      <nav aria-label="Fil d’Ariane" className="mb-4 text-sm text-slate-500">Workspace / Paramètres / Automatisations / <span className="text-slate-700">Historique</span></nav>
      <div>
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Journal des actions</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{headerLabel}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Retrouvez les actions deja lancees, celles qui attendent votre accord et celles qui meritent votre attention.
          </p>
        </section>

        {error ? (
          <div className="mt-6 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
        ) : null}

        <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryCard label="Aides actives" value={String(summary?.activeAutomations || 0)} />
            <SummaryCard label="Actions faites aujourd'hui" value={String(summary?.executedToday || 0)} />
            <SummaryCard label="Actions bien passees" value={String(summary?.success || 0)} />
            <SummaryCard label="Actions a revoir" value={String(summary?.failed || 0)} />
            <SummaryCard label="Kadria attend votre accord" value={String(summary?.pendingApproval || 0)} />
            <SummaryCard label="Actions laissees de cote" value={String(summary?.ignored || 0)} />
            <SummaryCard label="Fiabilite recente" value={`${summary?.successRate || 0}%`} />
            <SummaryCard label="Temps estime gagne" value={`${summary?.estimatedMinutesSaved || 0} min`} />
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
            Derniere verification : {formatDateTime(systemState?.lastCronAt || null)}. Derniere action bien passee : {formatDateTime(systemState?.lastCronSuccessAt || null)}.
            {systemState?.lastCronErrorMessage ? <span className="block pt-2 text-rose-300">Dernier point a revoir : {systemState.lastCronErrorMessage}</span> : null}
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Retrouver une action en quelques secondes</p>
              <p className="mt-1 text-sm text-zinc-400">Affinez simplement par periode, situation, aide concernee ou element suivi.</p>
            </div>
            <label className="w-full sm:max-w-xs"><span className="sr-only">Rechercher une action</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une action…" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white placeholder:text-zinc-500" /></label>
          </div>
          <div className="grid gap-3 lg:grid-cols-5">
            <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Periode</span>
              <select value={filters.period} onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white">
                {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Situation</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white">
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Aide concernee</span>
              <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white">
                {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Facon d agir</span>
              <select value={filters.mode} onChange={(event) => setFilters((current) => ({ ...current, mode: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white">
                {MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Element suivi</span>
              <select value={filters.entityType} onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white">
                {ENTITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          {loading ? (
            <div className="rounded-[18px] border border-white/10 bg-black/10 p-5 text-sm text-zinc-400">Chargement de l'historique...</div>
          ) : !hasRuns ? (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-zinc-500">
              Aucune action ne correspond a ces filtres pour le moment.
            </div>
          ) : (
            <>
              <div className="grid gap-5">
                {groupedRuns.map((group) => (
                  <div key={group.label}>
                    <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-zinc-500">{group.label}</p>
                    <div className="grid gap-3">
                      {group.runs.map((run) => (
                        <article key={run.id} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-white">{run.automationTitle}</p>
                                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] text-zinc-300">
                                  {getReadableStatusLabel(run.status)}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] text-zinc-300">
                                  {getReadableModeLabel(run.mode)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-zinc-300">{run.entityLabel}</p>
                              <p className="mt-2 text-xs text-zinc-500">{run.triggerReason}</p>
                              <p className="mt-2 text-xs text-zinc-500">{formatDateTime(run.createdAt)}</p>
                            </div>
                            <button type="button" onClick={() => setSelectedRun(run)} className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.06]">
                              Voir le detail
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-400">
                  {pagination.total} action(s) - page {pagination.page} / {Math.max(1, pagination.totalPages)}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => void load(pagination.page - 1, filters)}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Precedent
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => void load(pagination.page + 1, filters)}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedRun ? (
        <div className="fixed inset-0 z-50">
          <button type="button" onClick={() => setSelectedRun(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col overflow-hidden border-l border-white/10 bg-[#0f1113] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedRun.automationTitle}</h2>
                <p className="mt-1 text-sm text-zinc-400">{selectedRun.entityLabel}</p>
              </div>
              <button type="button" onClick={() => setSelectedRun(null)} className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
                Fermer
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <SummaryCard label="Situation" value={getReadableStatusLabel(selectedRun.status)} />
                <SummaryCard label="Facon d agir" value={getReadableModeLabel(selectedRun.mode)} />
                <SummaryCard label="Date" value={formatDateTime(selectedRun.createdAt)} />
                <SummaryCard label="Temps pris" value={formatDuration(selectedRun.durationMs)} />
              </div>

              <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Pourquoi cette action est apparue</p>
                <p className="mt-2 text-sm text-zinc-300">{selectedRun.triggerReason}</p>
              </div>

              <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Ce que vous devez savoir</p>
                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                  <p>Debut : {formatDateTime(selectedRun.startedAt)}</p>
                  <p>Fin : {formatDateTime(selectedRun.completedAt)}</p>
                  <p>Decision prise par : {selectedRun.executedByLabel || 'Aucune personne'}</p>
                  <p>Type d element : {getReadableEntityLabel(selectedRun.entityType)}</p>
                </div>
              </div>

              {selectedRun.errorLabel ? (
                <div className="mt-5 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {selectedRun.errorLabel}
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/10 px-6 py-4">
              <div className="flex flex-wrap gap-3">
                {selectedRun.entityHref ? (
                  <button type="button" onClick={() => router.push(selectedRun.entityHref || '/parametres')} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]">
                    Ouvrir l&apos;element concerne
                  </button>
                ) : null}
                {selectedRun.canExecute ? (
                  <button type="button" disabled={submittingId === selectedRun.id} onClick={() => void runAction(selectedRun, 'execute')} className="rounded-xl bg-[#22c55e] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
                    {submittingId === selectedRun.id ? 'Action en cours...' : "Valider et laisser Kadria agir"}
                  </button>
                ) : null}
                {selectedRun.canIgnore ? (
                  <button type="button" disabled={submittingId === selectedRun.id} onClick={() => void runAction(selectedRun, 'ignore')} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-60">
                    Pas maintenant
                  </button>
                ) : null}
                {selectedRun.canRetry ? (
                  <button type="button" disabled={submittingId === selectedRun.id} onClick={() => void runAction(selectedRun, 'retry')} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-wait disabled:opacity-60">
                    {submittingId === selectedRun.id ? 'Nouvel essai en cours...' : 'Reessayer'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default function AutomationsHistoryPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-2)',
            fontFamily: 'system-ui',
          }}
        >
          Kadria prepare l'historique...
        </div>
      }
    >
      <AutomationsHistoryPageContent />
    </Suspense>
  )
}

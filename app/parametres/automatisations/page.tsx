'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'

type AutomationItem = {
  definition: {
    type: string
    title: string
    description: string
    allowedChannels: string[]
    automaticAllowed: boolean
  }
  automation: {
    type: string
    enabled: boolean
    mode: 'manual' | 'approval_required' | 'automatic'
    delayValue: number | null
    delayUnit: 'hours' | 'days' | null
    channel: 'email' | 'internal' | null
    lastRunAt: string | null
    lastSuccessAt: string | null
    lastErrorAt: string | null
    lastErrorMessage: string | null
  }
}

type AutomationSummary = {
  activeAutomations: number
  executedToday: number
  success: number
  failed: number
  pendingApproval: number
  ignored: number
  successRate: number
  estimatedMinutesSaved: number
}

type AutomationSystemState = {
  paused: boolean
  pausedAt: string | null
  pausedBy: string | null
  pauseReason: string | null
  lastCronAt: string | null
  lastCronSuccessAt: string | null
  lastCronErrorAt: string | null
  lastCronErrorMessage: string | null
}

type RecentRun = {
  id: string
  automationTitle: string
  modeLabel: string
  statusLabel: string
  entityLabel: string
  createdAt: string | null
  errorLabel: string | null
  canRetry: boolean
}

type AutomationsPayload = {
  success: boolean
  items?: AutomationItem[]
  summary?: AutomationSummary
  systemState?: AutomationSystemState
  recentRuns?: RecentRun[]
  permissions?: {
    canRead: boolean
    canManage: boolean
  }
  error?: string
}

const EMPTY_SUMMARY: AutomationSummary = {
  activeAutomations: 0,
  executedToday: 0,
  success: 0,
  failed: 0,
  pendingApproval: 0,
  ignored: 0,
  successRate: 0,
  estimatedMinutesSaved: 0,
}

const EMPTY_SYSTEM_STATE: AutomationSystemState = {
  paused: false,
  pausedAt: null,
  pausedBy: null,
  pauseReason: null,
  lastCronAt: null,
  lastCronSuccessAt: null,
  lastCronErrorAt: null,
  lastCronErrorMessage: null,
}

function formatDateTime(value: string | null) {
  if (!value) return 'Aucune'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Aucune'
  return date.toLocaleString('fr-FR')
}

function formatMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 min'
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return minutes > 0 ? `${hours} h ${minutes}` : `${hours} h`
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white sm:text-xl">{value}</p>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  )
}

export default function AutomationsSettingsPage() {
  const router = useRouter()
  const [items, setItems] = useState<AutomationItem[]>([])
  const [summary, setSummary] = useState<AutomationSummary>(EMPTY_SUMMARY)
  const [systemState, setSystemState] = useState<AutomationSystemState>(EMPTY_SYSTEM_STATE)
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pauseSaving, setPauseSaving] = useState(false)
  const [permissions, setPermissions] = useState({ canRead: false, canManage: false })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/automations', { cache: 'no-store' })
      const payload = (await response.json()) as AutomationsPayload
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Impossible de charger les automatisations.')
      }
      setItems(payload.items || [])
      setSummary(payload.summary || EMPTY_SUMMARY)
      setSystemState(payload.systemState || EMPTY_SYSTEM_STATE)
      setRecentRuns(payload.recentRuns || [])
      setPermissions(payload.permissions || { canRead: false, canManage: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les automatisations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function saveItem(item: AutomationItem) {
    setSavingType(item.automation.type)
    setError(null)
    try {
      const response = await fetch('/api/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.automation),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Sauvegarde impossible.')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible.')
    } finally {
      setSavingType(null)
    }
  }

  async function togglePause() {
    if (!permissions.canManage) return
    setPauseSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/automations/pause', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paused: !systemState.paused,
          reason: !systemState.paused ? 'Pause demandee depuis les parametres automatisations.' : null,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Impossible de mettre a jour la pause globale.')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre a jour la pause globale.')
    } finally {
      setPauseSaving(false)
    }
  }

  function updateLocal(type: string, patch: Partial<AutomationItem['automation']>) {
    setItems((current) =>
      current.map((item) =>
        item.automation.type === type
          ? { ...item, automation: { ...item.automation, ...patch } }
          : item,
      ),
    )
  }

  const systemLabel = useMemo(() => {
    if (systemState.paused) return 'Automatisations en pause'
    if (systemState.lastCronErrorAt) return 'Surveillance active avec erreur recente'
    return 'Moteur actif'
  }, [systemState.lastCronErrorAt, systemState.paused])

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-6 xl:px-10">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button onClick={() => router.push('/parametres')} className="shrink-0 text-sm text-[var(--text-2)]">
            {'<- Retour'}
          </button>
          <div className="min-w-0 flex-1 sm:flex-none">
            <KadriaLogo size="sm" theme="dark" noLink />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 xl:px-10">
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Automatisations</p>
              <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                Activez des regles metier simples, explicables et reversibles.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Aucune automatisation n&apos;est activee par defaut. Le mode recommande est validation requise.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">6 regles initialisees</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Source de verite Supabase</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Cron horaire securise</span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[260px]">
              <button
                type="button"
                onClick={() => router.push('/parametres/automatisations/historique')}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Voir l&apos;historique
              </button>
              {permissions.canManage ? (
                <button
                  type="button"
                  onClick={() => void togglePause()}
                  disabled={pauseSaving}
                  className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
                    systemState.paused
                      ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                      : 'border border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'
                  }`}
                >
                  {pauseSaving ? 'Mise a jour...' : systemState.paused ? 'Reprendre le moteur' : 'Mettre en pause'}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <div className="mt-6 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
        ) : null}

        <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Etat du systeme</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{systemLabel}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Dernier passage cron : {formatDateTime(systemState.lastCronAt)}. Dernier succes : {formatDateTime(systemState.lastCronSuccessAt)}.
              </p>
            </div>
            {systemState.paused ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {systemState.pauseReason || 'Aucune execution automatique ne sera lancee tant que la pause globale reste active.'}
              </div>
            ) : systemState.lastCronErrorMessage ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                Derniere erreur : {systemState.lastCronErrorMessage}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryCard label="Automatisations actives" value={String(summary.activeAutomations)} />
            <SummaryCard label="Actions executees aujourd'hui" value={String(summary.executedToday)} />
            <SummaryCard label="Actions a valider" value={String(summary.pendingApproval)} />
            <SummaryCard label="Temps estime economise" value={formatMinutes(summary.estimatedMinutesSaved)} hint="Estimation calculee a partir d'un temps moyen par action." />
            <SummaryCard label="Actions reussies" value={String(summary.success)} />
            <SummaryCard label="Actions en echec" value={String(summary.failed)} />
            <SummaryCard label="Actions ignorees" value={String(summary.ignored)} />
            <SummaryCard label="Taux de reussite" value={`${summary.successRate}%`} />
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Dernieres executions</h2>
              <p className="mt-1 text-sm text-zinc-400">Apercu rapide des derniers runs detectes ou executes par le moteur.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/parametres/automatisations/historique')}
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
            >
              Ouvrir le detail
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {loading ? (
              <div className="rounded-[18px] border border-white/10 bg-black/10 p-5 text-sm text-zinc-400">Chargement...</div>
            ) : recentRuns.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-zinc-500">
                Aucun run recent a afficher pour le moment.
              </div>
            ) : (
              recentRuns.map((run) => (
                <article key={run.id} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{run.automationTitle}</p>
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-zinc-300">{run.modeLabel}</span>
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-zinc-300">{run.statusLabel}</span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">{run.entityLabel}</p>
                      <p className="mt-1 text-xs text-zinc-500">{formatDateTime(run.createdAt)}</p>
                      {run.errorLabel ? <p className="mt-2 text-xs text-rose-300">{run.errorLabel}</p> : null}
                    </div>
                    {run.canRetry ? (
                      <button
                        type="button"
                        onClick={() => router.push('/parametres/automatisations/historique?status=failed')}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
                      >
                        Voir les echecs
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-4">
          {loading ? (
            <div className="rounded-[18px] border border-white/10 bg-black/10 p-5 text-sm text-zinc-400">Chargement...</div>
          ) : (
            items.map((item) => (
              <article key={item.automation.type} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{item.definition.title}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.automation.enabled ? 'bg-emerald-500/10 text-emerald-200' : 'bg-zinc-800 text-zinc-300'}`}>
                        {item.automation.enabled ? 'Activee' : 'Desactivee'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{item.definition.description}</p>
                    <div className="mt-3 text-xs text-zinc-500">
                      Derniere execution : {formatDateTime(item.automation.lastRunAt)}
                    </div>
                    {item.automation.lastErrorMessage ? (
                      <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        Derniere erreur : {item.automation.lastErrorMessage}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[480px]">
                    <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Activation</span>
                      <select
                        value={item.automation.enabled ? 'on' : 'off'}
                        disabled={!permissions.canManage}
                        onChange={(event) => updateLocal(item.automation.type, { enabled: event.target.value === 'on' })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="off">Desactivee</option>
                        <option value="on">Activee</option>
                      </select>
                    </label>

                    <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Mode</span>
                      <select
                        value={item.automation.mode}
                        disabled={!permissions.canManage}
                        onChange={(event) => updateLocal(item.automation.type, { mode: event.target.value as AutomationItem['automation']['mode'] })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="manual">Manuel</option>
                        <option value="approval_required">Validation requise</option>
                        <option value="automatic" disabled={!item.definition.automaticAllowed}>Automatique</option>
                      </select>
                    </label>

                    <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Delai</span>
                      <input
                        type="number"
                        min={0}
                        disabled={!permissions.canManage}
                        value={item.automation.delayValue ?? 0}
                        onChange={(event) => updateLocal(item.automation.type, { delayValue: Number(event.target.value) })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>

                    <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Unite</span>
                      <select
                        value={item.automation.delayUnit || 'days'}
                        disabled={!permissions.canManage}
                        onChange={(event) => updateLocal(item.automation.type, { delayUnit: event.target.value as 'hours' | 'days' })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="hours">Heures</option>
                        <option value="days">Jours</option>
                      </select>
                    </label>

                    <label className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:col-span-2">
                      <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Canal</span>
                      <select
                        value={item.automation.channel || item.definition.allowedChannels[0]}
                        disabled={!permissions.canManage}
                        onChange={(event) => updateLocal(item.automation.type, { channel: event.target.value as 'email' | 'internal' })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {item.definition.allowedChannels.includes('email') ? <option value="email">Email</option> : null}
                        {item.definition.allowedChannels.includes('internal') ? <option value="internal">Interne</option> : null}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {permissions.canManage ? (
                    <button
                      type="button"
                      onClick={() => void saveItem(item)}
                      disabled={savingType === item.automation.type}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                    >
                      {savingType === item.automation.type ? 'Sauvegarde...' : 'Enregistrer'}
                    </button>
                  ) : (
                    <span className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-400">
                      Consultation seule
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">
                    {item.automation.mode === 'automatic' ? 'Le mode automatique reste borne aux actions autorisees dans ce lot.' : 'Aucune action n est executee sans votre choix explicite ou le mode configure.'}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  )
}

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

function getModeLabel(mode: AutomationItem['automation']['mode']) {
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

function getStatusLabel(enabled: boolean) {
  return enabled ? 'Activee' : 'Desactivee'
}

function getChannelLabel(channel: 'email' | 'internal' | null) {
  if (channel === 'email') return 'Email'
  if (channel === 'internal') return 'Dans Kadria'
  return 'Selon le contexte'
}

function getDelaySummary(item: AutomationItem) {
  const value = item.automation.delayValue ?? 0
  const unit = item.automation.delayUnit === 'hours' ? 'heure' : 'jour'
  const plural = value > 1 ? 's' : ''

  switch (item.automation.type) {
    case 'quote_followup':
      return value > 0 ? `${value} ${unit}${plural} apres l'envoi du devis` : "Dès qu'un devis peut être relancé"
    case 'review_request':
      return value > 0 ? `${value} ${unit}${plural} apres la fin du chantier` : 'Dès la fin du chantier'
    case 'won_project_followup':
      return value > 0 ? `${value} ${unit}${plural} apres la signature` : 'Dès qu un projet est gagne'
    case 'unassigned_project_alert':
      return value > 0 ? `${value} ${unit}${plural} apres la creation du dossier` : 'Dès qu un dossier reste sans responsable'
    case 'appointment_reminder':
      return value > 0 ? `${value} ${unit}${plural} avant le rendez-vous` : 'Juste avant le rendez-vous'
    case 'assignment_notification':
      return value > 0 ? `${value} ${unit}${plural} apres l'affectation` : "Dès qu'une affectation change"
    default:
      return value > 0 ? `${value} ${unit}${plural}` : 'Selon le reglage choisi'
  }
}

function getWhySummary(item: AutomationItem) {
  switch (item.automation.type) {
    case 'quote_followup':
      return 'Pour ne pas laisser un devis sans reponse trop longtemps.'
    case 'review_request':
      return "Pour demander un avis au bon moment, sans oubli."
    case 'won_project_followup':
      return 'Pour ne pas laisser un chantier gagne sans prochaine etape.'
    case 'unassigned_project_alert':
      return 'Pour qu aucun dossier actif ne reste sans pilote commercial.'
    case 'appointment_reminder':
      return 'Pour reduire les oublis et preparer les rendez-vous a temps.'
    case 'assignment_notification':
      return "Pour que l'equipe sache tout de suite qui prend la suite."
    default:
      return item.definition.description
  }
}

function getValueSummary(item: AutomationItem) {
  switch (item.automation.type) {
    case 'quote_followup':
      return 'Moins de relances manuelles, plus de devis suivis'
    case 'review_request':
      return "Plus d'avis Google demandes au bon moment"
    case 'won_project_followup':
      return 'Moins d oublis apres signature'
    case 'unassigned_project_alert':
      return 'Chaque dossier garde un pilote clair'
    case 'appointment_reminder':
      return 'Moins d oublis avant rendez-vous'
    case 'assignment_notification':
      return "L'equipe reste alignee sans se courir apres"
    default:
      return 'Du temps gagne au quotidien'
  }
}

function getGlobalStatusLabel(systemState: AutomationSystemState) {
  if (systemState.paused) return 'Toutes les actions automatiques sont en pause'
  if (systemState.lastCronErrorAt) return 'Kadria surveille bien vos regles, avec une alerte recente'
  return 'Kadria suit vos regles en continu'
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
            reason: !systemState.paused ? 'Pause demandee depuis la page des aides automatiques.' : null,
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

  const systemLabel = useMemo(() => getGlobalStatusLabel(systemState), [systemState])
  const activeCount = useMemo(() => items.filter((item) => item.automation.enabled).length, [items])
  const pendingCount = summary.pendingApproval
  const inactiveCount = useMemo(() => Math.max(items.length - activeCount, 0), [activeCount, items.length])

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
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Kadria peut vous aider ici</p>
              <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                Choisissez ce que Kadria peut faire pour vous, et a quel moment il doit vous demander votre accord.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Tout est desactive par defaut. Vous gardez toujours la main, et chaque reglage reste clair, modifiable et reversible.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">6 aides prêtes a regler</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Rien ne part sans votre choix</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Vous pouvez tout mettre en pause</span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[260px]">
              <button
                type="button"
                onClick={() => router.push('/parametres/automatisations/historique')}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Voir ce que Kadria a fait
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
                    {pauseSaving ? 'Mise a jour en cours...' : systemState.paused ? 'Reprendre les actions automatiques' : 'Tout mettre en pause'}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <div className="mt-6 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
        ) : null}

        <section className="mt-6 rounded-[24px] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(34,197,94,0.12),rgba(255,255,255,0.03))] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/90">En un coup d'oeil</p>
              <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                Kadria peut deja gerer automatiquement {items.length || 0} taches du quotidien.
              </h2>
              <p className="mt-2 text-sm text-zinc-300">
                Vous voyez tout de suite ce qui tourne deja, ce qui attend votre feu vert et ce qui reste encore a activer.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[480px]">
              <div className="rounded-2xl border border-emerald-500/20 bg-black/20 px-4 py-4">
                <p className="text-xs font-semibold text-emerald-300">Actives</p>
                <p className="mt-2 text-2xl font-semibold text-white">{activeCount}</p>
                <p className="mt-1 text-xs text-zinc-400">Kadria agit deja selon vos regles.</p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-black/20 px-4 py-4">
                <p className="text-xs font-semibold text-amber-200">En attente de votre accord</p>
                <p className="mt-2 text-2xl font-semibold text-white">{pendingCount}</p>
                <p className="mt-1 text-xs text-zinc-400">Une decision simple suffit pour debloquer l'action.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs font-semibold text-zinc-300">Desactivees</p>
                <p className="mt-2 text-2xl font-semibold text-white">{inactiveCount}</p>
                <p className="mt-1 text-xs text-zinc-400">Vous pouvez les activer quand vous le souhaitez.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Vue d'ensemble</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{systemLabel}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Derniere verification : {formatDateTime(systemState.lastCronAt)}. Derniere action bien passee : {formatDateTime(systemState.lastCronSuccessAt)}.
              </p>
            </div>
            {systemState.paused ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {systemState.pauseReason || 'Kadria ne lancera aucune action tant que cette pause reste active.'}
              </div>
            ) : systemState.lastCronErrorMessage ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                Point de vigilance recent : {systemState.lastCronErrorMessage}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryCard label="Aides actives" value={String(summary.activeAutomations)} />
            <SummaryCard label="Actions faites aujourd'hui" value={String(summary.executedToday)} />
            <SummaryCard label="Kadria attend votre accord" value={String(summary.pendingApproval)} />
            <SummaryCard label="Temps estime gagne" value={formatMinutes(summary.estimatedMinutesSaved)} hint="Estimation basee sur un temps moyen gagne par action." />
            <SummaryCard label="Actions bien passees" value={String(summary.success)} />
            <SummaryCard label="Actions a revoir" value={String(summary.failed)} />
            <SummaryCard label="Actions laissees de cote" value={String(summary.ignored)} />
            <SummaryCard label="Fiabilite recente" value={`${summary.successRate}%`} />
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Ce que Kadria a fait recemment</h2>
              <p className="mt-1 text-sm text-zinc-400">Un apercu simple des dernieres actions realisees, de celles en attente et des points a verifier.</p>
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
              <div className="rounded-[18px] border border-white/10 bg-black/10 p-5 text-sm text-zinc-400">Chargement des dernieres actions...</div>
            ) : recentRuns.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-zinc-500">
                Aucune action enregistree pour le moment.
              </div>
            ) : (
              recentRuns.map((run) => (
                <article key={run.id} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{run.automationTitle}</p>
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-zinc-300">
                          {run.modeLabel === 'A valider' ? "Kadria attend votre accord" : run.modeLabel}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-zinc-300">
                          {run.statusLabel === 'Echoue' ? 'A revoir' : run.statusLabel === 'Ignore' ? 'Laissee de cote' : run.statusLabel}
                        </span>
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
                         Voir les actions a revoir
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
            <div className="rounded-[18px] border border-white/10 bg-black/10 p-5 text-sm text-zinc-400">Chargement des reglages...</div>
          ) : (
            items.map((item) => (
              <article key={item.automation.type} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                     <div className="flex flex-wrap items-center gap-2">
                       <h2 className="text-lg font-semibold text-white">{item.definition.title}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.automation.enabled ? 'bg-emerald-500/10 text-emerald-200' : 'bg-zinc-800 text-zinc-300'}`}>
                          {getStatusLabel(item.automation.enabled)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-zinc-300">
                          {getValueSummary(item)}
                        </span>
                      </div>
                     <p className="mt-2 text-sm leading-6 text-zinc-400">{item.definition.description}</p>
                     <div className="mt-4 grid gap-3 sm:grid-cols-3">
                       <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                         <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Que fait Kadria ?</p>
                         <p className="mt-2 text-sm text-white">{item.definition.title}</p>
                       </div>
                       <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                         <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Quand ?</p>
                         <p className="mt-2 text-sm text-white">{getDelaySummary(item)}</p>
                       </div>
                       <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                         <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Pourquoi ?</p>
                         <p className="mt-2 text-sm text-white">{getWhySummary(item)}</p>
                       </div>
                     </div>
                     <div className="mt-3 text-xs text-zinc-500">
                       Derniere action sur cette aide : {formatDateTime(item.automation.lastRunAt)}
                     </div>
                     {item.automation.lastErrorMessage ? (
                       <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                         Dernier point a revoir : {item.automation.lastErrorMessage}
                       </div>
                     ) : null}
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[480px]">
                      <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Souhaitez-vous l'activer ?</span>
                      <select
                        value={item.automation.enabled ? 'on' : 'off'}
                        disabled={!permissions.canManage}
                        onChange={(event) => updateLocal(item.automation.type, { enabled: event.target.value === 'on' })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                          <option value="off">Non, laisser desactive</option>
                          <option value="on">Oui, activer cette aide</option>
                        </select>
                      </label>

                      <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Comment doit agir Kadria ?</span>
                      <select
                        value={item.automation.mode}
                        disabled={!permissions.canManage}
                        onChange={(event) => updateLocal(item.automation.type, { mode: event.target.value as AutomationItem['automation']['mode'] })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                          <option value="manual">{getModeLabel('manual')}</option>
                          <option value="approval_required">{getModeLabel('approval_required')}</option>
                          <option value="automatic" disabled={!item.definition.automaticAllowed}>{getModeLabel('automatic')}</option>
                        </select>
                      </label>

                      <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Dans combien de temps ?</span>
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
                        <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Exprimez ce delai en</span>
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
                        <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Par quel moyen ?</span>
                      <select
                        value={item.automation.channel || item.definition.allowedChannels[0]}
                        disabled={!permissions.canManage}
                        onChange={(event) => updateLocal(item.automation.type, { channel: event.target.value as 'email' | 'internal' })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                          {item.definition.allowedChannels.includes('email') ? <option value="email">{getChannelLabel('email')}</option> : null}
                          {item.definition.allowedChannels.includes('internal') ? <option value="internal">{getChannelLabel('internal')}</option> : null}
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
                      {savingType === item.automation.type ? 'Sauvegarde...' : 'Enregistrer ce reglage'}
                    </button>
                  ) : (
                    <span className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-400">
                      Visible uniquement
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">
                    {item.automation.mode === 'automatic'
                      ? 'Kadria agira seul uniquement sur les actions autorisees pour cette aide.'
                      : item.automation.mode === 'approval_required'
                        ? "Kadria preparera l'action puis vous demandera votre accord."
                        : 'Kadria vous signalera simplement le bon moment pour agir.'}
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

'use client'

import { useEffect, useState } from 'react'
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

export default function AutomationsSettingsPage() {
  const router = useRouter()
  const [items, setItems] = useState<AutomationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/automations', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Impossible de charger les automatisations.')
      }
      setItems(payload.items || [])
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

  function updateLocal(type: string, patch: Partial<AutomationItem['automation']>) {
    setItems((current) =>
      current.map((item) =>
        item.automation.type === type
          ? { ...item, automation: { ...item.automation, ...patch } }
          : item,
      ),
    )
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-6 xl:px-10">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button onClick={() => router.push('/parametres')} className="shrink-0 text-sm text-[var(--text-2)]">
            ← Retour
          </button>
          <div className="min-w-0 flex-1 sm:flex-none">
            <KadriaLogo size="sm" theme="dark" noLink />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 xl:px-10">
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Automatisations</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            Activez des regles metier simples, explicables et reversibles.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Aucune automatisation n&apos;est activee par defaut. Le mode recommande est validation requise.
          </p>
        </section>

        {error ? (
          <div className="mt-6 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
        ) : null}

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
                      Derniere execution : {item.automation.lastRunAt ? new Date(item.automation.lastRunAt).toLocaleString('fr-FR') : 'Aucune'}
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
                        onChange={(event) => updateLocal(item.automation.type, { enabled: event.target.value === 'on' })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                      >
                        <option value="off">Desactivee</option>
                        <option value="on">Activee</option>
                      </select>
                    </label>

                    <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Mode</span>
                      <select
                        value={item.automation.mode}
                        onChange={(event) => updateLocal(item.automation.type, { mode: event.target.value as AutomationItem['automation']['mode'] })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
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
                        value={item.automation.delayValue ?? 0}
                        onChange={(event) => updateLocal(item.automation.type, { delayValue: Number(event.target.value) })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                      />
                    </label>

                    <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Unite</span>
                      <select
                        value={item.automation.delayUnit || 'days'}
                        onChange={(event) => updateLocal(item.automation.type, { delayUnit: event.target.value as 'hours' | 'days' })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                      >
                        <option value="hours">Heures</option>
                        <option value="days">Jours</option>
                      </select>
                    </label>

                    <label className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:col-span-2">
                      <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Canal</span>
                      <select
                        value={item.automation.channel || item.definition.allowedChannels[0]}
                        onChange={(event) => updateLocal(item.automation.type, { channel: event.target.value as 'email' | 'internal' })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                      >
                        {item.definition.allowedChannels.includes('email') ? <option value="email">Email</option> : null}
                        {item.definition.allowedChannels.includes('internal') ? <option value="internal">Interne</option> : null}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void saveItem(item)}
                    disabled={savingType === item.automation.type}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                  >
                    {savingType === item.automation.type ? 'Sauvegarde...' : 'Enregistrer'}
                  </button>
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

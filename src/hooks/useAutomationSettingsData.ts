'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
export type AutomationItem = { definition: { type: string; title: string; description: string; allowedChannels: string[]; automaticAllowed: boolean }; automation: { type: string; enabled: boolean; mode: 'manual' | 'approval_required' | 'automatic'; delayValue: number | null; delayUnit: 'hours' | 'days' | null; channel: 'email' | 'internal' | null; lastRunAt: string | null; lastErrorMessage: string | null } }
type Payload = { success: boolean; items?: AutomationItem[]; systemState?: { paused: boolean; lastCronAt: string | null; lastCronErrorMessage: string | null }; permissions?: { canRead: boolean; canManage: boolean }; error?: string }
type RecentRunsPayload = { success: boolean; runs?: Array<{ id: string; automationTitle: string; statusLabel: string; createdAt: string | null; errorLabel: string | null }> }
const REQUEST_TIMEOUT_MS = 3_000

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

export function useAutomationSettingsData() {
  const [items, setItems] = useState<AutomationItem[]>([])
  const [systemState, setSystemState] = useState({ paused: false, lastCronAt: null as string | null, lastCronErrorMessage: null as string | null })
  const [recentRuns, setRecentRuns] = useState<NonNullable<RecentRunsPayload['runs']>>([])
  const [permissions, setPermissions] = useState({ canRead: false, canManage: false })
  const [loading, setLoading] = useState(true)
  const [recentRunsState, setRecentRunsState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [mutating, setMutating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadRecentRuns = useCallback(async () => {
    setRecentRunsState('loading')
    try {
      const response = await fetchWithTimeout('/api/automations/runs?page=1&limit=4', { cache: 'no-store' })
      const payload = await response.json().catch(() => null) as RecentRunsPayload | null
      if (!response.ok || !payload?.success) throw new Error()
      setRecentRuns(payload.runs || [])
      setRecentRunsState('ready')
    } catch {
      setRecentRunsState('error')
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithTimeout('/api/automations', { cache: 'no-store' })
      const payload = await response.json() as Payload
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Chargement impossible.')
      setItems(payload.items || [])
      setSystemState(payload.systemState || { paused: false, lastCronAt: null, lastCronErrorMessage: null })
      setPermissions(payload.permissions || { canRead: false, canManage: false })
      // Le journal n'empêche jamais l'affichage des réglages critiques.
      void loadRecentRuns()
    } catch {
      setError('Chargement des automatisations impossible. Réessayez dans quelques instants.')
    } finally {
      setLoading(false)
    }
  }, [loadRecentRuns])

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])

  const save = async (item: AutomationItem) => {
    setMutating(item.automation.type); setError(null)
    try {
      const response = await fetchWithTimeout('/api/automations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.automation) })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error()
      await load()
    } catch { setError('Sauvegarde impossible. Réessayez dans quelques instants.') } finally { setMutating(null) }
  }
  const pause = async () => {
    setMutating('pause')
    try {
      const response = await fetchWithTimeout('/api/automations/pause', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paused: !systemState.paused, reason: !systemState.paused ? 'Pause demandée depuis les paramètres.' : null }) })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error()
      await load()
    } catch { setError('Mise à jour impossible. Réessayez dans quelques instants.') } finally { setMutating(null) }
  }
  const derived = useMemo(() => ({ active: items.filter((item) => item.automation.enabled).length, paused: systemState.paused ? items.length : 0, errors: items.filter((item) => item.automation.lastErrorMessage).length }), [items, systemState])
  return { items, setItems, systemState, recentRuns, recentRunsState, permissions, loading, mutating, error, load, loadRecentRuns, save, pause, derived }
}

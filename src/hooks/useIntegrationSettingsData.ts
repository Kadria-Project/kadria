'use client'

import { useCallback, useEffect, useState } from 'react'

export type GoogleCalendarStatus = { connected: boolean; email: string | null; connectedAt: string | null; updatedAt: string | null; provider: string | null }
const empty: GoogleCalendarStatus = { connected: false, email: null, connectedAt: null, updatedAt: null, provider: null }
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

export function useIntegrationSettingsData() {
  const [calendar, setCalendar] = useState<GoogleCalendarStatus>(empty)
  const [permissions, setPermissions] = useState({ canRead: false, canManage: false })
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<'idle' | 'disconnecting' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithTimeout('/api/integrations/google-calendar/status', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) throw new Error()
      setCalendar({ connected: Boolean(payload.connected), email: payload.email || null, connectedAt: payload.connectedAt || null, updatedAt: payload.updatedAt || null, provider: payload.provider || null })
      setPermissions({ canRead: Boolean(payload.permissions?.canRead), canManage: Boolean(payload.permissions?.canManage) })
    } catch {
      setError('La connexion Google Calendar est indisponible pour le moment. Réessayez dans quelques instants.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])

  const connect = () => { window.location.assign('/api/integrations/google-calendar/connect') }
  const disconnect = async () => {
    setAction('disconnecting')
    setError(null)
    try {
      const response = await fetchWithTimeout('/api/integrations/google-calendar/disconnect', { method: 'POST' })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) throw new Error()
      setCalendar(empty)
      setAction('idle')
    } catch {
      setAction('error')
      setError('Déconnexion impossible. Réessayez dans quelques instants.')
    }
  }

  return { calendar, permissions, loading, action, error, connect, disconnect, reload: load }
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import TrackingWorkspace from '@/src/components/workspace/tracking/TrackingWorkspace'
import type { TrackingBrief } from '@/src/components/workspace/tracking/tracking-contract'

type Response = { success: boolean; brief?: TrackingBrief; error?: string }

export default function TrackingWorkspaceRoute() {
  const [brief, setBrief] = useState<TrackingBrief | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const load = useCallback(async (signal?: AbortSignal) => { setState('loading'); try { const response = await fetch('/api/tracking-brief', { cache: 'no-store', signal }); const payload = await response.json().catch(() => null) as Response | null; if (!response.ok || !payload?.success || !payload.brief) throw new Error(payload?.error || 'Suivi indisponible'); setBrief(payload.brief); setState('ready') } catch { if (!signal?.aborted) setState('error') } }, [])
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => { void load(controller.signal) }, 0); return () => { window.clearTimeout(timer); controller.abort() } }, [load])
  return <TrackingWorkspace brief={brief} loadState={state} onRefresh={load} />
}

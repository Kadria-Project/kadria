'use client'

import { useCallback, useEffect, useState } from 'react'
import HomeWorkspace from '@/src/components/workspace/home/HomeWorkspace'
import type { HomeBrief } from '@/src/components/workspace/home/home-contract'
import { fetchJsonWithTiming } from '@/src/lib/performance/client-timing'
import type { KPIResult, PerformanceAnalytics } from '@/src/lib/performance/performance-types'

type Props = { firstName: string | null }
type HomeBriefResponse = { success: boolean; brief?: HomeBrief; error?: string }
type PerformanceResponse = { success?: boolean; snapshot?: { kpis?: KPIResult[] }; analytics?: PerformanceAnalytics; error?: string }

export default function HomeWorkspaceRoute({ firstName }: Props) {
  const [brief, setBrief] = useState<HomeBrief | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [performance, setPerformance] = useState<{ kpis: KPIResult[]; analytics: PerformanceAnalytics } | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setState('loading')
    try {
      const { response, payload } = await fetchJsonWithTiming<HomeBriefResponse | null>('dashboard', '/api/home-brief', { cache: 'no-store', signal }).catch(() => ({ response: null, payload: null }))
      if (!response?.ok || !payload?.success || !payload.brief) throw new Error(payload?.error || 'Brief indisponible')
      setBrief(payload.brief)
      setState('ready')
    } catch {
      if (!signal?.aborted) setState('error')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => { void load(controller.signal) }, 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [load])

  useEffect(() => {
    const controller = new AbortController()
    fetchJsonWithTiming<PerformanceResponse>('dashboard', '/api/performance?period=30d', { signal: controller.signal })
      .then(({ response, payload }) => {
        if (!response.ok || !payload?.success || !payload.snapshot?.kpis || !payload.analytics) return
        setPerformance({ kpis: payload.snapshot.kpis, analytics: payload.analytics })
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  return <HomeWorkspace firstName={firstName} brief={brief} loadState={state} onRefresh={load} performance={performance} />
}

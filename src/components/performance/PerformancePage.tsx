'use client'

import { useEffect, useState } from 'react'
import type { KPIResult, PerformancePeriodKey } from '@/src/lib/performance/performance-types'
import PerformanceLayout from './PerformanceLayout'
import PerformanceHeader from './PerformanceHeader'
import PerformanceKPIs from './PerformanceKPIs'
import PerformanceLoading from './PerformanceLoading'
import PerformanceEmptyState from './PerformanceEmptyState'
import PerformanceErrorState from './PerformanceErrorState'

type FetchState = {
  kpis: KPIResult[] | null
  error: string | null
}

export default function PerformancePage() {
  const [period, setPeriod] = useState<PerformancePeriodKey>('30d')
  const [state, setState] = useState<FetchState>({ kpis: null, error: null })
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/performance?period=${period}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible de charger les indicateurs de performance.')
        setState({ kpis: data.snapshot.kpis as KPIResult[], error: null })
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setState({ kpis: null, error: reason instanceof Error ? reason.message : 'Impossible de charger les indicateurs de performance.' })
      })
    return () => controller.abort()
  }, [period, reloadNonce])

  const retry = () => setReloadNonce((n) => n + 1)

  const loading = state.kpis === null && state.error === null
  const isEmpty = !loading && !state.error && state.kpis !== null && state.kpis.every((kpi) => kpi.value === 0)

  if (loading) {
    return (
      <PerformanceLayout>
        <PerformanceHeader period={period} onPeriodChange={setPeriod} />
        <PerformanceLoading />
      </PerformanceLayout>
    )
  }

  if (state.error && !state.kpis) {
    return (
      <PerformanceLayout>
        <PerformanceHeader period={period} onPeriodChange={setPeriod} />
        <PerformanceErrorState message={state.error} onRetry={retry} />
      </PerformanceLayout>
    )
  }

  return (
    <PerformanceLayout>
      <PerformanceHeader period={period} onPeriodChange={setPeriod} />
      {isEmpty ? (
        <PerformanceEmptyState />
      ) : (
        <PerformanceKPIs kpis={state.kpis} loading={loading} error={state.error} onRetry={retry} />
      )}
    </PerformanceLayout>
  )
}

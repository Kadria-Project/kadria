'use client'

import { useEffect, useState } from 'react'
import type { KPIResult, PerformanceAnalytics, PerformancePeriodKey } from '@/src/lib/performance/performance-types'
import { PERFORMANCE_PERIODS } from '@/src/lib/performance/date-range'
import PerformanceLayout from './PerformanceLayout'
import PerformanceHeader from './PerformanceHeader'
import PerformanceKPIs from './PerformanceKPIs'
import PerformanceLoading from './PerformanceLoading'
import PerformanceEmptyState from './PerformanceEmptyState'
import PerformanceErrorState from './PerformanceErrorState'
import RevenueEvolutionChart from './RevenueEvolutionChart'
import LeadSourcesChart from './LeadSourcesChart'
import ConversionFunnel from './ConversionFunnel'
import AtRiskOpportunitiesCard from './AtRiskOpportunitiesCard'
import ConversionRateChart from './ConversionRateChart'
import ConversionDelayChart from './ConversionDelayChart'
import PipelineDistributionChart from './PipelineDistributionChart'

type FetchState = {
  kpis: KPIResult[] | null
  analytics: PerformanceAnalytics | null
  error: string | null
}

export default function PerformancePage() {
  const [period, setPeriod] = useState<PerformancePeriodKey>('30d')
  const [state, setState] = useState<FetchState>({ kpis: null, analytics: null, error: null })
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/performance?period=${period}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible de charger les indicateurs de performance.')
        setState({ kpis: data.snapshot.kpis as KPIResult[], analytics: (data.analytics as PerformanceAnalytics) ?? null, error: null })
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setState({ kpis: null, analytics: null, error: reason instanceof Error ? reason.message : 'Impossible de charger les indicateurs de performance.' })
      })
    return () => controller.abort()
  }, [period, reloadNonce])

  const retry = () => setReloadNonce((n) => n + 1)

  const loading = state.kpis === null && state.error === null
  const isEmpty = !loading && !state.error && state.kpis !== null && state.kpis.every((kpi) => kpi.value === 0)
  const periodLabel = PERFORMANCE_PERIODS.find((item) => item.key === period)?.label ?? ''

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
        <>
          <PerformanceKPIs kpis={state.kpis} loading={loading} error={state.error} onRetry={retry} />

          {/* Ligne principale : CA dominant + sources + tunnel */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr_1fr]">
            <RevenueEvolutionChart
              series={state.analytics?.revenueSeries ?? null}
              periodLabel={periodLabel}
              loading={loading}
              error={state.error}
              onRetry={retry}
            />
            <LeadSourcesChart distribution={state.analytics?.leadSources ?? null} loading={loading} error={state.error} onRetry={retry} />
            <div className="flex flex-col gap-4">
              <ConversionFunnel stages={state.analytics?.funnel ?? null} loading={loading} error={state.error} onRetry={retry} />
              <AtRiskOpportunitiesCard summary={state.analytics?.atRisk ?? null} loading={loading} error={state.error} />
            </div>
          </div>

          {/* Ligne secondaire : taux de transformation + délais + pipeline */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ConversionRateChart series={state.analytics?.conversionRateSeries ?? null} loading={loading} error={state.error} onRetry={retry} />
            <ConversionDelayChart metrics={state.analytics?.stageDurations ?? null} loading={loading} error={state.error} onRetry={retry} />
            <PipelineDistributionChart distribution={state.analytics?.pipeline ?? null} loading={loading} error={state.error} onRetry={retry} />
          </div>
        </>
      )}
    </PerformanceLayout>
  )
}

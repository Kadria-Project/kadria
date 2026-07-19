'use client'

import { useEffect, useState } from 'react'
import type { KPIResult, MonthlyGoalsSummary, PerformanceAnalytics, PerformanceInsight, PerformanceOpportunity, PerformancePeriodKey, PriorityAction } from '@/src/lib/performance/performance-types'
import { PERFORMANCE_PERIODS } from '@/src/lib/performance/date-range'
import PerformanceLayout from './PerformanceLayout'
import PerformanceHeader from './PerformanceHeader'
import PerformanceLoading from './PerformanceLoading'
import PerformanceEmptyState from './PerformanceEmptyState'
import PerformanceErrorState from './PerformanceErrorState'
import RevenueEvolutionChart from './RevenueEvolutionChart'
import LeadSourcesChart from './LeadSourcesChart'
import ConversionFunnel from './ConversionFunnel'
import AtRiskOpportunitiesCard from './AtRiskOpportunitiesCard'
import ConversionDelayChart from './ConversionDelayChart'
import PerformanceEvidence from './PerformanceEvidence'
import { derivePerformanceConclusion } from '@/src/lib/performance/performance-insights'

type FetchState = {
  kpis: KPIResult[] | null
  analytics: PerformanceAnalytics | null
  opportunities: PerformanceOpportunity[] | null
  insights: PerformanceInsight[] | null
  priorityActions: PriorityAction[] | null
  monthlyGoals: MonthlyGoalsSummary | null
  plan: string | null
  error: string | null
}

export default function PerformancePage() {
  const [period, setPeriod] = useState<PerformancePeriodKey>('30d')
  const [state, setState] = useState<FetchState>({ kpis: null, analytics: null, opportunities: null, insights: null, priorityActions: null, monthlyGoals: null, plan: null, error: null })
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/performance?period=${period}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible de charger les indicateurs de performance.')
        setState({
          kpis: data.snapshot.kpis as KPIResult[],
          analytics: (data.analytics as PerformanceAnalytics) ?? null,
          opportunities: (data.opportunities as PerformanceOpportunity[]) ?? [],
          insights: (data.insights as PerformanceInsight[]) ?? [],
          priorityActions: (data.priorityActions as PriorityAction[]) ?? [],
          monthlyGoals: (data.monthlyGoals as MonthlyGoalsSummary) ?? null,
          plan: (data.plan as string | null) ?? null,
          error: null,
        })
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setState({ kpis: null, analytics: null, opportunities: null, insights: null, priorityActions: null, monthlyGoals: null, plan: null, error: reason instanceof Error ? reason.message : 'Impossible de charger les indicateurs de performance.' })
      })
    return () => controller.abort()
  }, [period, reloadNonce])

  const retry = () => setReloadNonce((n) => n + 1)
  const handlePeriodChange = (nextPeriod: PerformancePeriodKey) => {
    if (nextPeriod === period) return
    setState({ kpis: null, analytics: null, opportunities: null, insights: null, priorityActions: null, monthlyGoals: null, plan: null, error: null })
    setPeriod(nextPeriod)
  }
  const loading = state.kpis === null && state.error === null
  const isEmpty = !loading && !state.error && state.kpis !== null && state.kpis.every((kpi) => kpi.value === 0)
  const periodLabel = PERFORMANCE_PERIODS.find((item) => item.key === period)?.label ?? ''
  const conclusion = derivePerformanceConclusion(state.kpis ?? [], state.analytics, periodLabel)

  if (loading) return <PerformanceLayout><PerformanceHeader period={period} onPeriodChange={handlePeriodChange} /><PerformanceLoading /></PerformanceLayout>
  if (state.error && !state.kpis) return <PerformanceLayout><PerformanceHeader period={period} onPeriodChange={handlePeriodChange} /><PerformanceErrorState message={state.error} onRetry={retry} /></PerformanceLayout>

  return (
    <PerformanceLayout>
      <PerformanceHeader period={period} onPeriodChange={handlePeriodChange} />
      {isEmpty ? <PerformanceEmptyState /> : (
        <>
          <PerformanceEvidence situation={conclusion} kpis={state.kpis ?? []} />

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,13fr)_minmax(320px,7fr)]">
            <RevenueEvolutionChart series={state.analytics?.revenueSeries ?? null} periodLabel={periodLabel} loading={loading} error={state.error} onRetry={retry} />
            <div className="flex flex-col gap-4">
              <ConversionFunnel stages={state.analytics?.funnel ?? null} loading={loading} error={state.error} onRetry={retry} />
              <AtRiskOpportunitiesCard summary={state.analytics?.atRisk ?? null} loading={loading} error={state.error} />
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ConversionDelayChart metrics={state.analytics?.stageDurations ?? null} loading={loading} error={state.error} onRetry={retry} />
            <LeadSourcesChart distribution={state.analytics?.leadSources ?? null} loading={loading} error={state.error} onRetry={retry} />
          </div>
        </>
      )}
    </PerformanceLayout>
  )
}

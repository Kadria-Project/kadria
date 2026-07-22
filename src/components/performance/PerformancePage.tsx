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
import ConversionFunnel from './ConversionFunnel'
import CommercialExposureCard from './CommercialExposureCard'
import PerformanceEvidence from './PerformanceEvidence'
import ExecutiveSummary from './ExecutiveSummary'
import PerformanceKPIs from './PerformanceKPIs'
import InsightsPanel from './InsightsPanel'
import PriorityActions from './PriorityActions'
import TopOpportunitiesTable from './TopOpportunitiesTable'
import { derivePerformanceConclusion } from '@/src/lib/performance/performance-insights'
import { fetchJsonWithTiming } from '@/src/lib/performance/client-timing'

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

export default function PerformancePage({ firstName }: { firstName: string | null }) {
  const [period, setPeriod] = useState<PerformancePeriodKey>('30d')
  const [state, setState] = useState<FetchState>({ kpis: null, analytics: null, opportunities: null, insights: null, priorityActions: null, monthlyGoals: null, plan: null, error: null })
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchJsonWithTiming<{ success?: boolean; error?: string; snapshot: { kpis: KPIResult[] }; analytics?: PerformanceAnalytics; opportunities?: PerformanceOpportunity[]; insights?: PerformanceInsight[]; priorityActions?: PriorityAction[]; monthlyGoals?: MonthlyGoalsSummary; plan?: string | null }>('performance', `/api/performance?period=${period}`, { signal: controller.signal })
      .then(({ response: res, payload: data }) => {
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
          <section aria-labelledby="performance-executive-title">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 id="performance-executive-title" className="text-lg font-bold tracking-tight text-slate-950">La lecture dirigeant</h2>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Vue synthèse</span>
            </div>
            <ExecutiveSummary firstName={firstName} kpis={state.kpis ?? []} analytics={state.analytics} />
          </section>

          <section aria-labelledby="performance-today-title">
            <div className="mb-3"><p className="text-[11px] font-bold uppercase tracking-[.13em] text-slate-500">Ce qui compte aujourd&apos;hui</p><h2 id="performance-today-title" className="mt-1 text-base font-bold text-slate-950">Le contexte utile à la décision</h2></div>
            <PerformanceKPIs kpis={state.kpis} loading={loading} error={state.error} onRetry={retry} />
            <div className="mt-3"><CommercialExposureCard summary={state.analytics?.atRisk ?? null} loading={loading} /></div>
          </section>

          <section aria-labelledby="performance-why-title">
            <div className="mb-3"><p className="text-[11px] font-bold uppercase tracking-[.13em] text-slate-500">Pourquoi ces résultats ?</p><h2 id="performance-why-title" className="mt-1 text-base font-bold text-slate-950">Les signaux qui expliquent la situation</h2></div>
            <InsightsPanel insights={state.insights} loading={loading} error={state.error} onRetry={retry} />
          </section>

          <section aria-labelledby="performance-proof-title">
            <div className="mb-3"><p className="text-[11px] font-bold uppercase tracking-[.13em] text-slate-500">Ce qui explique cette situation</p><h2 id="performance-proof-title" className="mt-1 text-base font-bold text-slate-950">Pourquoi Kadria vous dit cela</h2></div>
            <PerformanceEvidence situation={conclusion} kpis={state.kpis ?? []} />
          </section>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,13fr)_minmax(320px,7fr)]">
            <RevenueEvolutionChart series={state.analytics?.revenueSeries ?? null} periodLabel={periodLabel} loading={loading} error={state.error} onRetry={retry} />
            <ConversionFunnel stages={state.analytics?.funnel ?? null} loading={loading} error={state.error} onRetry={retry} />
          </div>

          <section aria-labelledby="performance-levers-title">
            <div className="mb-3"><p className="text-[11px] font-bold uppercase tracking-[.13em] text-slate-500">Les leviers d&apos;amélioration</p><h2 id="performance-levers-title" className="mt-1 text-base font-bold text-slate-950">Ce que vous pouvez décider aujourd&apos;hui</h2></div>
            <PriorityActions actions={state.priorityActions?.slice(0, 3) ?? null} impactAmount={state.analytics?.atRisk.amount ?? null} loading={loading} error={state.error} onRetry={retry} />
          </section>

          <section aria-labelledby="performance-opportunities-title">
            <div className="mb-3"><p className="text-[11px] font-bold uppercase tracking-[.13em] text-slate-500">Les dossiers à fort potentiel</p><h2 id="performance-opportunities-title" className="mt-1 text-base font-bold text-slate-950">Les prochaines actions commerciales à ne pas laisser passer</h2></div>
            <TopOpportunitiesTable opportunities={state.opportunities} loading={loading} error={state.error} onRetry={retry} />
          </section>

        </>
      )}
    </PerformanceLayout>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { buildPerformanceSnapshot } from '@/src/lib/performance/performanceService'
import { PERFORMANCE_PERIODS } from '@/src/lib/performance/date-range'
import {
  getAtRiskOpportunityValue,
  getAverageStageDurations,
  getConversionFunnel,
  getConversionRateSeries,
  getLeadSourceDistribution,
  getPipelineDistribution,
  getRevenueSeries,
} from '@/src/lib/performance/performance-analytics'
import {
  getMonthlyGoalsSummary,
  getPerformanceInsights,
  getPriorityActions,
  getTopOpportunities,
} from '@/src/lib/performance/performance-actions'
import { tableHasColumn } from '@/src/lib/tenant-context'
import { listProjectResponsiblesByTenant } from '@/src/lib/project-responsibility'
import type { PerformanceAnalytics, PerformancePeriodKey } from '@/src/lib/performance/performance-types'

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function isPeriodKey(value: string | null): value is PerformancePeriodKey {
  return PERFORMANCE_PERIODS.some((period) => period.key === value)
}

export async function GET(request: NextRequest) {
  try {
    const context = await getCurrentTenantContext()
    if (!context) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const params = request.nextUrl.searchParams
    const periodParam = params.get('period')
    const period: PerformancePeriodKey = isPeriodKey(periodParam) ? periodParam : '30d'
    const customStart = params.get('start')
    const customEnd = params.get('end')
    const custom = customStart && customEnd
      ? { start: new Date(customStart), end: new Date(customEnd) }
      : undefined

    const supabase = getSupabaseAdmin()
    const hasResponsibleColumn = await tableHasColumn('Projects', 'responsible_user_id')
    const projectColumns = [
      'id', 'status', 'created_at', 'updated_at', 'source', 'project_source',
      'client_name', 'client_first_name', 'client_phone', 'client_email',
      'project_title', 'project_type', 'budget', 'desired_timeline', 'maturity',
      'city', 'completeness_score',
    ]
    if (hasResponsibleColumn) projectColumns.push('responsible_user_id')

    const projectsResult = await supabase
      .from('Projects')
      .select(projectColumns.join(', '))
      .eq('tenant_id', context.tenantId)

    if (projectsResult.error) {
      console.error('[PERFORMANCE][PROJECTS_READ_FAILED]', projectsResult.error)
      return NextResponse.json({ success: false, error: 'Impossible de charger les indicateurs' }, { status: 500 })
    }

    const projects = asRows(projectsResult.data)
    const projectIds = projects.map((project) => String(project.id)).filter(Boolean)

    const quotesResult = projectIds.length
      ? await supabase
        .from('Devis')
        .select('project_id, total_ttc, total_ht, statut, accepted, accepted_at, declined, declined_at, decline_reason, quote_sent_at, created_at, updated_at')
        .in('project_id', projectIds)
      : { data: [], error: null }

    if (quotesResult.error) {
      console.error('[PERFORMANCE][QUOTES_READ_FAILED]', quotesResult.error)
      return NextResponse.json({ success: false, error: 'Impossible de charger les indicateurs' }, { status: 500 })
    }

    const quotes = asRows(quotesResult.data)
    const now = new Date()
    const snapshot = buildPerformanceSnapshot({ projects, quotes }, period, now, custom)
    const { current, previous } = snapshot.period

    const analytics: PerformanceAnalytics = {
      revenueSeries: getRevenueSeries(quotes, current, previous),
      leadSources: getLeadSourceDistribution(projects, current),
      funnel: getConversionFunnel(projects, quotes, current),
      atRisk: getAtRiskOpportunityValue(projects, quotes, now),
      conversionRateSeries: getConversionRateSeries(projects, current, previous),
      stageDurations: getAverageStageDurations(projects, quotes, current),
      pipeline: getPipelineDistribution(projects, current),
    }

    // Responsable affecté au dossier (Lot 3) : uniquement si la colonne
    // existe réellement et le tenant a des collaborateurs actifs. Jamais de
    // nom inventé — le composant masque simplement le champ si absent.
    let responsibleNames: Map<string, string> | undefined
    if (hasResponsibleColumn) {
      try {
        const responsibles = await listProjectResponsiblesByTenant(context.tenantId)
        responsibleNames = new Map(Array.from(responsibles.entries()).map(([id, member]) => [id, member.displayName]))
      } catch (responsibleError) {
        console.error('[PERFORMANCE][RESPONSIBLES_READ_FAILED]', responsibleError)
      }
    }

    const opportunities = getTopOpportunities(projects, quotes, now, responsibleNames)
    const insights = getPerformanceInsights({
      kpis: snapshot.kpis,
      atRisk: analytics.atRisk,
      quotes,
      projects,
      current,
      previous,
      leadSources: analytics.leadSources.sources,
      leadSourcesTotal: analytics.leadSources.total,
      now,
    })
    const priorityActions = getPriorityActions({ projects, quotes, now })
    const monthlyGoals = getMonthlyGoalsSummary()

    return NextResponse.json({
      success: true,
      snapshot,
      analytics,
      opportunities,
      insights,
      priorityActions,
      monthlyGoals,
      plan: context.tenant?.plan ?? null,
    })
  } catch (error) {
    console.error('[PERFORMANCE][LOAD_FAILED]', error)
    return NextResponse.json({ success: false, error: 'Impossible de charger les indicateurs' }, { status: 500 })
  }
}

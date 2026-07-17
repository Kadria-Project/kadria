import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { buildPerformanceSnapshot } from '@/src/lib/performance/performanceService'
import { PERFORMANCE_PERIODS } from '@/src/lib/performance/date-range'
import type { PerformancePeriodKey } from '@/src/lib/performance/performance-types'

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
    const projectsResult = await supabase
      .from('Projects')
      .select('id, status, created_at, updated_at')
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
        .select('project_id, total_ttc, total_ht, statut, accepted, accepted_at, created_at, updated_at')
        .in('project_id', projectIds)
      : { data: [], error: null }

    if (quotesResult.error) {
      console.error('[PERFORMANCE][QUOTES_READ_FAILED]', quotesResult.error)
      return NextResponse.json({ success: false, error: 'Impossible de charger les indicateurs' }, { status: 500 })
    }

    const quotes = asRows(quotesResult.data)
    const snapshot = buildPerformanceSnapshot({ projects, quotes }, period, new Date(), custom)

    return NextResponse.json({ success: true, snapshot })
  } catch (error) {
    console.error('[PERFORMANCE][LOAD_FAILED]', error)
    return NextResponse.json({ success: false, error: 'Impossible de charger les indicateurs' }, { status: 500 })
  }
}

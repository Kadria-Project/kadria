import 'server-only'
import { normalizePlan } from '@/src/lib/plans'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'

const TABLE_CANDIDATES = {
  users: ['Users'],
  projects: ['Projects'],
  planLimits: ['PlanLimits', 'plan_limits'],
  usageMonthly: ['UsageMonthly', 'usage_monthly'],
  usageEvents: ['UsageEvents', 'usage_events'],
  vapiCalls: ['VapiCalls', 'vapi_calls'],
} as const

const tableResolutionCache = new Map<string, string | null>()

type JsonObject = Record<string, unknown>
type PlanKey = 'essentiel' | 'performance' | 'entreprise'

export interface QuotaResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ProjectQuotaConfig {
  artisanId: string
  plan: PlanKey
  periodMonth: string
  limit: number | null
  unlimited: boolean
  source: 'plan_limits' | 'fallback'
  tableName?: string | null
}

export interface ProjectUsageSnapshot {
  artisanId: string
  plan: PlanKey
  periodMonth: string
  used: number
  source: 'usage_monthly' | 'projects_count'
  usageMonthlyTable?: string | null
  projectTable?: string | null
}

export interface ProjectQuotaCheck {
  success: boolean
  allowed: boolean
  artisanId: string
  plan: PlanKey
  periodMonth: string
  limit: number | null
  used: number
  remaining: number | null
  source: 'plan_limits' | 'fallback'
  usageSource: 'usage_monthly' | 'projects_count'
  error?: string
}

export interface ProjectCreatedUsageParams {
  artisanId: string
  projectId: string
  source?: string
}

export interface UsageEventRow {
  artisan_id: string
  plan: string
  period_month: string
  event_type: string
  quantity: number
  dedup_key: string
  metadata?: JsonObject
}

function getDefaultProjectLimit(plan: PlanKey) {
  if (plan === 'entreprise') {
    return null
  }

  return 50
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function getCurrentMonthBounds(date = new Date()) {
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const nextMonthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))

  return {
    monthStartIso: monthStart.toISOString(),
    nextMonthStartIso: nextMonthStart.toISOString(),
  }
}

export function getCurrentPeriodMonth(date = new Date()): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

async function resolveAccessibleTable(key: keyof typeof TABLE_CANDIDATES) {
  if (tableResolutionCache.has(key)) {
    return tableResolutionCache.get(key) || null
  }

  const supabase = getSupabaseAdmin()

  for (const tableName of TABLE_CANDIDATES[key]) {
    const { error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (!error) {
      tableResolutionCache.set(key, tableName)
      return tableName
    }
  }

  tableResolutionCache.set(key, null)
  return null
}

async function getPlanForArtisan(artisanId: string): Promise<QuotaResult<PlanKey>> {
  try {
    const supabase = getSupabaseAdmin()
    const usersTable = await resolveAccessibleTable('users')

    if (!usersTable) {
      return { success: false, error: 'Table Users introuvable' }
    }

    const { data, error } = await supabase
      .from(usersTable)
      .select('plan')
      .eq('artisan_id', artisanId)
      .limit(1)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: normalizePlan(String(data?.plan || 'performance')),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible de charger le plan artisan',
    }
  }
}

async function upsertMonthlyUsageRow(
  artisanId: string,
  plan: PlanKey,
  periodMonth: string,
  projectsCount: number,
) {
  const supabase = getSupabaseAdmin()
  const usageMonthlyTable = await resolveAccessibleTable('usageMonthly')

  if (!usageMonthlyTable) {
    return { success: false as const, error: 'Table UsageMonthly introuvable' }
  }

  const { data: existing, error: existingError } = await supabase
    .from(usageMonthlyTable)
    .select('id, projects_count')
    .eq('artisan_id', artisanId)
    .eq('period_month', periodMonth)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    return { success: false as const, error: existingError.message }
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from(usageMonthlyTable)
      .update({
        plan,
        projects_count: projectsCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateError) {
      return { success: false as const, error: updateError.message }
    }

    return { success: true as const, tableName: usageMonthlyTable }
  }

  const { error: insertError } = await supabase
    .from(usageMonthlyTable)
    .insert({
      artisan_id: artisanId,
      plan,
      period_month: periodMonth,
      projects_count: projectsCount,
      vapi_calls_count: 0,
    })

  if (insertError) {
    return { success: false as const, error: insertError.message }
  }

  return { success: true as const, tableName: usageMonthlyTable }
}

async function countProjectsForPeriod(artisanId: string, periodMonth: string) {
  const supabase = getSupabaseAdmin()
  const projectsTable = await resolveAccessibleTable('projects')

  if (!projectsTable) {
    return {
      success: false as const,
      error: 'Table Projects introuvable',
      count: 0,
      tableName: null,
    }
  }

  const { monthStartIso, nextMonthStartIso } = getCurrentMonthBounds(
    new Date(`${periodMonth}-01T00:00:00.000Z`),
  )

  const { count, error } = await supabase
    .from(projectsTable)
    .select('id', { count: 'exact', head: true })
    .eq('artisan_id', artisanId)
    .gte('created_at', monthStartIso)
    .lt('created_at', nextMonthStartIso)

  if (error) {
    return {
      success: false as const,
      error: error.message,
      count: 0,
      tableName: projectsTable,
    }
  }

  return {
    success: true as const,
    count: count || 0,
    tableName: projectsTable,
  }
}

export async function getProjectQuotaForArtisan(artisanId: string): Promise<QuotaResult<ProjectQuotaConfig>> {
  const planResult = await getPlanForArtisan(artisanId)
  const plan = planResult.success && planResult.data ? planResult.data : 'performance'
  const periodMonth = getCurrentPeriodMonth()

  try {
    const supabase = getSupabaseAdmin()
    const planLimitsTable = await resolveAccessibleTable('planLimits')

    if (planLimitsTable) {
      const { data, error } = await supabase
        .from(planLimitsTable)
        .select('*')
        .eq('plan', plan)
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        const unlimited = data.projects_unlimited === true
        const limit = unlimited
          ? null
          : isFiniteNumber(data.max_projects_per_month)
            ? Number(data.max_projects_per_month)
            : getDefaultProjectLimit(plan)

        return {
          success: true,
          data: {
            artisanId,
            plan,
            periodMonth,
            limit,
            unlimited,
            source: 'plan_limits',
            tableName: planLimitsTable,
          },
        }
      }
    }

    return {
      success: true,
      data: {
        artisanId,
        plan,
        periodMonth,
        limit: getDefaultProjectLimit(plan),
        unlimited: plan === 'entreprise',
        source: 'fallback',
        tableName: planLimitsTable,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible de charger le quota projet',
    }
  }
}

export async function getCurrentProjectUsage(artisanId: string): Promise<QuotaResult<ProjectUsageSnapshot>> {
  const quotaResult = await getProjectQuotaForArtisan(artisanId)
  if (!quotaResult.success || !quotaResult.data) {
    return {
      success: false,
      error: quotaResult.error || 'Impossible de charger le quota artisan',
    }
  }

  const { plan, periodMonth } = quotaResult.data

  try {
    const supabase = getSupabaseAdmin()
    const usageMonthlyTable = await resolveAccessibleTable('usageMonthly')

    if (usageMonthlyTable) {
      const { data, error } = await supabase
        .from(usageMonthlyTable)
        .select('projects_count')
        .eq('artisan_id', artisanId)
        .eq('period_month', periodMonth)
        .limit(1)
        .maybeSingle()

      if (!error && data && isFiniteNumber(data.projects_count)) {
        return {
          success: true,
          data: {
            artisanId,
            plan,
            periodMonth,
            used: Number(data.projects_count),
            source: 'usage_monthly',
            usageMonthlyTable,
          },
        }
      }
    }

    const projectCountResult = await countProjectsForPeriod(artisanId, periodMonth)
    if (!projectCountResult.success) {
      return {
        success: false,
        error: projectCountResult.error,
      }
    }

    const syncResult = await upsertMonthlyUsageRow(
      artisanId,
      plan,
      periodMonth,
      projectCountResult.count,
    )

    if (!syncResult.success) {
      console.error('[QUOTAS] Failed to sync UsageMonthly from Projects count:', syncResult.error)
    }

    return {
      success: true,
      data: {
        artisanId,
        plan,
        periodMonth,
        used: projectCountResult.count,
        source: 'projects_count',
        usageMonthlyTable: syncResult.success ? syncResult.tableName : usageMonthlyTable,
        projectTable: projectCountResult.tableName,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible de charger l’usage projets',
    }
  }
}

export async function canCreateProject(artisanId: string): Promise<ProjectQuotaCheck> {
  const quotaResult = await getProjectQuotaForArtisan(artisanId)
  if (!quotaResult.success || !quotaResult.data) {
    return {
      success: false,
      allowed: false,
      artisanId,
      plan: 'performance',
      periodMonth: getCurrentPeriodMonth(),
      limit: 50,
      used: 0,
      remaining: null,
      source: 'fallback',
      usageSource: 'projects_count',
      error: quotaResult.error || 'Impossible de charger le quota projet',
    }
  }

  const usageResult = await getCurrentProjectUsage(artisanId)
  if (!usageResult.success || !usageResult.data) {
    return {
      success: false,
      allowed: false,
      artisanId,
      plan: quotaResult.data.plan,
      periodMonth: quotaResult.data.periodMonth,
      limit: quotaResult.data.limit,
      used: 0,
      remaining: null,
      source: quotaResult.data.source,
      usageSource: 'projects_count',
      error: usageResult.error || 'Impossible de charger l’usage projet',
    }
  }

  const limit = quotaResult.data.unlimited ? null : quotaResult.data.limit
  const used = usageResult.data.used

  return {
    success: true,
    allowed: limit === null ? true : used < limit,
    artisanId,
    plan: quotaResult.data.plan,
    periodMonth: quotaResult.data.periodMonth,
    limit,
    used,
    remaining: limit === null ? null : Math.max(limit - used, 0),
    source: quotaResult.data.source,
    usageSource: usageResult.data.source,
  }
}

export async function recordUsageEvent(params: UsageEventRow): Promise<QuotaResult<UsageEventRow>> {
  try {
    const supabase = getSupabaseAdmin()
    const usageEventsTable = await resolveAccessibleTable('usageEvents')

    if (!usageEventsTable) {
      return { success: false, error: 'Table UsageEvents introuvable' }
    }

    const { data: existing, error: existingError } = await supabase
      .from(usageEventsTable)
      .select('*')
      .eq('dedup_key', params.dedup_key)
      .limit(1)
      .maybeSingle()

    if (existingError) {
      return { success: false, error: existingError.message }
    }

    if (existing) {
      return {
        success: true,
        data: params,
      }
    }

    const { error } = await supabase
      .from(usageEventsTable)
      .insert(params)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: params }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible d’enregistrer l’événement d’usage',
    }
  }
}

export async function incrementMonthlyUsage(params: {
  artisanId: string
  plan: PlanKey
  periodMonth?: string
  projectsCount: number
}): Promise<QuotaResult<{ periodMonth: string; projectsCount: number }>> {
  const periodMonth = params.periodMonth || getCurrentPeriodMonth()
  const syncResult = await upsertMonthlyUsageRow(
    params.artisanId,
    params.plan,
    periodMonth,
    params.projectsCount,
  )

  if (!syncResult.success) {
    return {
      success: false,
      error: syncResult.error,
    }
  }

  return {
    success: true,
    data: {
      periodMonth,
      projectsCount: params.projectsCount,
    },
  }
}

export async function recordProjectCreatedUsage(
  params: ProjectCreatedUsageParams,
): Promise<QuotaResult<{ periodMonth: string; projectsCount: number }>> {
  const quotaResult = await getProjectQuotaForArtisan(params.artisanId)
  if (!quotaResult.success || !quotaResult.data) {
    return {
      success: false,
      error: quotaResult.error || 'Impossible de résoudre le plan artisan',
    }
  }

  const countResult = await countProjectsForPeriod(params.artisanId, quotaResult.data.periodMonth)
  if (!countResult.success) {
    return {
      success: false,
      error: countResult.error,
    }
  }

  const eventResult = await recordUsageEvent({
    artisan_id: params.artisanId,
    plan: quotaResult.data.plan,
    period_month: quotaResult.data.periodMonth,
    event_type: 'project_created',
    quantity: 1,
    dedup_key: `project_created:${params.projectId}`,
    metadata: {
      project_id: params.projectId,
      source: params.source || 'web',
    },
  })

  if (!eventResult.success) {
    return {
      success: false,
      error: eventResult.error,
    }
  }

  return incrementMonthlyUsage({
    artisanId: params.artisanId,
    plan: quotaResult.data.plan,
    periodMonth: quotaResult.data.periodMonth,
    projectsCount: countResult.count,
  })
}

export { TABLE_CANDIDATES as QUOTA_TABLES }

import 'server-only'
import { normalizePlan } from '@/src/lib/plans'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'

const QUOTA_TABLES = {
  planLimits: 'plan_limits',
  usageMonthly: 'usage_monthly',
  usageEvents: 'usage_events',
  vapiCalls: 'vapi_calls',
} as const

type JsonObject = Record<string, unknown>

export interface QuotaResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PlanLimitsRow {
  id?: string
  plan: string
  max_projects_per_month: number | null
  max_vapi_calls_per_month: number | null
}

export interface UsageMonthlyRow {
  id?: string
  artisan_id: string
  plan: string
  period_month: string
  projects_count: number
  vapi_calls_count: number
  created_at?: string
  updated_at?: string
}

export interface UsageEventRow {
  id?: string
  artisan_id: string
  plan: string
  period_month: string
  event_type: string
  quantity: number
  dedup_key: string
  metadata?: JsonObject
  created_at?: string
}

export interface UsageEventParams {
  artisanId: string
  plan: string
  eventType: string
  dedupKey: string
  quantity?: number
  periodMonth?: string
  metadata?: JsonObject
}

export interface IncrementMonthlyUsageParams {
  artisanId: string
  plan: string
  metric: 'projects_count' | 'vapi_calls_count'
  amount?: number
  periodMonth?: string
}

export interface QuotaCheckResult {
  success: boolean
  allowed: boolean
  artisanId: string
  plan: string
  periodMonth: string
  limit: number | null
  used: number
  remaining: number | null
  error?: string
}

function getPeriodMonthFromDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function getCurrentPeriodMonth(date = new Date()): string {
  return getPeriodMonthFromDate(date)
}

function buildUsageMonthlySeed(artisanId: string, plan: string, periodMonth: string): UsageMonthlyRow {
  return {
    artisan_id: artisanId,
    plan: normalizePlan(plan),
    period_month: periodMonth,
    projects_count: 0,
    vapi_calls_count: 0,
  }
}

export async function getPlanLimits(plan: string): Promise<QuotaResult<PlanLimitsRow>> {
  try {
    const supabase = getSupabaseAdmin()
    const normalizedPlan = normalizePlan(plan)

    const { data, error } = await supabase
      .from(QUOTA_TABLES.planLimits)
      .select('*')
      .eq('plan', normalizedPlan)
      .limit(1)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data) {
      return {
        success: false,
        error: `Aucune limite trouvée pour le plan ${normalizedPlan}`,
      }
    }

    return {
      success: true,
      data: {
        id: typeof data.id === 'string' ? data.id : undefined,
        plan: String(data.plan || normalizedPlan),
        max_projects_per_month:
          data.max_projects_per_month === null || data.max_projects_per_month === undefined
            ? null
            : Number(data.max_projects_per_month),
        max_vapi_calls_per_month:
          data.max_vapi_calls_per_month === null || data.max_vapi_calls_per_month === undefined
            ? null
            : Number(data.max_vapi_calls_per_month),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue getPlanLimits',
    }
  }
}

export async function getOrCreateMonthlyUsage(artisanId: string, plan: string): Promise<QuotaResult<UsageMonthlyRow>> {
  try {
    const supabase = getSupabaseAdmin()
    const normalizedPlan = normalizePlan(plan)
    const periodMonth = getCurrentPeriodMonth()

    const { data: existing, error: existingError } = await supabase
      .from(QUOTA_TABLES.usageMonthly)
      .select('*')
      .eq('artisan_id', artisanId)
      .eq('period_month', periodMonth)
      .limit(1)
      .maybeSingle()

    if (existingError) {
      return { success: false, error: existingError.message }
    }

    if (existing) {
      return {
        success: true,
        data: {
          id: typeof existing.id === 'string' ? existing.id : undefined,
          artisan_id: String(existing.artisan_id || artisanId),
          plan: String(existing.plan || normalizedPlan),
          period_month: String(existing.period_month || periodMonth),
          projects_count: Number(existing.projects_count || 0),
          vapi_calls_count: Number(existing.vapi_calls_count || 0),
          created_at: typeof existing.created_at === 'string' ? existing.created_at : undefined,
          updated_at: typeof existing.updated_at === 'string' ? existing.updated_at : undefined,
        },
      }
    }

    const seed = buildUsageMonthlySeed(artisanId, normalizedPlan, periodMonth)
    const { data: created, error: createError } = await supabase
      .from(QUOTA_TABLES.usageMonthly)
      .insert(seed)
      .select('*')
      .single()

    if (createError) {
      return { success: false, error: createError.message }
    }

    return {
      success: true,
      data: {
        id: typeof created.id === 'string' ? created.id : undefined,
        artisan_id: String(created.artisan_id || artisanId),
        plan: String(created.plan || normalizedPlan),
        period_month: String(created.period_month || periodMonth),
        projects_count: Number(created.projects_count || 0),
        vapi_calls_count: Number(created.vapi_calls_count || 0),
        created_at: typeof created.created_at === 'string' ? created.created_at : undefined,
        updated_at: typeof created.updated_at === 'string' ? created.updated_at : undefined,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue getOrCreateMonthlyUsage',
    }
  }
}

export async function checkProjectQuota(artisanId: string, plan: string): Promise<QuotaCheckResult> {
  const periodMonth = getCurrentPeriodMonth()
  const limitsResult = await getPlanLimits(plan)
  const usageResult = await getOrCreateMonthlyUsage(artisanId, plan)

  if (!limitsResult.success || !limitsResult.data) {
    return {
      success: false,
      allowed: false,
      artisanId,
      plan: normalizePlan(plan),
      periodMonth,
      limit: null,
      used: 0,
      remaining: null,
      error: limitsResult.error || 'Impossible de charger les limites projets',
    }
  }

  if (!usageResult.success || !usageResult.data) {
    return {
      success: false,
      allowed: false,
      artisanId,
      plan: normalizePlan(plan),
      periodMonth,
      limit: limitsResult.data.max_projects_per_month,
      used: 0,
      remaining: null,
      error: usageResult.error || 'Impossible de charger l’usage mensuel projets',
    }
  }

  const limit = limitsResult.data.max_projects_per_month
  const used = usageResult.data.projects_count

  return {
    success: true,
    allowed: limit === null ? true : used < limit,
    artisanId,
    plan: normalizePlan(plan),
    periodMonth,
    limit,
    used,
    remaining: limit === null ? null : Math.max(limit - used, 0),
  }
}

export async function checkVapiQuota(artisanId: string, plan: string): Promise<QuotaCheckResult> {
  const periodMonth = getCurrentPeriodMonth()
  const limitsResult = await getPlanLimits(plan)
  const usageResult = await getOrCreateMonthlyUsage(artisanId, plan)

  if (!limitsResult.success || !limitsResult.data) {
    return {
      success: false,
      allowed: false,
      artisanId,
      plan: normalizePlan(plan),
      periodMonth,
      limit: null,
      used: 0,
      remaining: null,
      error: limitsResult.error || 'Impossible de charger les limites VAPI',
    }
  }

  if (!usageResult.success || !usageResult.data) {
    return {
      success: false,
      allowed: false,
      artisanId,
      plan: normalizePlan(plan),
      periodMonth,
      limit: limitsResult.data.max_vapi_calls_per_month,
      used: 0,
      remaining: null,
      error: usageResult.error || 'Impossible de charger l’usage mensuel VAPI',
    }
  }

  const limit = limitsResult.data.max_vapi_calls_per_month
  const used = usageResult.data.vapi_calls_count

  return {
    success: true,
    allowed: limit === null ? true : used < limit,
    artisanId,
    plan: normalizePlan(plan),
    periodMonth,
    limit,
    used,
    remaining: limit === null ? null : Math.max(limit - used, 0),
  }
}

export async function recordUsageEvent(params: UsageEventParams): Promise<QuotaResult<UsageEventRow>> {
  try {
    const supabase = getSupabaseAdmin()
    const periodMonth = params.periodMonth || getCurrentPeriodMonth()

    const { data: existing, error: existingError } = await supabase
      .from(QUOTA_TABLES.usageEvents)
      .select('*')
      .eq('dedup_key', params.dedupKey)
      .limit(1)
      .maybeSingle()

    if (existingError) {
      return { success: false, error: existingError.message }
    }

    if (existing) {
      return {
        success: true,
        data: {
          id: typeof existing.id === 'string' ? existing.id : undefined,
          artisan_id: String(existing.artisan_id || params.artisanId),
          plan: String(existing.plan || normalizePlan(params.plan)),
          period_month: String(existing.period_month || periodMonth),
          event_type: String(existing.event_type || params.eventType),
          quantity: Number(existing.quantity || params.quantity || 1),
          dedup_key: String(existing.dedup_key || params.dedupKey),
          metadata:
            existing.metadata && typeof existing.metadata === 'object'
              ? existing.metadata as JsonObject
              : params.metadata,
          created_at: typeof existing.created_at === 'string' ? existing.created_at : undefined,
        },
      }
    }

    const payload: UsageEventRow = {
      artisan_id: params.artisanId,
      plan: normalizePlan(params.plan),
      period_month: periodMonth,
      event_type: params.eventType,
      quantity: params.quantity || 1,
      dedup_key: params.dedupKey,
      metadata: params.metadata,
    }

    const { data: created, error: createError } = await supabase
      .from(QUOTA_TABLES.usageEvents)
      .insert(payload)
      .select('*')
      .single()

    if (createError) {
      return { success: false, error: createError.message }
    }

    return {
      success: true,
      data: {
        id: typeof created.id === 'string' ? created.id : undefined,
        artisan_id: String(created.artisan_id || params.artisanId),
        plan: String(created.plan || normalizePlan(params.plan)),
        period_month: String(created.period_month || periodMonth),
        event_type: String(created.event_type || params.eventType),
        quantity: Number(created.quantity || params.quantity || 1),
        dedup_key: String(created.dedup_key || params.dedupKey),
        metadata:
          created.metadata && typeof created.metadata === 'object'
            ? created.metadata as JsonObject
            : params.metadata,
        created_at: typeof created.created_at === 'string' ? created.created_at : undefined,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue recordUsageEvent',
    }
  }
}

export async function incrementMonthlyUsage(
  params: IncrementMonthlyUsageParams,
): Promise<QuotaResult<UsageMonthlyRow>> {
  try {
    const supabase = getSupabaseAdmin()
    const normalizedPlan = normalizePlan(params.plan)
    const periodMonth = params.periodMonth || getCurrentPeriodMonth()
    const usageResult = await getOrCreateMonthlyUsage(params.artisanId, normalizedPlan)

    if (!usageResult.success || !usageResult.data) {
      return {
        success: false,
        error: usageResult.error || 'Impossible de charger l’usage mensuel',
      }
    }

    const amount = params.amount || 1
    const current = usageResult.data
    const updatedPayload = {
      [params.metric]: Math.max(Number(current[params.metric]) + amount, 0),
      plan: normalizedPlan,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await supabase
      .from(QUOTA_TABLES.usageMonthly)
      .update(updatedPayload)
      .eq('artisan_id', params.artisanId)
      .eq('period_month', periodMonth)
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: {
        id: typeof updated.id === 'string' ? updated.id : undefined,
        artisan_id: String(updated.artisan_id || params.artisanId),
        plan: String(updated.plan || normalizedPlan),
        period_month: String(updated.period_month || periodMonth),
        projects_count: Number(updated.projects_count || 0),
        vapi_calls_count: Number(updated.vapi_calls_count || 0),
        created_at: typeof updated.created_at === 'string' ? updated.created_at : undefined,
        updated_at: typeof updated.updated_at === 'string' ? updated.updated_at : undefined,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue incrementMonthlyUsage',
    }
  }
}

export { QUOTA_TABLES }

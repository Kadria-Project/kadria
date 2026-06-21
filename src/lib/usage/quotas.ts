import 'server-only'
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
const tableColumnsCache = new Map<string, string[]>()

type JsonObject = Record<string, unknown>
type PlanKey = 'essentiel' | 'performance' | 'agence'

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
  source: 'usage_monthly' | 'projects_table_count'
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
  usageSource: 'usage_monthly' | 'projects_table_count'
  error?: string
}

export interface ProjectCreatedUsageParams {
  artisanId: string
  projectId: string
  source?: string
}

export interface UsageEventRow {
  artisan_id: string
  period_month: string
  event_type: string
  quantity: number
  dedup_key: string
  plan?: string
  metadata?: JsonObject
  raw_payload?: JsonObject
  created_at?: string
  status?: string
}

export const QUOTA_SCHEMA_SUPPORT = {
  planLimits: {
    projectLimitColumns: ['projects_limit', 'max_projects_per_month'],
    unlimitedColumns: ['projects_unlimited'],
  },
  usageMonthly: {
    identityColumns: ['usage_id', 'id'],
    projectCountColumns: ['projects_created', 'projects_count'],
    vapiCallColumns: ['vapi_calls', 'vapi_calls_count'],
    baseColumns: [
      'artisan_id',
      'period_month',
      'plan',
      'projects_limit',
      'projects_unlimited',
      'vapi_calls_limit',
      'vapi_minutes_limit',
      'vapi_minutes',
      'updated_at',
      'period_start',
      'period_end',
    ],
  },
  usageEvents: {
    payloadColumns: ['raw_payload', 'metadata'],
    optionalColumns: ['plan', 'created_at', 'status'],
  },
  vapiCalls: {
    statusColumns: ['call_status', 'status'],
    costColumns: ['estimated_cost', 'cost'],
    durationColumns: ['duration_seconds', 'duration_minutes'],
  },
} as const

function getDefaultProjectLimit(plan: PlanKey) {
  if (plan === 'agence') {
    return null
  }

  return 50
}

function normalizeQuotaPlan(plan: unknown): PlanKey {
  const value = String(plan || '').trim().toLowerCase()

  if (value === 'agence' || value === 'entreprise') {
    return 'agence'
  }

  if (value === 'performance' || value === 'pro') {
    return 'performance'
  }

  return 'essentiel'
}

function getPlanLookupCandidates(plan: PlanKey) {
  if (plan === 'agence') {
    return ['agence', 'entreprise']
  }

  return [plan]
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

function buildStableUsageId(artisanId: string, periodMonth: string) {
  return `${artisanId}:${periodMonth}`
}

async function queryTable(table: string, columns: string) {
  const supabase = getSupabaseAdmin()

  return supabase
    .from(table)
    .select(columns)
    .limit(1)
}

async function confirmColumn(table: string, column: string) {
  const { error } = await queryTable(table, column)
  return !error
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

async function resolveTableColumns(
  key: keyof typeof TABLE_CANDIDATES,
  probeColumns: readonly string[] = [],
): Promise<string[]> {
  const cacheKey = `${key}:${probeColumns.join(',')}`
  if (tableColumnsCache.has(cacheKey)) {
    return tableColumnsCache.get(cacheKey) || []
  }

  const tableName = await resolveAccessibleTable(key)
  if (!tableName) {
    tableColumnsCache.set(cacheKey, [])
    return []
  }

  const { data, error } = await queryTable(tableName, '*')
  if (!error && Array.isArray(data) && data[0] && typeof data[0] === 'object') {
    const columns = Object.keys(data[0]).sort()
    tableColumnsCache.set(cacheKey, columns)
    return columns
  }

  const confirmedColumns: string[] = []
  for (const column of probeColumns) {
    if (await confirmColumn(tableName, column)) {
      confirmedColumns.push(column)
    }
  }

  tableColumnsCache.set(cacheKey, confirmedColumns)
  return confirmedColumns
}

function pickAvailableColumn(availableColumns: string[], candidates: readonly string[]) {
  return candidates.find((column) => availableColumns.includes(column)) || null
}

function buildMonthlyUsagePayload(params: {
  availableColumns: string[]
  artisanId: string
  plan: PlanKey
  periodMonth: string
  projectsCount: number
  limit: number | null
  unlimited: boolean
}) {
  const payload: Record<string, unknown> = {
    artisan_id: params.artisanId,
    period_month: params.periodMonth,
  }

  const projectCountColumn = pickAvailableColumn(
    params.availableColumns,
    QUOTA_SCHEMA_SUPPORT.usageMonthly.projectCountColumns,
  )
  const vapiCallsColumn = pickAvailableColumn(
    params.availableColumns,
    QUOTA_SCHEMA_SUPPORT.usageMonthly.vapiCallColumns,
  )

  if (params.availableColumns.includes('usage_id')) {
    payload.usage_id = buildStableUsageId(params.artisanId, params.periodMonth)
  }

  if (params.availableColumns.includes('plan')) {
    payload.plan = params.plan
  }

  if (params.availableColumns.includes('updated_at')) {
    payload.updated_at = new Date().toISOString()
  }

  if (projectCountColumn) {
    payload[projectCountColumn] = params.projectsCount
  }

  if (vapiCallsColumn) {
    payload[vapiCallsColumn] = 0
  }

  if (params.availableColumns.includes('vapi_minutes')) {
    payload.vapi_minutes = 0
  }

  if (params.availableColumns.includes('projects_limit')) {
    payload.projects_limit = params.limit
  }

  if (params.availableColumns.includes('projects_unlimited')) {
    payload.projects_unlimited = params.unlimited
  }

  if (params.availableColumns.includes('period_start') || params.availableColumns.includes('period_end')) {
    const { monthStartIso, nextMonthStartIso } = getCurrentMonthBounds(
      new Date(`${params.periodMonth}-01T00:00:00.000Z`),
    )

    if (params.availableColumns.includes('period_start')) {
      payload.period_start = monthStartIso
    }

    if (params.availableColumns.includes('period_end')) {
      payload.period_end = nextMonthStartIso
    }
  }

  return payload
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
      data: normalizeQuotaPlan(data?.plan || 'performance'),
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
  options?: {
    limit: number | null
    unlimited: boolean
  },
) {
  const supabase = getSupabaseAdmin()
  const usageMonthlyTable = await resolveAccessibleTable('usageMonthly')

  if (!usageMonthlyTable) {
    return { success: false as const, error: 'Table UsageMonthly introuvable' }
  }

  const usageMonthlyColumns = await resolveTableColumns('usageMonthly', [
    ...QUOTA_SCHEMA_SUPPORT.usageMonthly.identityColumns,
    ...QUOTA_SCHEMA_SUPPORT.usageMonthly.projectCountColumns,
    ...QUOTA_SCHEMA_SUPPORT.usageMonthly.vapiCallColumns,
    ...QUOTA_SCHEMA_SUPPORT.usageMonthly.baseColumns,
  ])
  const identityColumn = pickAvailableColumn(
    usageMonthlyColumns,
    QUOTA_SCHEMA_SUPPORT.usageMonthly.identityColumns,
  )
  const projectCountColumn = pickAvailableColumn(
    usageMonthlyColumns,
    QUOTA_SCHEMA_SUPPORT.usageMonthly.projectCountColumns,
  )
  const limit = options?.limit ?? getDefaultProjectLimit(plan)
  const unlimited = options?.unlimited ?? plan === 'agence'

  if (!projectCountColumn) {
    return { success: false as const, error: 'Aucune colonne compteur projet compatible dans UsageMonthly' }
  }

  const payload = buildMonthlyUsagePayload({
    availableColumns: usageMonthlyColumns,
    artisanId,
    plan,
    periodMonth,
    projectsCount,
    limit,
    unlimited,
  })

  const { data: existing, error: existingError } = await supabase
    .from(usageMonthlyTable)
    .select('*')
    .eq('artisan_id', artisanId)
    .eq('period_month', periodMonth)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    return { success: false as const, error: existingError.message }
  }

  if (existing) {
    let updateQuery = supabase
      .from(usageMonthlyTable)
      .update(payload)
      .eq('artisan_id', artisanId)
      .eq('period_month', periodMonth)

    if (identityColumn && existing[identityColumn]) {
      updateQuery = supabase
        .from(usageMonthlyTable)
        .update(payload)
        .eq(identityColumn, existing[identityColumn])
    }

    const { error: updateError } = await updateQuery

    if (updateError) {
      return { success: false as const, error: updateError.message }
    }

    return { success: true as const, tableName: usageMonthlyTable }
  }

  const { error: insertError } = await supabase
    .from(usageMonthlyTable)
    .insert(payload)

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
      const planCandidates = getPlanLookupCandidates(plan)
      const { data, error } = await supabase
        .from(planLimitsTable)
        .select('*')
        .in('plan', planCandidates)
        .limit(planCandidates.length)

      if (!error && Array.isArray(data) && data.length > 0) {
        const matchingRow =
          data.find((row) => String(row.plan || '').trim().toLowerCase() === plan) ||
          data.find((row) => String(row.plan || '').trim().toLowerCase() === 'agence') ||
          data.find((row) => String(row.plan || '').trim().toLowerCase() === 'entreprise') ||
          data[0]

        const unlimited =
          matchingRow.projects_unlimited === true ||
          (plan === 'agence' && matchingRow.projects_unlimited !== false)
        const limit = unlimited
          ? null
          : isFiniteNumber(matchingRow.projects_limit)
            ? Number(matchingRow.projects_limit)
            : isFiniteNumber(matchingRow.max_projects_per_month)
              ? Number(matchingRow.max_projects_per_month)
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
        unlimited: plan === 'agence',
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
      const usageMonthlyColumns = await resolveTableColumns('usageMonthly', [
        ...QUOTA_SCHEMA_SUPPORT.usageMonthly.projectCountColumns,
        ...QUOTA_SCHEMA_SUPPORT.usageMonthly.baseColumns,
      ])
      const projectCountColumn = pickAvailableColumn(
        usageMonthlyColumns,
        QUOTA_SCHEMA_SUPPORT.usageMonthly.projectCountColumns,
      )

      if (projectCountColumn) {
        const { data, error } = await supabase
          .from(usageMonthlyTable)
          .select(projectCountColumn)
          .eq('artisan_id', artisanId)
          .eq('period_month', periodMonth)
          .limit(1)
          .maybeSingle()

        const usageRow = data as Record<string, unknown> | null
        const rawCount = usageRow?.[projectCountColumn]

        if (!error && data && isFiniteNumber(rawCount)) {
          return {
            success: true,
            data: {
              artisanId,
              plan,
              periodMonth,
              used: Number(rawCount),
              source: 'usage_monthly',
              usageMonthlyTable,
            },
          }
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
      {
        limit: quotaResult.data.limit,
        unlimited: quotaResult.data.unlimited,
      },
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
        source: 'projects_table_count',
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
      usageSource: 'projects_table_count',
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
      usageSource: 'projects_table_count',
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

    const usageEventsColumns = await resolveTableColumns('usageEvents', [
      'artisan_id',
      'plan',
      'period_month',
      'event_type',
      'quantity',
      'dedup_key',
      'metadata',
      'raw_payload',
      'created_at',
      'status',
    ])
    const payloadColumn = pickAvailableColumn(
      usageEventsColumns,
      QUOTA_SCHEMA_SUPPORT.usageEvents.payloadColumns,
    )
    const insertPayload: Record<string, unknown> = {
      artisan_id: params.artisan_id,
      period_month: params.period_month,
      event_type: params.event_type,
      quantity: params.quantity,
      dedup_key: params.dedup_key,
    }

    if (usageEventsColumns.includes('plan') && params.plan) {
      insertPayload.plan = params.plan
    }

    if (usageEventsColumns.includes('created_at')) {
      insertPayload.created_at = params.created_at || new Date().toISOString()
    }

    if (usageEventsColumns.includes('status')) {
      insertPayload.status = params.status || 'recorded'
    }

    if (payloadColumn === 'raw_payload') {
      insertPayload.raw_payload = params.raw_payload || params.metadata || null
    } else if (payloadColumn === 'metadata') {
      insertPayload.metadata = params.metadata || params.raw_payload || null
    }

    const { error } = await supabase
      .from(usageEventsTable)
      .insert(insertPayload)

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
  limit?: number | null
  unlimited?: boolean
}): Promise<QuotaResult<{ periodMonth: string; projectsCount: number }>> {
  const periodMonth = params.periodMonth || getCurrentPeriodMonth()
  const syncResult = await upsertMonthlyUsageRow(
    params.artisanId,
    params.plan,
    periodMonth,
    params.projectsCount,
    {
      limit: params.limit ?? getDefaultProjectLimit(params.plan),
      unlimited: params.unlimited ?? params.plan === 'agence',
    },
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
    raw_payload: {
      project_id: params.projectId,
      source: params.source || 'web',
      artisan_id: params.artisanId,
      period_month: quotaResult.data.periodMonth,
    },
    created_at: new Date().toISOString(),
    status: 'recorded',
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
    limit: quotaResult.data.limit,
    unlimited: quotaResult.data.unlimited,
  })
}

export { TABLE_CANDIDATES as QUOTA_TABLES }

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

export interface VapiQuotaConfig {
  artisanId: string
  plan: PlanKey
  periodMonth: string
  callsLimit: number | null
  callsUnlimited: boolean
  minutesLimit: number | null
  source: 'plan_limits' | 'fallback'
  tableName?: string | null
}

export interface VapiUsageSnapshot {
  artisanId: string
  plan: PlanKey
  periodMonth: string
  callsUsed: number
  minutesUsed: number
  source: 'usage_monthly' | 'vapi_calls_table'
  usageMonthlyTable?: string | null
  vapiCallsTable?: string | null
}

export interface VapiQuotaCheck {
  success: boolean
  allowed: boolean
  artisanId: string
  plan: PlanKey
  periodMonth: string
  callsUsed: number
  callsLimit: number | null
  callsRemaining: number | null
  callsUnlimited: boolean
  minutesUsed: number
  minutesLimit: number | null
  minutesRemaining: number | null
  source: 'plan_limits' | 'fallback'
  usageSource: 'usage_monthly' | 'vapi_calls_table'
  exceededReason: 'calls_limit' | 'minutes_limit' | 'plan_not_included' | null
  error?: string
}

export interface RecordVapiCallUsageParams {
  artisanId: string
  callId?: string
  projectId?: string
  durationSeconds?: number
  durationMinutes?: number
  estimatedCost?: number
  status?: string
  rawPayload?: unknown
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
      'quota_vapi_exceeded',
      'vapi_usage_percent',
      'last_event_at',
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
    payloadColumns: ['raw_payload'],
  },
} as const

function getDefaultProjectLimit(plan: PlanKey) {
  if (plan === 'agence') {
    return null
  }

  return 50
}

function getDefaultVapiCallsLimit(plan: PlanKey) {
  if (plan === 'agence') {
    return 400
  }

  if (plan === 'performance') {
    return 150
  }

  return 0
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

function normalizeFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function roundMinutes(value: number) {
  return Math.round(value * 100) / 100
}

function getVapiPayloadMetrics(params: {
  durationSeconds?: number
  durationMinutes?: number
  estimatedCost?: number
}) {
  const durationSeconds = normalizeFiniteNumber(params.durationSeconds) ?? 0
  const explicitMinutes = normalizeFiniteNumber(params.durationMinutes)
  const durationMinutes = explicitMinutes ?? roundMinutes(durationSeconds / 60)
  const estimatedCost = normalizeFiniteNumber(params.estimatedCost) ?? 0

  return {
    durationSeconds,
    durationMinutes,
    estimatedCost,
  }
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

async function getPlanLimitsRow(plan: PlanKey) {
  const supabase = getSupabaseAdmin()
  const planLimitsTable = await resolveAccessibleTable('planLimits')

  if (!planLimitsTable) {
    return {
      success: true as const,
      tableName: null,
      row: null,
    }
  }

  const planCandidates = getPlanLookupCandidates(plan)
  const { data, error } = await supabase
    .from(planLimitsTable)
    .select('*')
    .in('plan', planCandidates)
    .limit(planCandidates.length)

  if (error) {
    return {
      success: false as const,
      error: error.message,
      tableName: planLimitsTable,
      row: null,
    }
  }

  if (!Array.isArray(data) || data.length === 0) {
    return {
      success: true as const,
      tableName: planLimitsTable,
      row: null,
    }
  }

  const row =
    data.find((candidate) => String(candidate.plan || '').trim().toLowerCase() === plan) ||
    data.find((candidate) => String(candidate.plan || '').trim().toLowerCase() === 'agence') ||
    data.find((candidate) => String(candidate.plan || '').trim().toLowerCase() === 'entreprise') ||
    data[0]

  return {
    success: true as const,
    tableName: planLimitsTable,
    row,
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
    const planLimitsResult = await getPlanLimitsRow(plan)
    if (!planLimitsResult.success) {
      return {
        success: false,
        error: planLimitsResult.error,
      }
    }

    if (planLimitsResult.row) {
      const matchingRow = planLimitsResult.row
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
            tableName: planLimitsResult.tableName,
          },
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
        tableName: planLimitsResult.tableName,
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

export async function getVapiQuotaForArtisan(artisanId: string): Promise<QuotaResult<VapiQuotaConfig>> {
  const planResult = await getPlanForArtisan(artisanId)
  const plan = planResult.success && planResult.data ? planResult.data : 'performance'
  const periodMonth = getCurrentPeriodMonth()

  try {
    const planLimitsResult = await getPlanLimitsRow(plan)
    if (!planLimitsResult.success) {
      return {
        success: false,
        error: planLimitsResult.error,
      }
    }

    if (planLimitsResult.row) {
      const row = planLimitsResult.row
      const callsUnlimited =
        row.vapi_calls_unlimited === true ||
        (plan === 'agence' && row.vapi_calls_unlimited !== false && !isFiniteNumber(row.vapi_calls_limit))
      const callsLimit = callsUnlimited
        ? null
        : isFiniteNumber(row.vapi_calls_limit)
          ? Number(row.vapi_calls_limit)
          : getDefaultVapiCallsLimit(plan)
      const minutesLimit = isFiniteNumber(row.vapi_minutes_limit)
        ? Number(row.vapi_minutes_limit)
        : null

      return {
        success: true,
        data: {
          artisanId,
          plan,
          periodMonth,
          callsLimit,
          callsUnlimited,
          minutesLimit,
          source: 'plan_limits',
          tableName: planLimitsResult.tableName,
        },
      }
    }

    return {
      success: true,
      data: {
        artisanId,
        plan,
        periodMonth,
        callsLimit: getDefaultVapiCallsLimit(plan),
        callsUnlimited: false,
        minutesLimit: null,
        source: 'fallback',
        tableName: planLimitsResult.tableName,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible de charger le quota Vapi',
    }
  }
}

export async function getCurrentVapiUsage(artisanId: string): Promise<QuotaResult<VapiUsageSnapshot>> {
  const quotaResult = await getVapiQuotaForArtisan(artisanId)
  if (!quotaResult.success || !quotaResult.data) {
    return {
      success: false,
      error: quotaResult.error || 'Impossible de charger le quota Vapi',
    }
  }

  const { plan, periodMonth } = quotaResult.data

  try {
    const supabase = getSupabaseAdmin()
    const usageMonthlyTable = await resolveAccessibleTable('usageMonthly')

    if (usageMonthlyTable) {
      const usageMonthlyColumns = await resolveTableColumns('usageMonthly', [
        ...QUOTA_SCHEMA_SUPPORT.usageMonthly.vapiCallColumns,
        ...QUOTA_SCHEMA_SUPPORT.usageMonthly.baseColumns,
      ])
      const vapiCallsColumn = pickAvailableColumn(
        usageMonthlyColumns,
        QUOTA_SCHEMA_SUPPORT.usageMonthly.vapiCallColumns,
      )

      if (vapiCallsColumn && usageMonthlyColumns.includes('vapi_minutes')) {
        const { data, error } = await supabase
          .from(usageMonthlyTable)
          .select(`${vapiCallsColumn}, vapi_minutes`)
          .eq('artisan_id', artisanId)
          .eq('period_month', periodMonth)
          .limit(1)
          .maybeSingle()

        const usageRow = data as Record<string, unknown> | null
        const callsUsed = normalizeFiniteNumber(usageRow?.[vapiCallsColumn]) ?? 0
        const minutesUsed = normalizeFiniteNumber(usageRow?.vapi_minutes) ?? 0

        if (!error && data) {
          return {
            success: true,
            data: {
              artisanId,
              plan,
              periodMonth,
              callsUsed,
              minutesUsed,
              source: 'usage_monthly',
              usageMonthlyTable,
            },
          }
        }
      }
    }

    const vapiCallsTable = await resolveAccessibleTable('vapiCalls')
    if (!vapiCallsTable) {
      return {
        success: true,
        data: {
          artisanId,
          plan,
          periodMonth,
          callsUsed: 0,
          minutesUsed: 0,
          source: 'vapi_calls_table',
          usageMonthlyTable,
          vapiCallsTable: null,
        },
      }
    }

    const vapiCallsColumns = await resolveTableColumns('vapiCalls', [
      ...QUOTA_SCHEMA_SUPPORT.vapiCalls.durationColumns,
      'started_at',
      'ended_at',
    ])
    const { monthStartIso, nextMonthStartIso } = getCurrentMonthBounds(
      new Date(`${periodMonth}-01T00:00:00.000Z`),
    )

    const selectedColumns = ['call_id']
    if (vapiCallsColumns.includes('duration_seconds')) {
      selectedColumns.push('duration_seconds')
    }
    if (vapiCallsColumns.includes('duration_minutes')) {
      selectedColumns.push('duration_minutes')
    }
    if (vapiCallsColumns.includes('started_at')) {
      selectedColumns.push('started_at')
    } else if (vapiCallsColumns.includes('ended_at')) {
      selectedColumns.push('ended_at')
    }

    const dateColumn = vapiCallsColumns.includes('started_at')
      ? 'started_at'
      : vapiCallsColumns.includes('ended_at')
        ? 'ended_at'
        : null

    let query = supabase
      .from(vapiCallsTable)
      .select(selectedColumns.join(','))
      .eq('artisan_id', artisanId)

    if (dateColumn) {
      query = query
        .gte(dateColumn, monthStartIso)
        .lt(dateColumn, nextMonthStartIso)
    }

    const { data, error } = await query
    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    const rows = Array.isArray(data) ? data as unknown as Array<Record<string, unknown>> : []
    const callsUsed = rows.length
    const minutesUsed = roundMinutes(rows.reduce((total, row) => {
      const minutes = normalizeFiniteNumber(row.duration_minutes)
      if (typeof minutes === 'number') {
        return total + minutes
      }

      const seconds = normalizeFiniteNumber(row.duration_seconds) ?? 0
      return total + (seconds / 60)
    }, 0))

    return {
      success: true,
      data: {
        artisanId,
        plan,
        periodMonth,
        callsUsed,
        minutesUsed,
        source: 'vapi_calls_table',
        usageMonthlyTable,
        vapiCallsTable,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible de charger l’usage Vapi',
    }
  }
}

export async function canUseVapi(artisanId: string): Promise<VapiQuotaCheck> {
  const quotaResult = await getVapiQuotaForArtisan(artisanId)
  if (!quotaResult.success || !quotaResult.data) {
    return {
      success: false,
      allowed: false,
      artisanId,
      plan: 'performance',
      periodMonth: getCurrentPeriodMonth(),
      callsUsed: 0,
      callsLimit: getDefaultVapiCallsLimit('performance'),
      callsRemaining: null,
      callsUnlimited: false,
      minutesUsed: 0,
      minutesLimit: null,
      minutesRemaining: null,
      source: 'fallback',
      usageSource: 'vapi_calls_table',
      exceededReason: null,
      error: quotaResult.error || 'Impossible de charger le quota Vapi',
    }
  }

  const usageResult = await getCurrentVapiUsage(artisanId)
  if (!usageResult.success || !usageResult.data) {
    return {
      success: false,
      allowed: false,
      artisanId,
      plan: quotaResult.data.plan,
      periodMonth: quotaResult.data.periodMonth,
      callsUsed: 0,
      callsLimit: quotaResult.data.callsLimit,
      callsRemaining: null,
      callsUnlimited: quotaResult.data.callsUnlimited,
      minutesUsed: 0,
      minutesLimit: quotaResult.data.minutesLimit,
      minutesRemaining: null,
      source: quotaResult.data.source,
      usageSource: 'vapi_calls_table',
      exceededReason: null,
      error: usageResult.error || 'Impossible de charger l’usage Vapi',
    }
  }

  const callsUsed = usageResult.data.callsUsed
  const minutesUsed = usageResult.data.minutesUsed
  const callsLimit = quotaResult.data.callsLimit
  const minutesLimit = quotaResult.data.minutesLimit
  const callsExceeded = !quotaResult.data.callsUnlimited && callsLimit !== null && callsUsed >= callsLimit
  const minutesExceeded = minutesLimit !== null && minutesUsed >= minutesLimit
  const planNotIncluded = !quotaResult.data.callsUnlimited && callsLimit === 0
  const exceededReason =
    planNotIncluded ? 'plan_not_included'
      : callsExceeded ? 'calls_limit'
      : minutesExceeded ? 'minutes_limit'
      : null

  return {
    success: true,
    allowed: exceededReason === null,
    artisanId,
    plan: quotaResult.data.plan,
    periodMonth: quotaResult.data.periodMonth,
    callsUsed,
    callsLimit,
    callsRemaining: quotaResult.data.callsUnlimited || callsLimit === null ? null : Math.max(callsLimit - callsUsed, 0),
    callsUnlimited: quotaResult.data.callsUnlimited,
    minutesUsed,
    minutesLimit,
    minutesRemaining: minutesLimit === null ? null : Math.max(minutesLimit - minutesUsed, 0),
    source: quotaResult.data.source,
    usageSource: usageResult.data.source,
    exceededReason,
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

export async function recordVapiCallUsage(
  params: RecordVapiCallUsageParams,
): Promise<QuotaResult<{ periodMonth: string; callsUsed: number; minutesUsed: number; exceeded: boolean }>> {
  const quotaResult = await getVapiQuotaForArtisan(params.artisanId)
  if (!quotaResult.success || !quotaResult.data) {
    return {
      success: false,
      error: quotaResult.error || 'Impossible de résoudre le quota Vapi',
    }
  }

  const periodMonth = quotaResult.data.periodMonth
  const metrics = getVapiPayloadMetrics({
    durationSeconds: params.durationSeconds,
    durationMinutes: params.durationMinutes,
    estimatedCost: params.estimatedCost,
  })

  try {
    const supabase = getSupabaseAdmin()
    const vapiCallsTable = await resolveAccessibleTable('vapiCalls')

    if (vapiCallsTable) {
      const vapiCallsColumns = await resolveTableColumns('vapiCalls', [
        'call_id',
        'artisan_id',
        'project_id',
        'duration_seconds',
        'duration_minutes',
        'estimated_cost',
        'cost',
        'call_status',
        'status',
        'started_at',
        'ended_at',
        'raw_payload',
      ])
      const statusColumn = pickAvailableColumn(
        vapiCallsColumns,
        QUOTA_SCHEMA_SUPPORT.vapiCalls.statusColumns,
      )
      const costColumn = pickAvailableColumn(
        vapiCallsColumns,
        QUOTA_SCHEMA_SUPPORT.vapiCalls.costColumns,
      )
      const insertPayload: Record<string, unknown> = {
        artisan_id: params.artisanId,
      }

      if (vapiCallsColumns.includes('call_id') && params.callId) {
        insertPayload.call_id = params.callId
      }
      if (vapiCallsColumns.includes('project_id') && params.projectId) {
        insertPayload.project_id = params.projectId
      }
      if (vapiCallsColumns.includes('duration_seconds')) {
        insertPayload.duration_seconds = metrics.durationSeconds
      }
      if (vapiCallsColumns.includes('duration_minutes')) {
        insertPayload.duration_minutes = metrics.durationMinutes
      }
      if (statusColumn) {
        insertPayload[statusColumn] = params.status || 'completed'
      }
      if (costColumn) {
        insertPayload[costColumn] = metrics.estimatedCost
      }
      if (vapiCallsColumns.includes('raw_payload')) {
        insertPayload.raw_payload = params.rawPayload ?? null
      }

      const nowIso = new Date().toISOString()
      if (vapiCallsColumns.includes('started_at')) {
        insertPayload.started_at = nowIso
      }
      if (vapiCallsColumns.includes('ended_at')) {
        insertPayload.ended_at = nowIso
      }

      if (params.callId && vapiCallsColumns.includes('call_id')) {
        const { data: existing, error: existingError } = await supabase
          .from(vapiCallsTable)
          .select('call_id')
          .eq('call_id', params.callId)
          .limit(1)
          .maybeSingle()

        if (existingError) {
          return { success: false, error: existingError.message }
        }

        if (existing) {
          const { error: updateError } = await supabase
            .from(vapiCallsTable)
            .update(insertPayload)
            .eq('call_id', params.callId)

          if (updateError) {
            return { success: false, error: updateError.message }
          }
        } else {
          const { error: insertError } = await supabase
            .from(vapiCallsTable)
            .insert(insertPayload)

          if (insertError) {
            return { success: false, error: insertError.message }
          }
        }
      } else {
        const { error: insertError } = await supabase
          .from(vapiCallsTable)
          .insert(insertPayload)

        if (insertError) {
          return { success: false, error: insertError.message }
        }
      }
    }

    const dedupKey = params.callId
      ? `vapi_call:${params.callId}`
      : `vapi_call:${params.artisanId}:${params.projectId || 'no-project'}:${periodMonth}:${metrics.durationSeconds}:${metrics.durationMinutes}`

    const usageEventResult = await recordUsageEvent({
      artisan_id: params.artisanId,
      period_month: periodMonth,
      event_type: 'vapi_call',
      quantity: 1,
      dedup_key: dedupKey,
      raw_payload: {
        call_id: params.callId || null,
        project_id: params.projectId || null,
        artisan_id: params.artisanId,
        duration_seconds: metrics.durationSeconds,
        duration_minutes: metrics.durationMinutes,
        estimated_cost: metrics.estimatedCost,
        source: 'vapi',
      },
      created_at: new Date().toISOString(),
      status: 'recorded',
    })

    if (!usageEventResult.success) {
      return {
        success: false,
        error: usageEventResult.error,
      }
    }

    const usageResult = await getCurrentVapiUsage(params.artisanId)
    if (!usageResult.success || !usageResult.data) {
      return {
        success: false,
        error: usageResult.error || 'Impossible de synchroniser l’usage Vapi',
      }
    }

    const usageMonthlyTable = await resolveAccessibleTable('usageMonthly')
    if (!usageMonthlyTable) {
      return {
        success: true,
        data: {
          periodMonth,
          callsUsed: usageResult.data.callsUsed,
          minutesUsed: usageResult.data.minutesUsed,
          exceeded: false,
        },
      }
    }

    const usageMonthlyColumns = await resolveTableColumns('usageMonthly', [
      ...QUOTA_SCHEMA_SUPPORT.usageMonthly.identityColumns,
      ...QUOTA_SCHEMA_SUPPORT.usageMonthly.projectCountColumns,
      ...QUOTA_SCHEMA_SUPPORT.usageMonthly.vapiCallColumns,
      ...QUOTA_SCHEMA_SUPPORT.usageMonthly.baseColumns,
      'quota_vapi_exceeded',
      'vapi_usage_percent',
      'last_event_at',
    ])
    const identityColumn = pickAvailableColumn(
      usageMonthlyColumns,
      QUOTA_SCHEMA_SUPPORT.usageMonthly.identityColumns,
    )
    const projectCountColumn = pickAvailableColumn(
      usageMonthlyColumns,
      QUOTA_SCHEMA_SUPPORT.usageMonthly.projectCountColumns,
    )
    const vapiCallsColumn = pickAvailableColumn(
      usageMonthlyColumns,
      QUOTA_SCHEMA_SUPPORT.usageMonthly.vapiCallColumns,
    )
    const currentProjectUsage = await getCurrentProjectUsage(params.artisanId)
    const projectCount = currentProjectUsage.success && currentProjectUsage.data
      ? currentProjectUsage.data.used
      : 0
    const postCheck = await canUseVapi(params.artisanId)
    const exceeded = postCheck.success ? !postCheck.allowed : false
    const nowIso = new Date().toISOString()
    const monthlyPayload = buildMonthlyUsagePayload({
      availableColumns: usageMonthlyColumns,
      artisanId: params.artisanId,
      plan: quotaResult.data.plan,
      periodMonth,
      projectsCount: projectCount,
      limit: postCheck.success ? postCheck.callsLimit : quotaResult.data.callsLimit,
      unlimited: postCheck.success ? postCheck.callsUnlimited : quotaResult.data.callsUnlimited,
    })

    if (vapiCallsColumn) {
      monthlyPayload[vapiCallsColumn] = usageResult.data.callsUsed
    }
    if (usageMonthlyColumns.includes('vapi_minutes')) {
      monthlyPayload.vapi_minutes = usageResult.data.minutesUsed
    }
    if (usageMonthlyColumns.includes('vapi_calls_limit')) {
      monthlyPayload.vapi_calls_limit = quotaResult.data.callsLimit
    }
    if (usageMonthlyColumns.includes('vapi_minutes_limit')) {
      monthlyPayload.vapi_minutes_limit = quotaResult.data.minutesLimit
    }
    if (usageMonthlyColumns.includes('quota_vapi_exceeded')) {
      monthlyPayload.quota_vapi_exceeded = exceeded
    }
    if (usageMonthlyColumns.includes('vapi_usage_percent')) {
      const percent = quotaResult.data.callsUnlimited || !quotaResult.data.callsLimit
        ? 0
        : Math.min(100, Math.round((usageResult.data.callsUsed / quotaResult.data.callsLimit) * 100))
      monthlyPayload.vapi_usage_percent = percent
    }
    if (usageMonthlyColumns.includes('last_event_at')) {
      monthlyPayload.last_event_at = nowIso
    }
    if (usageMonthlyColumns.includes('updated_at')) {
      monthlyPayload.updated_at = nowIso
    }
    if (projectCountColumn && monthlyPayload[projectCountColumn] === undefined) {
      monthlyPayload[projectCountColumn] = projectCount
    }

    const { data: existingMonthly, error: existingMonthlyError } = await supabase
      .from(usageMonthlyTable)
      .select('*')
      .eq('artisan_id', params.artisanId)
      .eq('period_month', periodMonth)
      .limit(1)
      .maybeSingle()

    if (existingMonthlyError) {
      return { success: false, error: existingMonthlyError.message }
    }

    if (existingMonthly) {
      let updateQuery = supabase
        .from(usageMonthlyTable)
        .update(monthlyPayload)
        .eq('artisan_id', params.artisanId)
        .eq('period_month', periodMonth)

      if (identityColumn && existingMonthly[identityColumn]) {
        updateQuery = supabase
          .from(usageMonthlyTable)
          .update(monthlyPayload)
          .eq(identityColumn, existingMonthly[identityColumn])
      }

      const { error: updateError } = await updateQuery
      if (updateError) {
        return { success: false, error: updateError.message }
      }
    } else {
      if (usageMonthlyColumns.includes('usage_id')) {
        monthlyPayload.usage_id = buildStableUsageId(params.artisanId, periodMonth)
      }

      const { error: insertError } = await supabase
        .from(usageMonthlyTable)
        .insert(monthlyPayload)

      if (insertError) {
        return { success: false, error: insertError.message }
      }
    }

    return {
      success: true,
      data: {
        periodMonth,
        callsUsed: usageResult.data.callsUsed,
        minutesUsed: usageResult.data.minutesUsed,
        exceeded,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible d’enregistrer l’usage Vapi',
    }
  }
}

export type UsageStatus = 'ok' | 'warning' | 'limit_reached' | 'exceeded'

export interface MonthlyUsageSummary {
  artisanId: string
  periodMonth: string
  plan: PlanKey
  projects: {
    used: number
    limit: number | null
    unlimited: boolean
    percent: number | null
    status: UsageStatus
  }
  vapi: {
    callsUsed: number
    callsLimit: number | null
    callsUnlimited: boolean
    callsPercent: number | null
    minutesUsed: number
    minutesLimit: number | null
    minutesPercent: number | null
    status: UsageStatus
  }
  updatedAt?: string
}

function computeUsagePercent(used: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null
  return Math.round((used / limit) * 1000) / 10
}

function computeUsageStatus(percent: number | null): UsageStatus {
  if (percent === null) return 'ok'
  if (percent > 100) return 'exceeded'
  if (percent === 100) return 'limit_reached'
  if (percent >= 80) return 'warning'
  return 'ok'
}

function combineUsageStatus(a: UsageStatus, b: UsageStatus): UsageStatus {
  const order: UsageStatus[] = ['ok', 'warning', 'limit_reached', 'exceeded']
  return order[Math.max(order.indexOf(a), order.indexOf(b))]
}

export async function getMonthlyUsageSummary(artisanId: string): Promise<QuotaResult<MonthlyUsageSummary>> {
  try {
    const [projectQuota, projectUsage, vapiQuota, vapiUsage] = await Promise.all([
      getProjectQuotaForArtisan(artisanId),
      getCurrentProjectUsage(artisanId),
      getVapiQuotaForArtisan(artisanId),
      getCurrentVapiUsage(artisanId),
    ])

    if (!projectQuota.success || !projectQuota.data) {
      return { success: false, error: projectQuota.error || 'Impossible de charger le quota projets' }
    }
    if (!projectUsage.success || !projectUsage.data) {
      return { success: false, error: projectUsage.error || 'Impossible de charger l’usage projets' }
    }
    if (!vapiQuota.success || !vapiQuota.data) {
      return { success: false, error: vapiQuota.error || 'Impossible de charger le quota Vapi' }
    }
    if (!vapiUsage.success || !vapiUsage.data) {
      return { success: false, error: vapiUsage.error || 'Impossible de charger l’usage Vapi' }
    }

    const periodMonth = projectQuota.data.periodMonth
    const plan = projectQuota.data.plan

    const projectsUsed = projectUsage.data.used
    const projectsLimit = projectQuota.data.unlimited ? null : projectQuota.data.limit
    const projectsPercent = projectQuota.data.unlimited ? null : computeUsagePercent(projectsUsed, projectsLimit)
    const projectsStatus = computeUsageStatus(projectsPercent)

    const callsUsed = vapiUsage.data.callsUsed
    const callsLimit = vapiQuota.data.callsUnlimited ? null : vapiQuota.data.callsLimit
    const callsPercent = vapiQuota.data.callsUnlimited ? null : computeUsagePercent(callsUsed, callsLimit)
    const callsStatus = computeUsageStatus(callsPercent)

    const minutesUsed = vapiUsage.data.minutesUsed
    const minutesLimit = vapiQuota.data.minutesLimit
    const minutesPercent = computeUsagePercent(minutesUsed, minutesLimit)
    const minutesStatus = computeUsageStatus(minutesPercent)

    return {
      success: true,
      data: {
        artisanId,
        periodMonth,
        plan,
        projects: {
          used: projectsUsed,
          limit: projectsLimit,
          unlimited: projectQuota.data.unlimited,
          percent: projectsPercent,
          status: projectsStatus,
        },
        vapi: {
          callsUsed,
          callsLimit,
          callsUnlimited: vapiQuota.data.callsUnlimited,
          callsPercent,
          minutesUsed,
          minutesLimit,
          minutesPercent,
          status: combineUsageStatus(callsStatus, minutesStatus),
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible de charger l’utilisation mensuelle',
    }
  }
}

export interface AccountStatusSummary {
  plan: PlanKey
  status: string | null
  billingStatus: string | null
  trialEndDate: string | null
  nextBilling: string | null
}

export async function getAccountStatusForArtisan(artisanId: string): Promise<QuotaResult<AccountStatusSummary>> {
  try {
    const supabase = getSupabaseAdmin()
    const usersTable = await resolveAccessibleTable('users')

    if (!usersTable) {
      return { success: false, error: 'Table Users introuvable' }
    }

    const { data, error } = await supabase
      .from(usersTable)
      .select('*')
      .eq('artisan_id', artisanId)
      .limit(1)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    const row = (data || {}) as JsonObject

    return {
      success: true,
      data: {
        plan: normalizeQuotaPlan((row.plan as string) || 'performance'),
        status: (row.statut as string) || (row.status as string) || null,
        billingStatus: (row.billing_status as string) || null,
        trialEndDate: (row.trial_end_date as string) || null,
        nextBilling: (row.next_billing as string) || null,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible de charger le statut du compte',
    }
  }
}

export { TABLE_CANDIDATES as QUOTA_TABLES }

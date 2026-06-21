import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { QUOTA_TABLES } from '@/src/lib/usage/quotas'

type DebugCheckKey = keyof typeof QUOTA_TABLES

type TableDiagnostic = {
  ok: boolean
  tableName: string | null
  accessible: boolean
  empty: boolean
  discovery: 'row_keys' | 'empty_table_probe' | 'table_inaccessible'
  expectedColumns: string[]
  availableColumns: string[]
  missingColumns: string[]
  aliasColumns: Array<{
    expected: string
    alternatives: string[]
    matchedAlternative: string | null
    status: 'matched_expected' | 'alias_available' | 'missing'
  }>
  notes: string[]
  error?: string
}

type DebugResponse = {
  success: boolean
  supabase: 'connected' | 'unavailable'
  environment: {
    nodeEnv: string
    hasDebugSecret: boolean
  }
  tables: Record<string, TableDiagnostic>
  quotaReadiness: {
    projectQuotaReady: boolean
    vapiQuotaReady: boolean
    blockingIssues: string[]
  }
  error?: string
}

const TABLE_SPECS: Record<
  DebugCheckKey,
  {
    label: string
    candidates: readonly string[]
    expectedColumns: string[]
    alternativeColumns?: Record<string, string[]>
  }
> = {
  users: {
    label: 'Users',
    candidates: QUOTA_TABLES.users,
    expectedColumns: ['artisan_id', 'plan'],
  },
  projects: {
    label: 'Projects',
    candidates: QUOTA_TABLES.projects,
    expectedColumns: ['id', 'artisan_id', 'created_at'],
  },
  planLimits: {
    label: 'PlanLimits',
    candidates: QUOTA_TABLES.planLimits,
    expectedColumns: [
      'plan',
      'projects_unlimited',
      'max_projects_per_month',
      'projects_limit',
      'vapi_calls_limit',
      'vapi_calls_unlimited',
      'vapi_minutes_limit',
      'is_active',
    ],
  },
  usageMonthly: {
    label: 'UsageMonthly',
    candidates: QUOTA_TABLES.usageMonthly,
    expectedColumns: [
      'id',
      'artisan_id',
      'plan',
      'period_month',
      'projects_count',
      'projects_created',
      'vapi_calls_count',
      'vapi_calls',
      'vapi_minutes',
      'updated_at',
    ],
    alternativeColumns: {
      projects_count: ['projects_created'],
      vapi_calls_count: ['vapi_calls'],
    },
  },
  usageEvents: {
    label: 'UsageEvents',
    candidates: QUOTA_TABLES.usageEvents,
    expectedColumns: [
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
    ],
    alternativeColumns: {
      duration_seconds: [],
    },
  },
  vapiCalls: {
    label: 'VapiCalls',
    candidates: QUOTA_TABLES.vapiCalls,
    expectedColumns: [
      'call_id',
      'artisan_id',
      'project_id',
      'duration_seconds',
      'cost',
      'status',
      'started_at',
      'ended_at',
    ],
  },
}

function isAuthorized(request: NextRequest) {
  const expectedSecret = process.env.DEBUG_API_SECRET

  if (process.env.NODE_ENV === 'production') {
    if (!expectedSecret) {
      return false
    }
  }

  if (!expectedSecret) {
    return true
  }

  const providedSecret =
    request.headers.get('x-debug-secret') ||
    request.nextUrl.searchParams.get('secret')

  return providedSecret === expectedSecret
}

async function checkTable(table: string) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  return !error
}

async function resolveAccessibleTable(candidates: readonly string[]) {
  for (const table of candidates) {
    if (await checkTable(table)) {
      return table
    }
  }

  return null
}

async function queryColumns(table: string, columns: string) {
  const supabase = getSupabaseAdmin()

  return supabase
    .from(table)
    .select(columns)
    .limit(1)
}

async function confirmColumn(table: string, column: string) {
  const { error } = await queryColumns(table, column)
  return !error
}

async function inspectTable(key: DebugCheckKey): Promise<TableDiagnostic> {
  const spec = TABLE_SPECS[key]
  const tableName = await resolveAccessibleTable(spec.candidates)

  if (!tableName) {
    return {
      ok: false,
      tableName: null,
      accessible: false,
      empty: false,
      discovery: 'table_inaccessible',
      expectedColumns: spec.expectedColumns,
      availableColumns: [],
      missingColumns: spec.expectedColumns,
      aliasColumns: [],
      notes: ['No accessible table found for configured candidates.'],
      error: `Unable to access any candidate table: ${spec.candidates.join(', ')}`,
    }
  }

  const { data, error } = await queryColumns(tableName, '*')

  if (error) {
    return {
      ok: false,
      tableName,
      accessible: false,
      empty: false,
      discovery: 'table_inaccessible',
      expectedColumns: spec.expectedColumns,
      availableColumns: [],
      missingColumns: spec.expectedColumns,
      aliasColumns: [],
      notes: ['Table candidate resolved but probing rows failed.'],
      error: error.message,
    }
  }

  const availableColumns = new Set<string>()
  const missingColumns = new Set<string>()
  const aliasColumns: TableDiagnostic['aliasColumns'] = []
  const notes: string[] = []
  const firstRow = Array.isArray(data) && data.length > 0 ? data[0] : null
  const empty = !firstRow

  if (firstRow && typeof firstRow === 'object') {
    Object.keys(firstRow).forEach((column) => availableColumns.add(column))
  }

  const columnsToProbe = new Set<string>(spec.expectedColumns)
  Object.values(spec.alternativeColumns || {}).forEach((alternatives) => {
    alternatives.forEach((column) => columnsToProbe.add(column))
  })

  if (!firstRow) {
    for (const column of columnsToProbe) {
      if (await confirmColumn(tableName, column)) {
        availableColumns.add(column)
      }
    }
    notes.push('Table is empty; columns confirmed through targeted select probes only.')
  }

  for (const column of spec.expectedColumns) {
    if (!availableColumns.has(column)) {
      missingColumns.add(column)
    }
  }

  for (const [expected, alternatives] of Object.entries(spec.alternativeColumns || {})) {
    const hasExpected = availableColumns.has(expected)
    const matchedAlternative = alternatives.find((candidate) => availableColumns.has(candidate)) || null

    aliasColumns.push({
      expected,
      alternatives,
      matchedAlternative,
      status: hasExpected ? 'matched_expected' : matchedAlternative ? 'alias_available' : 'missing',
    })

    if (!hasExpected && matchedAlternative) {
      missingColumns.delete(expected)
      notes.push(`Expected column "${expected}" not confirmed, but alias "${matchedAlternative}" is available.`)
    }
  }

  if (spec.candidates[0] !== tableName) {
    notes.push(`Using fallback table name "${tableName}" instead of preferred "${spec.candidates[0]}".`)
  }

  return {
    ok: missingColumns.size === 0,
    tableName,
    accessible: true,
    empty,
    discovery: empty ? 'empty_table_probe' : 'row_keys',
    expectedColumns: spec.expectedColumns,
    availableColumns: Array.from(availableColumns).sort(),
    missingColumns: Array.from(missingColumns).sort(),
    aliasColumns,
    notes,
  }
}

function hasConfirmedColumn(
  diagnostic: TableDiagnostic | undefined,
  expected: string,
  alternatives: string[] = [],
) {
  if (!diagnostic?.accessible) {
    return false
  }

  if (diagnostic.availableColumns.includes(expected)) {
    return true
  }

  return alternatives.some((column) => diagnostic.availableColumns.includes(column))
}

function buildQuotaReadiness(tables: Record<string, TableDiagnostic>) {
  const blockingIssues: string[] = []

  const users = tables.Users
  const projects = tables.Projects
  const usageMonthly = tables.UsageMonthly
  const usageEvents = tables.UsageEvents
  const vapiCalls = tables.VapiCalls

  const projectChecks = [
    ['Users.artisan_id', hasConfirmedColumn(users, 'artisan_id')],
    ['Users.plan', hasConfirmedColumn(users, 'plan')],
    ['Projects.artisan_id', hasConfirmedColumn(projects, 'artisan_id')],
    ['Projects.created_at', hasConfirmedColumn(projects, 'created_at')],
    ['UsageMonthly.artisan_id', hasConfirmedColumn(usageMonthly, 'artisan_id')],
    ['UsageMonthly.period_month', hasConfirmedColumn(usageMonthly, 'period_month')],
    ['UsageMonthly.projects_count|projects_created', hasConfirmedColumn(usageMonthly, 'projects_count', ['projects_created'])],
    ['UsageEvents.dedup_key', hasConfirmedColumn(usageEvents, 'dedup_key')],
  ] as const

  const vapiChecks = [
    ['UsageMonthly.vapi_calls_count|vapi_calls', hasConfirmedColumn(usageMonthly, 'vapi_calls_count', ['vapi_calls'])],
    ['UsageMonthly.vapi_minutes', hasConfirmedColumn(usageMonthly, 'vapi_minutes')],
    ['UsageEvents.event_type', hasConfirmedColumn(usageEvents, 'event_type')],
    ['UsageEvents.quantity', hasConfirmedColumn(usageEvents, 'quantity')],
    ['UsageEvents.duration_seconds|VapiCalls.duration_seconds', hasConfirmedColumn(usageEvents, 'duration_seconds') || hasConfirmedColumn(vapiCalls, 'duration_seconds')],
    ['VapiCalls.call_id', hasConfirmedColumn(vapiCalls, 'call_id')],
    ['VapiCalls.artisan_id', hasConfirmedColumn(vapiCalls, 'artisan_id')],
    ['VapiCalls.duration_seconds', hasConfirmedColumn(vapiCalls, 'duration_seconds')],
    ['VapiCalls.started_at', hasConfirmedColumn(vapiCalls, 'started_at')],
  ] as const

  for (const [label, ok] of projectChecks) {
    if (!ok) {
      blockingIssues.push(`Project quota dependency missing: ${label}`)
    }
  }

  for (const [label, ok] of vapiChecks) {
    if (!ok) {
      blockingIssues.push(`Vapi quota dependency missing: ${label}`)
    }
  }

  return {
    projectQuotaReady: projectChecks.every(([, ok]) => ok),
    vapiQuotaReady: vapiChecks.every(([, ok]) => ok),
    blockingIssues,
  }
}

export async function GET(request: NextRequest) {
  const environment = {
    nodeEnv: process.env.NODE_ENV || 'development',
    hasDebugSecret: Boolean(process.env.DEBUG_API_SECRET),
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        supabase: 'unavailable',
        environment,
        tables: {},
        quotaReadiness: {
          projectQuotaReady: false,
          vapiQuotaReady: false,
          blockingIssues: ['Debug route unauthorized'],
        },
        error: process.env.NODE_ENV === 'production' && !process.env.DEBUG_API_SECRET
          ? 'DEBUG_API_SECRET requis en production'
          : 'Unauthorized debug access',
      },
      { status: 403 },
    )
  }

  const tables = {} as Record<string, TableDiagnostic>

  try {
    for (const key of Object.keys(TABLE_SPECS) as DebugCheckKey[]) {
      const spec = TABLE_SPECS[key]
      tables[spec.label] = await inspectTable(key)
    }

    const quotaReadiness = buildQuotaReadiness(tables)
    const inaccessibleTables = Object.entries(tables)
      .filter(([, diagnostic]) => !diagnostic.accessible)
      .map(([label]) => label)

    if (inaccessibleTables.length > 0) {
      return NextResponse.json(
        {
          success: false,
          supabase: 'connected',
          environment,
          tables,
          quotaReadiness,
          error: `Tables indisponibles ou introuvables : ${inaccessibleTables.join(', ')}`,
        },
        { status: 500 },
      )
    }

    const response: DebugResponse = {
      success: true,
      supabase: 'connected',
      environment,
      tables,
      quotaReadiness,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        supabase: 'unavailable',
        environment,
        tables,
        quotaReadiness: {
          projectQuotaReady: false,
          vapiQuotaReady: false,
          blockingIssues: ['Unexpected debug route failure'],
        },
        error: error instanceof Error ? error.message : 'Erreur Supabase inconnue',
      },
      { status: 500 },
    )
  }
}

export const BRIEF_ERROR_STAGES = ['session', 'tenant', 'schema', 'projects_query', 'data_load', 'normalize', 'build', 'contract', 'response'] as const
export type BriefErrorStage = typeof BRIEF_ERROR_STAGES[number]
export type BriefErrorDiagnostic = 'DATABASE_COLUMN_MISSING' | 'DATABASE_PERMISSION_DENIED' | 'DATABASE_TABLE_MISSING' | 'DATABASE_ROW_NOT_FOUND' | 'DATABASE_COLUMN_NOT_EXPOSED' | 'AUTHENTICATION_REQUIRED' | 'ACCESS_FORBIDDEN' | 'SESSION_RESOLUTION_FAILED' | 'TENANT_RESOLUTION_FAILED' | 'SCHEMA_INSPECTION_FAILED' | 'DATA_LOAD_FAILED' | 'NORMALIZATION_FAILED' | 'CONTRACT_VALIDATION_FAILED' | 'UNEXPECTED_ERROR'
export type NormalizedBriefError = { type: string; message: string; code?: string; details?: string; hint?: string; diagnostic: BriefErrorDiagnostic }

const MAX_LOG_VALUE_LENGTH = 500

function clean(value: unknown) {
  if (typeof value !== 'string') return undefined
  const compact = value.replace(/[\r\n\t\0]/g, ' ').replace(/\s+/g, ' ').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]').replace(/(?:bearer\s+|token[=:]\s*)[^\s"']+/gi, '[redacted-token]').trim()
  return compact ? compact.slice(0, MAX_LOG_VALUE_LENGTH) : undefined
}

function diagnosticFor(code: string | undefined, stage: BriefErrorStage): BriefErrorDiagnostic {
  const known: Record<string, BriefErrorDiagnostic> = { '42703': 'DATABASE_COLUMN_MISSING', '42501': 'DATABASE_PERMISSION_DENIED', '42P01': 'DATABASE_TABLE_MISSING', PGRST116: 'DATABASE_ROW_NOT_FOUND', PGRST204: 'DATABASE_COLUMN_NOT_EXPOSED', '401': 'AUTHENTICATION_REQUIRED', '403': 'ACCESS_FORBIDDEN' }
  if (code && known[code]) return known[code]
  if (stage === 'session') return 'SESSION_RESOLUTION_FAILED'
  if (stage === 'tenant') return 'TENANT_RESOLUTION_FAILED'
  if (stage === 'schema') return 'SCHEMA_INSPECTION_FAILED'
  if (stage === 'projects_query' || stage === 'data_load') return 'DATA_LOAD_FAILED'
  if (stage === 'normalize') return 'NORMALIZATION_FAILED'
  if (stage === 'contract') return 'CONTRACT_VALIDATION_FAILED'
  return 'UNEXPECTED_ERROR'
}

export function normalizeBriefError(error: unknown, stage: BriefErrorStage): NormalizedBriefError {
  const source = error && typeof error === 'object' ? error as { name?: unknown; message?: unknown; code?: unknown; details?: unknown; hint?: unknown } : null
  const type = error instanceof Error ? error.name || 'Error' : clean(source?.name) || (source ? Object.getPrototypeOf(source)?.constructor?.name || 'UnknownError' : 'UnknownError')
  const message = clean(error instanceof Error ? error.message : source?.message) || 'Unknown structured error'
  const code = clean(source?.code)
  const details = clean(source?.details)
  const hint = clean(source?.hint)
  return { type, message, ...(code ? { code } : {}), ...(details ? { details } : {}), ...(hint ? { hint } : {}), diagnostic: diagnosticFor(code, stage) }
}

export function formatBriefError(input: { scope: 'HOME_BRIEF' | 'TRACKING_BRIEF'; requestId: string; stage: BriefErrorStage; error: unknown }) {
  const normalized = normalizeBriefError(input.error, input.stage)
  const quote = (value: string) => JSON.stringify(value)
  return [
    `[${input.scope}]`, `requestId=${input.requestId}`, `stage=${input.stage}`, `diagnostic=${normalized.diagnostic}`, `type=${normalized.type}`,
    ...(normalized.code ? [`code=${normalized.code}`] : []), `message=${quote(normalized.message)}`,
    ...(normalized.details ? [`details=${quote(normalized.details)}`] : []), ...(normalized.hint ? [`hint=${quote(normalized.hint)}`] : []),
  ].join(' ')
}

export function logBriefError(input: { scope: 'HOME_BRIEF' | 'TRACKING_BRIEF'; requestId: string; stage: BriefErrorStage; error: unknown }) { console.error(formatBriefError(input)) }

export async function availableProjectColumns(required: string[], optional: string[], hasColumn: (table: string, column: string) => Promise<boolean>, table: string) {
  const availability = await Promise.all(optional.map(async (column) => [column, await hasColumn(table, column)] as const))
  const missing = availability.filter(([, exists]) => !exists).map(([column]) => column)
  return { columns: [...required, ...availability.filter(([, exists]) => exists).map(([column]) => column)], missing }
}

import { availableProjectColumns } from './brief-error'

type ProjectQueryResult = { data: unknown; error: unknown; count?: number | null }

function missingOptionalColumn(error: unknown, optionalColumns: readonly string[]) {
  if (!error || typeof error !== 'object') return null
  const source = error as { code?: unknown; message?: unknown }
  if (String(source.code || '') !== '42703') return null
  const message = typeof source.message === 'string' ? source.message : ''
  const match = message.match(/column\s+"?([\w.]+)"?\s+does not exist/i)
  const column = match?.[1]?.split('.').pop()
  return column && optionalColumns.includes(column) ? column : null
}

export async function queryProjectsWithOptionalColumns(input: {
  requiredColumns: string[]
  optionalColumns: string[]
  hasColumn: (table: string, column: string) => Promise<boolean>
  table: string
  execute: (columns: string[]) => Promise<ProjectQueryResult>
}) {
  const initial = await availableProjectColumns(input.requiredColumns, input.optionalColumns, input.hasColumn, input.table)
  const first = await input.execute(initial.columns)
  const removedColumn = missingOptionalColumn(first.error, input.optionalColumns)

  if (!removedColumn) return { ...first, columns: initial.columns, missing: initial.missing, retried: false as const, removedColumn: null }

  const retryColumns = initial.columns.filter((column) => column !== removedColumn)
  const retry = await input.execute(retryColumns)
  return {
    ...retry,
    columns: retryColumns,
    missing: Array.from(new Set([...initial.missing, removedColumn])),
    retried: true as const,
    removedColumn,
  }
}

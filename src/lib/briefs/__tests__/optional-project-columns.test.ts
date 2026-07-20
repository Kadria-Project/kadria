import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { register } from 'node:module'
import test from 'node:test'

register('../../../components/workspace/__tests__/typescript-resolution.loader.mjs', import.meta.url)
const { queryProjectsWithOptionalColumns } = (await import('../optional-project-columns')) as typeof import('../optional-project-columns')

test('treats a failed or ambiguous column probe as unavailable', async () => {
  const source = await readFile(new URL('../../tenant-context.ts', import.meta.url), 'utf8')
  assert.match(source, /return Boolean\(probe && probe\.error === null\)/)
  assert.match(source, /const exists = columnProbeConfirmsExistence\(probe\)/)
})

test('retries once without the missing optional column', async () => {
  const calls: string[][] = []
  const result = await queryProjectsWithOptionalColumns({
    requiredColumns: ['id'], optionalColumns: ['quote_sent_at', 'accepted_at'], table: 'Projects',
    hasColumn: async () => true,
    execute: async (columns) => {
      calls.push(columns)
      return calls.length === 1 ? { data: null, error: { code: '42703', message: 'column Projects.quote_sent_at does not exist' } } : { data: [{ id: 'p1' }], error: null }
    },
  })
  assert.deepEqual(calls, [['id', 'quote_sent_at', 'accepted_at'], ['id', 'accepted_at']])
  assert.equal(result.error, null); assert.equal(result.retried, true); assert.equal(result.removedColumn, 'quote_sent_at'); assert.deepEqual(result.missing, ['quote_sent_at'])
})

test('does not retry a missing required column or loop after a failed retry', async () => {
  let requiredCalls = 0
  const required = await queryProjectsWithOptionalColumns({
    requiredColumns: ['id'], optionalColumns: ['quote_sent_at'], table: 'Projects', hasColumn: async () => true,
    execute: async () => { requiredCalls += 1; return { data: null, error: { code: '42703', message: 'column Projects.id does not exist' } } },
  })
  assert.equal(requiredCalls, 1); assert.equal(required.retried, false)

  let retryCalls = 0
  const failedRetry = await queryProjectsWithOptionalColumns({
    requiredColumns: ['id'], optionalColumns: ['quote_sent_at'], table: 'Projects', hasColumn: async () => true,
    execute: async () => { retryCalls += 1; return { data: null, error: { code: '42703', message: 'column Projects.quote_sent_at does not exist' } } },
  })
  assert.equal(retryCalls, 2); assert.equal(failedRetry.retried, true); assert.ok(failedRetry.error)
})

test('keeps a failed optional probe out of the first select', async () => {
  const result = await queryProjectsWithOptionalColumns({
    requiredColumns: ['id'], optionalColumns: ['quote_sent_at', 'accepted_at'], table: 'Projects',
    hasColumn: async (_table, column) => column === 'accepted_at',
    execute: async (columns) => ({ data: [], error: null }),
  })
  assert.deepEqual(result.columns, ['id', 'accepted_at']); assert.deepEqual(result.missing, ['quote_sent_at']); assert.equal(result.retried, false)
})

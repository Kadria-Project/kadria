import assert from 'node:assert/strict'
import { register } from 'node:module'
import test from 'node:test'

register('../../../components/workspace/__tests__/typescript-resolution.loader.mjs', import.meta.url)
const { availableProjectColumns, formatBriefError, normalizeBriefError } = (await import('../brief-error')) as typeof import('../brief-error')

test('normalizes a standard Error without object coercion', () => {
  const value = normalizeBriefError(new Error('Build failed'), 'build')
  assert.equal(value.type, 'Error'); assert.equal(value.message, 'Build failed'); assert.equal(value.diagnostic, 'UNEXPECTED_ERROR')
})

test('maps structured Supabase errors to stable diagnostics', () => {
  const value = normalizeBriefError({ name: 'PostgrestError', message: 'column Projects.quote_sent_at does not exist', code: '42703', details: 'schema cache', hint: 'Reload' }, 'projects_query')
  assert.deepEqual(value, { type: 'PostgrestError', message: 'column Projects.quote_sent_at does not exist', code: '42703', details: 'schema cache', hint: 'Reload', diagnostic: 'DATABASE_COLUMN_MISSING' })
  assert.equal(normalizeBriefError({ message: 'denied', code: '42501' }, 'data_load').diagnostic, 'DATABASE_PERMISSION_DENIED')
})

test('handles unknown, raw and null values safely', () => {
  for (const value of [{ clientName: 'forbidden' }, 'raw failure', null]) { const normalized = normalizeBriefError(value, 'build'); assert.equal(normalized.message, 'Unknown structured error'); assert.equal(normalized.diagnostic, 'UNEXPECTED_ERROR'); assert.notEqual(normalized.message, '[object Object]') }
  assert.equal(normalizeBriefError({ message: 'tenant unavailable' }, 'tenant').diagnostic, 'TENANT_RESOLUTION_FAILED')
})

test('formats a single safe line in the required field order', () => {
  const line = formatBriefError({ scope: 'HOME_BRIEF', requestId: 'a91c4e27', stage: 'projects_query', error: { name: 'PostgrestError', code: '42703', message: 'column "x"\nmissing', details: 'd', hint: 'h' } })
  assert.equal(line, '[HOME_BRIEF] requestId=a91c4e27 stage=projects_query diagnostic=DATABASE_COLUMN_MISSING type=PostgrestError code=42703 message="column \\"x\\" missing" details="d" hint="h"')
  assert.equal(line.includes('\n'), false)
})

test('redacts sensitive-looking values and limits messages', () => {
  const line = formatBriefError({ scope: 'TRACKING_BRIEF', requestId: 'f31c993a', stage: 'data_load', error: { message: `contact a@b.fr bearer secret-token ${'x'.repeat(600)}`, code: '42501' } })
  assert.match(line, /\[redacted-email\]/); assert.match(line, /\[redacted-token\]/); assert.equal(line.includes('secret-token'), false); assert.ok(line.length < 800)
})

test('removes unavailable optional columns before the project query', async () => {
  const result = await availableProjectColumns(['id', 'status'], ['quote_sent_at', 'last_follow_up_at'], async (_table, column) => column !== 'last_follow_up_at', 'Projects')
  assert.deepEqual(result.columns, ['id', 'status', 'quote_sent_at']); assert.deepEqual(result.missing, ['last_follow_up_at'])
})

test('integrates requestId without exposing diagnostics in endpoint responses', async () => {
  const { readFile } = await import('node:fs/promises')
  for (const route of ['home-brief', 'tracking-brief']) {
    const source = await readFile(new URL(`../../../../app/api/${route}/route.ts`, import.meta.url), 'utf8')
    assert.match(source, /crypto\.randomUUID\(\)\.slice\(0, 8\)/)
    assert.match(source, /logBriefError\(/)
    assert.match(source, /queryProjectsWithOptionalColumns/)
    assert.match(source, /requestId \}/)
    assert.doesNotMatch(source, /serializeBriefError|String\(error\)/)
  }
})

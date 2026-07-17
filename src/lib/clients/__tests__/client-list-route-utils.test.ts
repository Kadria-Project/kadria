import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

register('./typescript-resolution.loader.mjs', import.meta.url)
const { serializeClientsListError, throwClientsListStage } = await import('../client-list-route-utils') as typeof import('../client-list-route-utils')

test('serializes Supabase object errors without an object string', () => {
  const value = serializeClientsListError({ stage: 'client_events_read', message: 'column ProjectClientEvents.tenant_id does not exist', code: '42703', details: null, hint: 'Use artisan_id' })
  assert.equal(value.stage, 'client_events_read')
  assert.equal(value.code, '42703')
  assert.notEqual(value.message, '[object Object]')
})

test('preserves the failing query stage for the former ProjectClientEvents schema error', () => {
  assert.throws(
    () => throwClientsListStage('client_events_read', { message: 'column ProjectClientEvents.tenant_id does not exist', code: '42703' }),
    (error: unknown) => {
      const value = serializeClientsListError(error)
      return value.stage === 'client_events_read' && value.code === '42703' && value.message.includes('tenant_id')
    },
  )
})

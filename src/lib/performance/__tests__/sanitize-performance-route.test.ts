import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

register('./typescript-resolution.loader.mjs', import.meta.url)

const { sanitizePerformanceRoute } = (await import('../sanitize-performance-route')) as typeof import('../sanitize-performance-route')

test('removes a query string and hash', () => {
  assert.equal(sanitizePerformanceRoute('/dashboard-v2?view=agenda&token=secret#details'), '/dashboard-v2')
})

test('normalizes a project identifier', () => {
  assert.equal(sanitizePerformanceRoute('/dashboard-v2/projet/123456?client=Jane'), '/dashboard-v2/projet/[id]')
})

test('normalizes a client portal token', () => {
  assert.equal(sanitizePerformanceRoute('https://kadria.app/client/projet/secret-token#quote'), '/client/projet/[token]')
})

test('keeps a normal route pathname', () => {
  assert.equal(sanitizePerformanceRoute('/dashboard-v2/agenda'), '/dashboard-v2/agenda')
})

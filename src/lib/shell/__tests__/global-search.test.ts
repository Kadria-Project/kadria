import { describe, expect, it } from 'vitest'
import { cleanGlobalSearchQuery, escapePostgrestLike, globalSearchRoute, isGlobalSearchQueryReady } from '../global-search'

describe('global shell search', () => {
it('cleans and bounds global search queries', () => {
  expect(cleanGlobalSearchQuery('  rénovation\n salle   de bain  ')).toBe('rénovation salle de bain')
  expect(cleanGlobalSearchQuery('a'.repeat(100))).toHaveLength(80)
  expect(isGlobalSearchQueryReady(' a ')).toBe(false)
  expect(isGlobalSearchQueryReady(' ab ')).toBe(true)
})

it('escapes PostgREST wildcard and syntax characters', () => {
  expect(escapePostgrestLike('50%_test,(x)\\')).toBe('50\\%\\_test\\,\\(x\\)\\\\')
})

it('only generates existing product routes', () => {
  expect(globalSearchRoute('project', { id: 'project id' })).toBe('/dashboard-v2/projet/project%20id')
  expect(globalSearchRoute('client', { id: 'client/id' })).toBe('/dashboard-v2/clients/client%2Fid')
  expect(globalSearchRoute('quote', { id: 'quote', projectId: 'project' })).toBe('/dashboard-v2/projet/project/devis/quote')
  expect(globalSearchRoute('appointment', { id: 'appointment' })).toBe('/dashboard-v2/agenda?appointmentId=appointment')
})
})

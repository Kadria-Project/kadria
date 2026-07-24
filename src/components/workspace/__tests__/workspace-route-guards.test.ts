import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { shouldRestoreDashboardNavigation } from '../workspace-route-guards.ts'

test('never treats migrated workspace routes as dashboard restoration candidates', () => {
  for (const pathname of [
    '/dashboard-v2/projet/20000000-0000-4000-8000-000000000001',
    '/dashboard-v2/clients/20000000-0000-4000-8000-000000000001',
    '/parametres/entreprise',
    '/parametres/activite',
    '/parametres/assistants',
    '/parametres/automatisations',
    '/parametres/automatisations/historique',
    '/parametres/connexions',
    '/parametres/notifications',
    '/parametres/acces',
    '/parametres/abonnement',
    '/parametres/equipe',
    '/ressources',
  ]) {
    assert.equal(shouldRestoreDashboardNavigation(true, pathname), false, pathname)
  }
})

test('restores dashboard navigation only at the legacy dashboard entry point', () => {
  assert.equal(shouldRestoreDashboardNavigation(true, '/dashboard-v2'), true)
  assert.equal(shouldRestoreDashboardNavigation(true, '/parametres/entreprise'), false)
  assert.equal(shouldRestoreDashboardNavigation(true, '/ressources'), false)
  assert.equal(shouldRestoreDashboardNavigation(true, '/dashboard-v2/suivi'), false)
  assert.equal(shouldRestoreDashboardNavigation(true, '/dashboard-v2/agenda'), false)
})

test('keeps Agenda on its dedicated route with a valid desktop session', () => {
  assert.equal(shouldRestoreDashboardNavigation(true, '/dashboard-v2/agenda'), false)
})

test('never restores dashboard navigation before the viewport state is resolved', () => {
  assert.equal(shouldRestoreDashboardNavigation(null, '/dashboard-v2'), false)
  assert.equal(shouldRestoreDashboardNavigation(false, '/dashboard-v2'), false)
})

test('/parametres redirects on the server before a legacy page can render', async () => {
  const directory = path.dirname(fileURLToPath(import.meta.url))
  const source = await readFile(path.resolve(directory, '../../../../app/parametres/page.tsx'), 'utf8')

  assert.match(source, /resolveLegacySettingsDestination\('\/parametres'/)
  assert.doesNotMatch(source, /useEffect/)
})

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

test('qualification is administered from the catalog, not Activity', async () => {
  const root = process.cwd()
  const [activity, catalog] = await Promise.all([
    readFile(path.join(root, 'src/components/settings/activity/ActivitySettingsView.tsx'), 'utf8'),
    readFile(path.join(root, 'src/components/settings/catalog/CatalogSettingsView.tsx'), 'utf8'),
  ])
  assert.ok(!activity.includes('title="Qualification des demandes"'))
  assert.ok(catalog.includes('Qualification des prestations'))
  assert.ok(catalog.includes('service_catalog_id'))
  assert.ok(catalog.includes('/api/artisan/service-profiles'))
})

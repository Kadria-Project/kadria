import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const route = (section: string) => new URL(`../../../../app/api/projects/[id]/workspace/${section}/route.ts`, import.meta.url)

test('each workspace section has an isolated server frontier', async () => {
  const sections = ['client', 'documents', 'commercial', 'history', 'engagement']
  const sources = await Promise.all(sections.map(async (section) => readFile(route(section), 'utf8')))
  for (const [index, source] of sources.entries()) {
    assert.match(source, /readProjectWorkspaceSection/)
    assert.match(source, /PermissionError/)
    assert.match(source, /force-dynamic/)
    assert.match(source, new RegExp(`readProjectWorkspaceSection\\('${sections[index]}'`))
  }
})

test('section reads select DTO columns only and keep tenant-aware project authorization', async () => {
  const source = await readFile(new URL('../project-workspace-section-reads.ts', import.meta.url), 'utf8')
  assert.match(source, /authorizeProjectAccess/)
  assert.match(source, /tenant_id/)
  assert.match(source, /client_name, client_first_name, client_phone, client_email, site_address, city/)
  assert.match(source, /select\('id, devis_number, statut, total_ttc, date_emission, quote_sent_at, accepted_at, declined_at'\)/)
  assert.match(source, /select\('id, action, description, created_at'\)/)
  assert.match(source, /\.limit\(20\)/)
  assert.doesNotMatch(source, /select\('\*'\)/)
})

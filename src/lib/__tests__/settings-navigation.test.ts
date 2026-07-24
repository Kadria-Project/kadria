import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { SETTINGS_GROUPS, SETTINGS_SECTIONS, getSettingsSectionsByGroup, isSettingsSectionActive, resolveLegacySettingsDestination } from '../settings-navigation.ts'

test('settings registry has unique canonical sections, routes and complete metadata', () => {
  assert.equal(new Set(SETTINGS_SECTIONS.map((section) => section.id)).size, SETTINGS_SECTIONS.length)
  assert.equal(new Set(SETTINGS_SECTIONS.map((section) => section.href)).size, SETTINGS_SECTIONS.length)
  assert.deepEqual(SETTINGS_GROUPS.map((group) => group.order), [1, 2, 3, 4])
  for (const section of SETTINGS_SECTIONS) {
    assert.ok(SETTINGS_GROUPS.some((group) => group.id === section.group))
    assert.ok(section.description)
    assert.ok(!section.href.includes('?section='))
  }
})

test('settings navigation preserves the intended group and section order', () => {
  assert.deepEqual(SETTINGS_GROUPS.map((group) => group.id), ['company', 'clients', 'organization', 'account'])
  assert.deepEqual(getSettingsSectionsByGroup('company').map((section) => section.id), ['company', 'activity', 'catalog', 'quotes'])
  assert.deepEqual(getSettingsSectionsByGroup('clients').map((section) => section.id), ['assistants', 'automations', 'connections', 'notifications'])
  assert.deepEqual(getSettingsSectionsByGroup('organization').map((section) => section.id), ['team'])
  assert.deepEqual(getSettingsSectionsByGroup('account').map((section) => section.id), ['access', 'billing'])
})

test('legacy settings destinations resolve to canonical routes without loops', () => {
  const destinations: Record<string, string> = { entreprise: '/parametres/entreprise', activite: '/parametres/activite', 'profil-metier': '/parametres/activite', catalogue: '/parametres/catalogue', devis: '/parametres/devis', documents: '/parametres/devis', widget: '/parametres/assistants', assistant: '/parametres/assistants', assistants: '/parametres/assistants', automatisations: '/parametres/automatisations', connexions: '/parametres/connexions', notifications: '/parametres/notifications', equipe: '/parametres/equipe', acces: '/parametres/acces', securite: '/parametres/acces', abonnement: '/parametres/abonnement' }
  assert.equal(resolveLegacySettingsDestination('/parametres'), '/parametres/entreprise')
  assert.equal(resolveLegacySettingsDestination('/parametres/profil-metier'), '/parametres/activite')
  assert.equal(resolveLegacySettingsDestination('/parametres/automatisations/historique'), null)
  for (const [legacySection, destination] of Object.entries(destinations)) assert.equal(resolveLegacySettingsDestination('/parametres', new URLSearchParams({ section: legacySection })), destination)
  assert.equal(resolveLegacySettingsDestination('/parametres', new URLSearchParams({ section: 'WIDGET' })), '/parametres/assistants')
  assert.equal(resolveLegacySettingsDestination('/parametres', new URLSearchParams({ section: 'inconnue', stripe_connect: 'return', ignored: 'value' })), '/parametres/entreprise?stripe_connect=return')
})

test('only the matching canonical section is active, including automation history', () => {
  const automation = SETTINGS_SECTIONS.find((section) => section.id === 'automations')!
  assert.ok(isSettingsSectionActive(automation, '/parametres/automatisations'))
  assert.ok(isSettingsSectionActive(automation, '/parametres/automatisations/historique'))
  assert.ok(!isSettingsSectionActive(automation, '/dashboard-v2/automatisations'))
  assert.equal(SETTINGS_SECTIONS.filter((section) => isSettingsSectionActive(section, '/parametres/automatisations/historique')).length, 1)
})

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory() && !['node_modules', '.next', '.git'].includes(entry.name)) return filesIn(entryPath)
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : []
  }))).flat()
}

test('active application code no longer links to legacy settings query sections', async () => {
  const root = path.resolve(process.cwd())
  const files = [...await filesIn(path.join(root, 'app')), ...await filesIn(path.join(root, 'src'))]
  const offenders = (await Promise.all(files.filter((file) => !file.endsWith('settings-navigation.test.ts')).map(async (file) => ({ file, source: await readFile(file, 'utf8') })))).filter(({ source }) => source.includes('/parametres?section='))
  assert.deepEqual(offenders.map(({ file }) => path.relative(root, file)), [])
})

test('SettingsSection only accepts an explicit registry section id', async () => {
  const source = await readFile(path.join(process.cwd(), 'src/components/settings/SettingsSection.tsx'), 'utf8')
  assert.ok(source.includes('section: SettingsSectionId'))
  assert.ok(!source.includes('item.label === title'))
  assert.ok(!source.includes('title?:'))
})

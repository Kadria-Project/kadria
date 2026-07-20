import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(process.cwd())
const workspace = join(root, 'src/components/projects/workspace')

async function source(file: string) { return readFile(join(workspace, file), 'utf8') }

test('the compact workspace renders only from brief, sections, capabilities and navigation', async () => {
  const [types, component] = await Promise.all([source('ProjectWorkspace.types.ts'), source('ProjectWorkspace.tsx')])
  assert.match(types, /type ProjectWorkspaceProps = \{[\s\S]*brief: ProjectWorkspaceBrief;[\s\S]*sections: ProjectWorkspaceSections;[\s\S]*capabilities: ProjectWorkspaceCapabilities;[\s\S]*navigation: ProjectWorkspaceNavigation;/)
  assert.doesNotMatch(types, /\b(project|latestDevis|appointment|activityItems|photos)\s*:/)
  assert.match(component, /\{ brief, sections, capabilities, navigation \}/)
})

test('migrated render components have no PII or detailed quote and appointment reads', async () => {
  const files = await Promise.all(['ProjectHeader.tsx', 'ProjectContextSidebar.tsx', 'ProjectWorkspaceTabs.tsx'].map(source))
  const rendered = files.join('\n')
  assert.doesNotMatch(rendered, /clientPhone|clientEmail|siteAddress|postalCode|latestDevis|activityItems|brief\.project\.photos/)
  assert.match(rendered, /brief\.evidence\.photosCount/)
})

test('tabs render independent explicit section states and hide unavailable actions', async () => {
  const tabs = await source('ProjectWorkspaceTabs.tsx')
  assert.match(tabs, /section\.status === 'not_loaded'/)
  assert.match(tabs, /section\.status === 'empty'/)
  assert.match(tabs, /section\.status === 'error'/)
  assert.match(tabs, /capability\?\.available &&/)
  assert.doesNotMatch(tabs, /activityItems|latestDevis|brief\.project\.photos/)
})

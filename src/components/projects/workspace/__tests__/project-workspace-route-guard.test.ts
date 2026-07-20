import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(process.cwd())
const route = join(root, 'app/dashboard-v2/projet/[id]/ProjectWorkspaceRoute.tsx')

test('ProjectWorkspaceRoute loads only the compact brief initially and owns independent section endpoints', async () => {
  const source = await readFile(route, 'utf8')
  assert.match(source, /\/api\/projects\/\$\{encodeURIComponent\(id\)\}\/workspace/)
  assert.match(source, /workspace\/\$\{key\}/)
  assert.match(source, /const initialSections/)
  assert.doesNotMatch(source, /Promise\.all\([\s\S]*client[\s\S]*documents[\s\S]*commercial[\s\S]*history[\s\S]*engagement/)
})

test('ProjectWorkspaceRoute has no server or legacy dependency', async () => {
  const source = await readFile(route, 'utf8')
  assert.doesNotMatch(source, /supabase|project-lifecycle|project-situations|project-scoring|action-engine|ArtisanDashboard/)
})

test('the compact workspace no longer mounts the legacy action center', async () => {
  const source = await readFile(join(root, 'src/components/projects/workspace/ProjectWorkspace.tsx'), 'utf8')
  assert.doesNotMatch(source, /ProjectActionCenter|decisionSlot/)
})

test('project workspace components do not import mutation or server services', async () => {
  const source = await readFile(join(root, 'src/components/projects/workspace/ProjectDecisionWorkspace.tsx'), 'utf8')
  assert.doesNotMatch(source, /supabase|project-command-client|project-responsibility|team\/access|\/api\/projects\/.+commands/)
})

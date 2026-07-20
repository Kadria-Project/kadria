import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(process.cwd())
const route = join(root, 'app/dashboard-v2/projet/[id]/ProjectWorkspaceRoute.tsx')

test('ProjectWorkspaceRoute requests only the compact workspace endpoint', async () => {
  const source = await readFile(route, 'utf8')
  assert.match(source, /\/api\/projects\/\$\{encodeURIComponent\(id\)\}\/workspace/)
  assert.doesNotMatch(source, /\/api\/(projects\/(?!\$\{encodeURIComponent\(id\)\}\/workspace)|devis|appointments|events|performance|operations-center)/)
})

test('ProjectWorkspaceRoute has no server or legacy dependency', async () => {
  const source = await readFile(route, 'utf8')
  assert.doesNotMatch(source, /supabase|project-lifecycle|project-situations|project-scoring|action-engine|ArtisanDashboard/)
})

test('the decision zone replaces the former action center instead of duplicating it', async () => {
  const source = await readFile(join(root, 'src/components/projects/workspace/ProjectWorkspace.tsx'), 'utf8')
  assert.match(source, /props\.decisionSlot \|\| <ProjectActionCenter/)
})

test('project workspace components do not import mutation or server services', async () => {
  const source = await readFile(join(root, 'src/components/projects/workspace/ProjectDecisionWorkspace.tsx'), 'utf8')
  assert.doesNotMatch(source, /supabase|project-command-client|project-responsibility|team\/access|\/api\/projects\/.+commands/)
})

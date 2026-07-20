import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(process.cwd())
const tasksPage = join(root, 'app/dashboard-v2/a-faire/page.tsx')

function resolveImport(from: string, specifier: string) {
  const base = specifier.startsWith('@/')
    ? join(root, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(from), specifier)
      : null
  if (!base) return null

  const candidates = extname(base)
    ? [base]
    : ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((suffix) => `${base}${suffix}`)
  return candidates.find((candidate) => existsSync(candidate)) || null
}

async function dependencyGraph(entry: string, visited = new Set<string>()): Promise<Set<string>> {
  const normalized = normalize(entry)
  if (visited.has(normalized)) return visited
  visited.add(normalized)
  const source = await readFile(normalized, 'utf8')
  const imports = source.matchAll(/from\s+['"]([^'"]+)['"]/g)
  for (const match of imports) {
    const candidate = resolveImport(normalized, match[1])
    if (!candidate) continue
    try {
      await readFile(candidate, 'utf8')
      await dependencyGraph(candidate, visited)
    } catch {
      // External packages and unresolved optional paths are outside this guard.
    }
  }
  return visited
}

test('a-faire remains independent from ArtisanDashboard', async () => {
  const graph = await dependencyGraph(tasksPage)
  const artisanDashboard = normalize(join(root, 'src/components/ArtisanDashboard.tsx'))
  assert.equal(graph.has(artisanDashboard), false)
})

test('a-faire requests only the compact Tasks contract', async () => {
  const routeSource = await readFile(join(root, 'app/dashboard-v2/a-faire/TasksWorkspaceRoute.tsx'), 'utf8')
  assert.match(routeSource, /\/api\/operations-center\?scope=tasks/)
  assert.doesNotMatch(routeSource, /\/api\/(projects|events|usage\/monthly)/)

  const operationsRoute = await readFile(join(root, 'app/api/operations-center/route.ts'), 'utf8')
  assert.match(operationsRoute, /const tasksWorkspace = \{[\s\S]*generatedAt:[\s\S]*dataQuality:[\s\S]*workbench:/)
  assert.match(operationsRoute, /searchParams\.get\('scope'\) === 'tasks'/)
})

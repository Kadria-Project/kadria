import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(process.cwd())
const homePage = join(root, 'app/dashboard-v2/page.tsx')

function resolveImport(from: string, specifier: string) {
  const base = specifier.startsWith('@/') ? join(root, specifier.slice(2)) : specifier.startsWith('.') ? resolve(dirname(from), specifier) : null
  if (!base) return null
  const candidates = extname(base) ? [base] : ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((suffix) => `${base}${suffix}`)
  return candidates.find((candidate) => existsSync(candidate)) || null
}

async function dependencyGraph(entry: string, visited = new Set<string>()): Promise<Set<string>> {
  const normalized = normalize(entry)
  if (visited.has(normalized)) return visited
  visited.add(normalized)
  const source = await readFile(normalized, 'utf8')
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const candidate = resolveImport(normalized, match[1])
    if (candidate) await dependencyGraph(candidate, visited)
  }
  return visited
}

test('home remains independent from ArtisanDashboard', async () => {
  const graph = await dependencyGraph(homePage)
  assert.equal(graph.has(normalize(join(root, 'src/components/ArtisanDashboard.tsx'))), false)
})

test('home requests only its dedicated brief contract', async () => {
  const routeSource = await readFile(join(root, 'app/dashboard-v2/HomeWorkspaceRoute.tsx'), 'utf8')
  assert.match(routeSource, /fetch\('\/api\/home-brief/)
  assert.doesNotMatch(routeSource, /operations-center|\/api\/(projects|events|usage\/monthly)/)
})

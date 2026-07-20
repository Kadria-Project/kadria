import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import test from 'node:test'
const root = resolve(process.cwd()); const page = join(root, 'app/dashboard-v2/suivi/page.tsx')
function resolveImport(from: string, specifier: string) { const base = specifier.startsWith('@/') ? join(root, specifier.slice(2)) : specifier.startsWith('.') ? resolve(dirname(from), specifier) : null; if (!base) return null; return (extname(base) ? [base] : ['.ts','.tsx','/index.ts','/index.tsx'].map((suffix) => `${base}${suffix}`)).find(existsSync) || null }
async function graph(entry: string, visited = new Set<string>()): Promise<Set<string>> { const file = normalize(entry); if (visited.has(file)) return visited; visited.add(file); const source = await readFile(file, 'utf8'); for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) { const candidate = resolveImport(file, match[1]); if (candidate) await graph(candidate, visited) } return visited }
test('suivi remains independent from ArtisanDashboard', async () => { assert.equal((await graph(page)).has(normalize(join(root, 'src/components/ArtisanDashboard.tsx'))), false) })
test('suivi requests only its dedicated brief endpoint', async () => { const source = await readFile(join(root, 'app/dashboard-v2/suivi/TrackingWorkspaceRoute.tsx'), 'utf8'); assert.match(source, /\/api\/tracking-brief/); assert.doesNotMatch(source, /operations-center|\/api\/(projects|events|performance)/) })

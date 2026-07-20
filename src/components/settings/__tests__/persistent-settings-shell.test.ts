import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(process.cwd())
const settingsRoot = join(root, 'app/parametres')

async function pagesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return pagesIn(path)
    return entry.name === 'page.tsx' ? [path] : []
  }))
  return nested.flat()
}

test('settings shell is mounted once by the persistent layout', async () => {
  const layout = await readFile(join(settingsRoot, 'layout.tsx'), 'utf8')
  assert.match(layout, /<KadriaAppShell>/)
  assert.match(layout, /<SettingsWorkspaceLayout>/)

  const pages = await pagesIn(settingsRoot)
  for (const page of pages) {
    const source = await readFile(page, 'utf8')
    assert.doesNotMatch(source, /KadriaAppShell/)
  }
})

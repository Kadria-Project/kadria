import { expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

test('desktop navigation keeps Clients at the first level and out of Suivi children', async () => {
  const source = await readFile(join(resolve(process.cwd()), 'src/components/workspace/KadriaSidebar.tsx'), 'utf8')
  expect(source).toContain("{ label: 'Clients', mode: 'clients' as const, icon: Users }")
  expect(source).toContain("const commercialActive = Boolean(pathname?.startsWith('/dashboard-v2/suivi'))")
  expect(source).toContain("{ label: 'Tous les projets', href: '/dashboard-v2/suivi/projets'")
  expect(source).not.toContain("{ label: 'Clients', href: '/dashboard-v2/clients'")
})

test('clients breadcrumb no longer depends on Suivi', async () => {
  const source = await readFile(join(resolve(process.cwd()), 'src/components/workspace/KadriaTopbar.tsx'), 'utf8')
  expect(source).toContain("{ eyebrow: 'Workspace / Clients', title: 'Clients' }")
  expect(source).not.toContain("{ eyebrow: 'Suivi / Clients', title: 'Clients' }")
})

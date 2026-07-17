import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { register } from 'node:module'
import path from 'node:path'
import test from 'node:test'

register(new URL('../../lib/performance/__tests__/typescript-resolution.loader.mjs', import.meta.url), import.meta.url)

const { hasFeature } = (await import('../plans')) as typeof import('../plans')

const workspaceRoot = process.cwd()

test('Agenda is available to every active commercial plan', () => {
  for (const plan of ['essentiel', 'performance', 'entreprise'] as const) {
    assert.equal(hasFeature(plan, 'calendar'), true, `calendar must be enabled for ${plan}`)
  }
})

test('Agenda entry points no longer wrap the planning in a commercial plan gate', async () => {
  const files = [
    'src/components/workspace/DashboardAgendaRoute.tsx',
    'src/components/ArtisanDashboard.tsx',
    'src/components/DemoArtisanDashboard.tsx',
  ]

  for (const file of files) {
    const source = await readFile(path.join(workspaceRoot, file), 'utf8')
    const start = file.endsWith('DashboardAgendaRoute.tsx') ? 0 : source.indexOf('showCalendarWorkspaceDesktop')
    const calendarSection = source.slice(start, start + 800)
    assert.equal(calendarSection.includes('FeatureGate feature="calendar"'), false, `${file} must not lock Agenda`)
  }
})

test('legacy event API keeps authentication but no longer applies calendar plan access', async () => {
  for (const file of ['app/api/events/route.ts', 'app/api/events/[id]/route.ts']) {
    const source = await readFile(path.join(workspaceRoot, file), 'utf8')
    assert.equal(source.includes("requireFeatureAccess('calendar')"), false, `${file} must not return a plan error`)
    assert.ok(source.includes('getSession'), `${file} must retain authentication`)
    assert.ok(source.includes('getAuthorizedEvent') || file.endsWith('events/route.ts'), `${file} must retain tenant ownership checks`)
  }
})

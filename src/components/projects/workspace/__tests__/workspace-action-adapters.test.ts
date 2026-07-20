import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(process.cwd())
const actionRoot = join(root, 'src/components/projects/workspace/actions')
const routeRoot = join(root, 'app/api/projects/[id]')

test('each compact workspace action has an independent adapter and no legacy project payload', async () => {
  const adapters = ['PortalActionAdapter.ts', 'PaymentActionAdapter.ts', 'ReviewActionAdapter.ts', 'SmsActionAdapter.ts', 'PdfActionAdapter.ts']
  const sources = await Promise.all(adapters.map((file) => readFile(join(actionRoot, file), 'utf8')))
  for (const source of sources) {
    assert.match(source, /class \w+ActionAdapter/)
    assert.match(source, /async execute\(\)/)
    assert.doesNotMatch(source, /getProject\(|ProjectWorkspaceLegacyAdapter|clientEmail|clientPhone|select\('\*'\)/)
  }
})

test('workspace capabilities expose execution state without PII and refresh only affected sections', async () => {
  const [types, route] = await Promise.all([
    readFile(join(root, 'src/components/projects/workspace/ProjectWorkspace.types.ts'), 'utf8'),
    readFile(join(root, 'app/dashboard-v2/projet/[id]/ProjectWorkspaceRoute.tsx'), 'utf8'),
  ])
  assert.match(types, /portal: WorkspaceActionCapability/)
  assert.match(types, /payment: WorkspaceActionCapability/)
  assert.match(types, /review: WorkspaceActionCapability/)
  assert.match(types, /sms: WorkspaceActionCapability/)
  assert.match(types, /pdf: WorkspaceActionCapability/)
  assert.match(types, /editProject: WorkspaceActionCapability/)
  assert.doesNotMatch(types, /clientEmail|clientPhone|siteAddress/)
  assert.match(route, /PaymentActionAdapter\(id\), 'commercial'/)
  assert.match(route, /ReviewActionAdapter\(id\), 'history'/)
  assert.match(route, /SmsActionAdapter\(id\), 'history'/)
  assert.doesNotMatch(route, /loadBrief\(\).*executeAction/)
  assert.match(route, /setEditInstance/)
  assert.match(route, /<ProjectEditDialog/)
  assert.match(route, /if \(sections\.client\.status === 'ready'\) await loadSection\('client'\)/)
  assert.match(route, /if \(sections\.history\.status === 'ready'\) await loadSection\('history'\)/)
  assert.doesNotMatch(route, /loadSection\('documents'\).*onSaved|loadSection\('commercial'\).*onSaved|loadSection\('engagement'\).*onSaved/)
  assert.doesNotMatch(route, /ProjectWorkspaceLegacyAdapter/)
})

test('action routes use narrow reads and do not return a complete project', async () => {
  const [payment, sms, pdf] = await Promise.all([
    readFile(join(routeRoot, 'deposit-checkout/route.ts'), 'utf8'),
    readFile(join(routeRoot, 'send-completion-sms/route.ts'), 'utf8'),
    readFile(join(routeRoot, 'pdf/route.ts'), 'utf8'),
  ])
  assert.doesNotMatch(payment, /select: '\*'/)
  assert.doesNotMatch(sms, /select\('\*'\)|project: mapSupabaseProject/)
  assert.doesNotMatch(pdf, /select: '\*'|mapSupabaseProject/)
  assert.match(payment, /requiredPermission: 'projects\.update'/)
  assert.match(sms, /requiredPermission: 'projects\.update'/)
})

test('the project page mounts the compact route directly', async () => {
  const page = await readFile(join(root, 'app/dashboard-v2/projet/[id]/page.tsx'), 'utf8')
  const entrypoint = page.slice(page.indexOf('export default function ProjectDetailPage'), page.indexOf('function ProjectDetail()'))
  assert.match(entrypoint, /<ProjectWorkspaceRoute \/>/)
  assert.doesNotMatch(entrypoint, /ProjectWorkspaceLegacyAdapter/)
})

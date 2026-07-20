import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('workspace endpoint keeps explicit auth, missing-project and server-error responses', async () => {
  const source = await readFile(new URL('../../../../app/api/projects/[id]/workspace/route.ts', import.meta.url), 'utf8')
  assert.match(source, /error instanceof PermissionError/)
  assert.match(source, /status: error\.status/)
  assert.match(source, /status: 404/)
  assert.match(source, /status: 500/)
  assert.match(source, /export const dynamic = 'force-dynamic'/)
})

test('workspace endpoint selects only the sources needed for the decision and validates through the builder', async () => {
  const source = await readFile(new URL('../../../../app/api/projects/[id]/workspace/route.ts', import.meta.url), 'utf8')
  assert.match(source, /select: 'id, status, client_name, client_first_name, project_type, trade, city, budget, desired_timeline, completeness_score, callback_date(?:, photos)?'/)
  assert.doesNotMatch(source, /select: '\*'/)
  assert.match(source, /buildProjectWorkspaceBrief/)
  assert.doesNotMatch(source, /client_email|client_phone|site_address|internal_notes/)
})

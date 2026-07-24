import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { getInstallationState, isWhiteLabelAllowed } from '../assistant-contract.ts'

test('assistant installation does not leave a disabled script action unexplained', () => {
  assert.equal(getInstallationState('artisan-1'), 'ready')
  assert.equal(getInstallationState(''), 'missing-public-id')
  assert.equal(getInstallationState('artisan-1', 'Chargement impossible'), 'error')
})

test('white label availability is restricted to the server-enforced plans', () => {
  assert.equal(isWhiteLabelAllowed('performance'), true)
  assert.equal(isWhiteLabelAllowed('entreprise'), true)
  assert.equal(isWhiteLabelAllowed('essentiel'), false)
})

test('assistant config exposes the session artisan id instead of relying on an optional config field', async () => {
  const source = await readFile(path.join(process.cwd(), 'app/api/artisan/config/route.ts'), 'utf8')
  assert.ok(source.includes('artisanId: session.artisanId'))
})

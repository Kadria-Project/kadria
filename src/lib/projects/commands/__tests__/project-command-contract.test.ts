import assert from 'node:assert/strict'
import { register } from 'node:module'
import test from 'node:test'

register('../../../../components/workspace/__tests__/typescript-resolution.loader.mjs', import.meta.url)

const {
  parseProjectContactCommandInput,
  parseProjectStatusCommandInput,
  projectCommandError,
} = (await import('../project-command-contract')) as typeof import('../project-command-contract')

test('project status command accepts only a compact status payload', () => {
  assert.deepEqual(parseProjectStatusCommandInput({ status: 'QualifiÃ©' }), { status: 'QualifiÃ©' })
  assert.throws(() => parseProjectStatusCommandInput({ status: 'QualifiÃ©', tenantId: 'forged' }))
  assert.throws(() => parseProjectStatusCommandInput({ status: '' }))
})

test('project contact command validates the client payload before the server mutation', () => {
  const input = parseProjectContactCommandInput({
    clientFirstName: 'Ada', clientName: 'Lovelace', clientPhone: '0600000000',
    clientEmail: 'ada@example.test', siteAddress: '1 rue des tests', latitude: 48.8, longitude: 2.3,
  })
  assert.equal(input.clientEmail, 'ada@example.test')
  assert.throws(() => parseProjectContactCommandInput({ ...input, clientEmail: 'not-an-email' }))
  assert.throws(() => parseProjectContactCommandInput({ ...input, tenantId: 'forged' }))
})

test('project command errors are minimal and do not carry mutation data', () => {
  assert.deepEqual(projectCommandError('FORBIDDEN', 'AccÃ¨s refusÃ©.', 'abc12345'), {
    ok: false,
    error: { code: 'FORBIDDEN', message: 'AccÃ¨s refusÃ©.', requestId: 'abc12345' },
  })
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

register('./typescript-resolution.loader.mjs', import.meta.url)
const { CLIENT_ATTENTION_LABELS, buildClientListSearchParams } = await import('../client-list-ui') as typeof import('../client-list-ui')

test('maps the client filters to the server contract without local filtering', () => {
  const params = buildClientListSearchParams('attention', '  Jean Martin ', 1, 'acceptedValue', { status: 'prospect', hasAppointment: true, includeArchived: true })
  assert.equal(params.get('attention'), 'true')
  assert.equal(params.get('q'), 'Jean Martin')
  assert.equal(params.get('sort'), 'acceptedValue')
  assert.equal(params.get('source'), null)
  assert.equal(params.get('status'), 'prospect')
  assert.equal(params.get('hasAppointment'), 'true')
  assert.equal(params.get('includeArchived'), 'true')
})

test('keeps user-facing attention labels free of backend codes', () => {
  assert.equal(CLIENT_ATTENTION_LABELS.possible_duplicate, 'À rapprocher')
  assert.equal(CLIENT_ATTENTION_LABELS.legacy_unlinked, 'Client non lié')
})

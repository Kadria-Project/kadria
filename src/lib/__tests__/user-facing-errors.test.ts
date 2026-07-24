import assert from 'node:assert/strict'
import { register } from 'node:module'
import test from 'node:test'

register('../../components/workspace/__tests__/typescript-resolution.loader.mjs', import.meta.url)

const { toUserFacingErrorMessage } = (await import('../user-facing-errors')) as typeof import('../user-facing-errors')

test('translates provider email failures into an actionable business message', () => {
  assert.equal(
    toUserFacingErrorMessage("Invalid 'to' field: recipient@example", 'automation'),
    'L’adresse e-mail du client semble invalide. Vérifiez-la avant de réessayer.',
  )
})

test('never returns a raw technical message to the interface', () => {
  const raw = 'ECONNRESET: upstream provider rejected request'
  const translated = toUserFacingErrorMessage(raw, 'document')
  assert.equal(translated, 'Le document n’a pas pu être envoyé. Réessayez dans quelques instants.')
  assert.equal(translated.includes('ECONNRESET'), false)
})

test('does not expose a Resend recipient error in automation settings', () => {
  const message = toUserFacingErrorMessage('Invalid `to` field. Please use our testing email address instead of domains like `example.com`.', 'automation')

  assert.equal(message, 'L’adresse e-mail du client semble invalide. Vérifiez-la avant de réessayer.')
  assert.doesNotMatch(message, /resend|example\.com/i)
})

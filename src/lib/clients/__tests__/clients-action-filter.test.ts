import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

register('./typescript-resolution.loader.mjs', import.meta.url)
const { nextAttentionReason, isAttentionReasonDisabled } = await import('../clients-action-filter') as typeof import('../clients-action-filter')

// `nextAttentionReason` is no longer driven by the "Priorités du jour" quick
// counters (those are purely informational). It is still reached from an
// action card's CTA fallback (e.g. `possible_duplicate`) and its pure
// toggle/reset semantics remain covered here.

test('clicking "Modifications demandées" from no filter selects appointment_change_requested', () => {
  assert.equal(nextAttentionReason(null, 'appointment_change_requested'), 'appointment_change_requested')
})

test('clicking "Rendez-vous à confirmer" from no filter selects appointment_awaiting_confirmation', () => {
  assert.equal(nextAttentionReason(null, 'appointment_awaiting_confirmation'), 'appointment_awaiting_confirmation')
})

test('clicking "Devis sans réponse" from no filter selects quote_pending_too_long', () => {
  assert.equal(nextAttentionReason(null, 'quote_pending_too_long'), 'quote_pending_too_long')
})

test('clicking "À rappeler" from no filter selects project_to_call_back', () => {
  assert.equal(nextAttentionReason(null, 'project_to_call_back'), 'project_to_call_back')
})

test('clicking "À rapprocher" from no filter selects possible_duplicate', () => {
  assert.equal(nextAttentionReason(null, 'possible_duplicate'), 'possible_duplicate')
})

test('a second click on the active category clears the filter (toggle off)', () => {
  const afterFirstClick = nextAttentionReason(null, 'quote_pending_too_long')
  assert.equal(afterFirstClick, 'quote_pending_too_long')
  const afterSecondClick = nextAttentionReason(afterFirstClick, 'quote_pending_too_long')
  assert.equal(afterSecondClick, null)
})

test('clicking a different category while one is active replaces it, it does not toggle off', () => {
  const active = nextAttentionReason(null, 'appointment_change_requested')
  const replaced = nextAttentionReason(active, 'possible_duplicate')
  assert.equal(replaced, 'possible_duplicate')
})

test('a category with a zero count is disabled and never selectable', () => {
  assert.equal(isAttentionReasonDisabled(0), true)
})

test('a category with a positive count is enabled', () => {
  assert.equal(isAttentionReasonDisabled(1), false)
  assert.equal(isAttentionReasonDisabled(42), false)
})

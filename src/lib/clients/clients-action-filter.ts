import type { ClientActionReason } from './clients-action-types'

/**
 * Pure transition for the "Priorités du jour" attention-reason filter on
 * `ClientsV2List`. The "Priorités du jour" quick counters are purely
 * informational and never call this — it is only reached from an action
 * card's CTA when the action has no direct destination (e.g.
 * `possible_duplicate`). The "Toutes les actions" panel has its own
 * independent local category filter and does not use this either.
 */
export function nextAttentionReason(
  current: ClientActionReason | null,
  clicked: ClientActionReason,
): ClientActionReason | null {
  return current === clicked ? null : clicked
}

/** A category with a zero count is rendered visually muted in the quick counters. */
export function isAttentionReasonDisabled(count: number): boolean {
  return count <= 0
}

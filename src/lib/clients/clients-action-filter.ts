import type { ClientActionReason } from './clients-action-types'

/**
 * Pure transition for the "Priorités du jour" attention-reason filter.
 *
 * Shared by the Action Center counters and the "Toutes les actions" panel so
 * both drive the exact same single source of truth on `ClientsV2List`
 * (`activeAttentionReason`): clicking the active category clears the filter
 * (second click = reset), clicking a different category replaces it.
 */
export function nextAttentionReason(
  current: ClientActionReason | null,
  clicked: ClientActionReason,
): ClientActionReason | null {
  return current === clicked ? null : clicked
}

/** A category with a zero count must never be clickable / trigger a fetch. */
export function isAttentionReasonDisabled(count: number): boolean {
  return count <= 0
}

const MAX_REQUEST_ID_LENGTH = 120

let fallbackSequence = 0

export type AppointmentMutationRequest = {
  requestId?: string | null
}

export type AppointmentMutationResponse = {
  success: boolean
  error?: string
  appointmentUpdated?: boolean
  reconfirmationRequired?: boolean
  emailSent?: boolean
  idempotent?: boolean
  warningCode?: string
  warning?: string
  requestId?: string | null
}

export function createAppointmentMutationRequestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  // All supported browsers provide randomUUID. This deterministic fallback only
  // covers older environments without relying on Math.random alone.
  fallbackSequence += 1
  return `appointment-${Date.now().toString(36)}-${fallbackSequence.toString(36)}`
}

export function normalizeAppointmentMutationRequestId(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().slice(0, MAX_REQUEST_ID_LENGTH)
  return normalized || null
}

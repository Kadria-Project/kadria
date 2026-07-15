export const APPOINTMENT_CONFIRMATION_STATUSES = ['pending', 'confirmed', 'change_requested', 'cancelled'] as const
export const APPOINTMENT_CONFIRMATION_SOURCES = ['artisan', 'client', 'system', 'external_calendar'] as const

export type AppointmentConfirmationStatus = typeof APPOINTMENT_CONFIRMATION_STATUSES[number]
export type AppointmentConfirmationSource = typeof APPOINTMENT_CONFIRMATION_SOURCES[number]

export const CONFIRMATION_STATUS_LABELS: Record<AppointmentConfirmationStatus, string> = {
  pending: 'À confirmer',
  confirmed: 'Confirmé',
  change_requested: 'Changement demandé',
  cancelled: 'Annulé',
}

export function isConfirmationStatus(value: unknown): value is AppointmentConfirmationStatus {
  return typeof value === 'string' && APPOINTMENT_CONFIRMATION_STATUSES.includes(value as AppointmentConfirmationStatus)
}

export function isConfirmationSource(value: unknown): value is AppointmentConfirmationSource {
  return typeof value === 'string' && APPOINTMENT_CONFIRMATION_SOURCES.includes(value as AppointmentConfirmationSource)
}

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

export function confirmationStatusLabel(
  status: AppointmentConfirmationStatus | string | null | undefined,
  source: AppointmentConfirmationSource | string | null | undefined,
) {
  if (status === 'cancelled') {
    if (source === 'client') return 'Refusé par le client'
    if (source === 'artisan') return 'Annulé par l’artisan'
  }

  return isConfirmationStatus(status) ? CONFIRMATION_STATUS_LABELS[status] : 'À confirmer'
}

export function isConfirmationStatus(value: unknown): value is AppointmentConfirmationStatus {
  return typeof value === 'string' && APPOINTMENT_CONFIRMATION_STATUSES.includes(value as AppointmentConfirmationStatus)
}

export function isConfirmationSource(value: unknown): value is AppointmentConfirmationSource {
  return typeof value === 'string' && APPOINTMENT_CONFIRMATION_SOURCES.includes(value as AppointmentConfirmationSource)
}

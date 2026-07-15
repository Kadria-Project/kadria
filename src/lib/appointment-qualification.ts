export const APPOINTMENT_QUALIFICATION_STATUSES = ['completed', 'client_absent', 'reschedule', 'cancelled'] as const
export const APPOINTMENT_QUALIFICATION_OUTCOMES = [
  'quote_to_prepare',
  'missing_information',
  'intervention_confirmed',
  'client_decision_pending',
  'project_not_retained',
  'no_action_required',
] as const

export type AppointmentQualificationStatus = typeof APPOINTMENT_QUALIFICATION_STATUSES[number]
export type AppointmentQualificationOutcome = typeof APPOINTMENT_QUALIFICATION_OUTCOMES[number]

export type AppointmentQualification = {
  status: AppointmentQualificationStatus
  outcome: AppointmentQualificationOutcome | null
  note: string | null
  nextAction: string | null
  qualifiedAt: string | null
  qualifiedBy: string | null
  version: number
}

export const QUALIFICATION_STATUS_LABELS: Record<AppointmentQualificationStatus, string> = {
  completed: 'Réalisé',
  client_absent: 'Client absent',
  reschedule: 'À replanifier',
  cancelled: 'Annulé',
}

export const QUALIFICATION_OUTCOME_LABELS: Record<AppointmentQualificationOutcome, string> = {
  quote_to_prepare: 'Préparer le devis',
  missing_information: 'Demander les informations manquantes',
  intervention_confirmed: "Planifier l'intervention",
  client_decision_pending: 'Prévoir une relance',
  project_not_retained: 'Projet non retenu',
  no_action_required: 'Aucune action nécessaire',
}

export function isQualificationStatus(value: unknown): value is AppointmentQualificationStatus {
  return typeof value === 'string' && APPOINTMENT_QUALIFICATION_STATUSES.includes(value as AppointmentQualificationStatus)
}

export function isQualificationOutcome(value: unknown): value is AppointmentQualificationOutcome {
  return typeof value === 'string' && APPOINTMENT_QUALIFICATION_OUTCOMES.includes(value as AppointmentQualificationOutcome)
}

export function qualificationNextAction(status: AppointmentQualificationStatus, outcome: AppointmentQualificationOutcome | null) {
  if (status === 'reschedule' || status === 'client_absent') return 'Replanifier le rendez-vous'
  if (!outcome) return null
  return QUALIFICATION_OUTCOME_LABELS[outcome]
}

export function qualificationActivityTitle(status: AppointmentQualificationStatus) {
  return {
    completed: 'Rendez-vous réalisé',
    client_absent: 'Client absent au rendez-vous',
    reschedule: 'Rendez-vous à replanifier',
    cancelled: 'Rendez-vous annulé',
  }[status]
}

type StatusValue = string | null | undefined

const APPOINTMENT_STATUS: Record<string, string> = {
  confirmed: 'Confirmé', pending: 'À confirmer', cancelled: 'Annulé', scheduled: 'Planifié', completed: 'Terminé', change_requested: 'Changement demandé', qualified: 'Qualifié', rejected: 'Refusé',
}
const PROJECT_STATUS: Record<string, string> = {
  draft: 'Brouillon', pending: 'En attente', qualified: 'Qualifié', quote_sent: 'Devis envoyé', accepted: 'Accepté', won: 'Gagné', lost: 'Perdu', completed: 'Terminé', archived: 'Archivé', scheduled: 'Planifié', confirmed: 'Confirmé', cancelled: 'Annulé',
}
const QUOTE_STATUS: Record<string, string> = {
  draft: 'Brouillon', pending: 'En attente', sent: 'Envoyé', quote_sent: 'Devis envoyé', accepted: 'Accepté', rejected: 'Refusé', cancelled: 'Annulé', expired: 'Expiré', completed: 'Terminé',
}
const AUTOMATION_STATUS: Record<string, string> = {
  pending: 'En attente', prepared: 'À valider', executing: 'En cours', succeeded: 'Réussie', failed: 'À revoir', ignored: 'Ignorée', completed: 'Terminée',
}

function format(value: StatusValue, registry: Record<string, string>) {
  const key = String(value || '').trim().toLowerCase()
  return registry[key] || 'Statut indisponible'
}

export const formatAppointmentStatus = (value: StatusValue) => format(value, APPOINTMENT_STATUS)
export const formatProjectStatus = (value: StatusValue) => format(value, PROJECT_STATUS)
export const formatQuoteStatus = (value: StatusValue) => format(value, QUOTE_STATUS)
export const formatAutomationStatus = (value: StatusValue) => format(value, AUTOMATION_STATUS)

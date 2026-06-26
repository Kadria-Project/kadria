// Logique de décision pure pour la suggestion de prise de rendez-vous dans
// l'assistant chat prospect (V1 — "préparer l'architecture" uniquement,
// cf. cahier des charges). Aucun wiring UI n'est fait dans
// app/api/chat/route.ts ni app/projet/page.tsx pour ce hook : le risque de
// casser le flux de qualification/sauvegarde existant n'est pas jugé
// nécessaire à prendre pour la V1. Ce helper est prêt à être appelé depuis
// le chat plus tard (ex: après calcul du completenessScore côté serveur),
// sans dépendance supplémentaire.

export const APPOINTMENT_SUGGESTION_THRESHOLD = 70

export interface AppointmentSuggestionInput {
  completenessScore: number
  calendarConnected: boolean
}

/**
 * Décide si l'assistant chat devrait proposer une prise de rendez-vous au
 * prospect. Règle V1 : le dossier doit être suffisamment qualifié
 * (completenessScore >= 70) ET l'artisan doit avoir un agenda Google
 * Calendar connecté (sinon proposer un RDV n'aurait pas de créneaux à
 * offrir, cf. règle stricte de /api/appointments/availability).
 */
export function shouldSuggestAppointmentBooking(input: AppointmentSuggestionInput): boolean {
  return input.calendarConnected && input.completenessScore >= APPOINTMENT_SUGGESTION_THRESHOLD
}

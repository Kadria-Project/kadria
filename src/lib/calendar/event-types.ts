// Les 10 valeurs du CHECK constraint `project_appointments_event_type_check`
// posé par la migration 20260717_team_scheduling_foundation.sql. Fichier
// partagé client/serveur (pas de 'server-only') : utilisé à la fois par les
// endpoints API (validation) et par le formulaire de création rapide du
// planning d'équipe.
//
// Phase 1 (ce lot) n'expose dans l'UI que les types "opérationnels"
// (EVENT_TYPES_UI). Les indisponibilités (time_off, training, sick_leave)
// restent des valeurs valides en base pour préparer les phases 2/3, mais
// n'ont pas d'UI de création dédiée dans ce lot (hors scope explicite).
export const EVENT_TYPES = [
  'appointment',
  'intervention',
  'site_visit',
  'estimate',
  'administrative',
  'time_off',
  'training',
  'sick_leave',
  'travel',
  'other',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value)
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  appointment: 'Rendez-vous',
  intervention: 'Intervention',
  site_visit: 'Visite de chantier',
  estimate: 'Devis / Estimation',
  administrative: 'Administratif',
  time_off: 'Absence',
  training: 'Formation',
  sick_leave: 'Arrêt maladie',
  travel: 'Déplacement',
  other: 'Autre',
}

// Types proposés dans le formulaire de création rapide (Phase 1).
export const EVENT_TYPES_UI: EventType[] = [
  'appointment',
  'intervention',
  'site_visit',
  'estimate',
  'administrative',
  'travel',
  'other',
]

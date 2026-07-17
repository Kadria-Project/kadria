import type { ClientActionPriority, ClientActionReason } from './clients-action-types'

/**
 * Single source of truth for the CRM action center: priority hierarchy, user
 * labels, descriptions, tone and recommended next action per attention
 * reason. Keep every user-facing string here — never expose a technical
 * `attentionReason` value in the UI.
 */

export type ClientActionTone = 'critical' | 'high' | 'medium' | 'low'

export type ClientActionConfigEntry = {
  reason: ClientActionReason
  /** Lower number = higher priority in the ordering defined by product (§4). */
  rank: number
  label: string
  categoryLabel: string
  basePriority: ClientActionPriority
  icon: 'calendar-change' | 'calendar-check' | 'quote' | 'phone' | 'clock' | 'refresh' | 'users' | 'link-off'
  ctaLabel: string
  buildDescription: (input: { clientName: string; dueLabel: string | null }) => string
  /** Whether this reason appears as a quick counter chip (§7). */
  isQuickCounter: boolean
}

export const CLIENT_ACTION_PRIORITY_ORDER: ClientActionReason[] = [
  'appointment_change_requested',
  'project_to_call_back',
  'appointment_awaiting_confirmation',
  'quote_pending_too_long',
  'possible_duplicate',
  'stale_active_project',
  'client_follow_up',
  'legacy_unlinked',
]

export const CLIENT_ACTION_CONFIG: Record<ClientActionReason, ClientActionConfigEntry> = {
  appointment_change_requested: {
    reason: 'appointment_change_requested',
    rank: 1,
    label: 'Modification demandée',
    categoryLabel: 'Modifications demandées',
    basePriority: 'critical',
    icon: 'calendar-change',
    ctaLabel: 'Traiter la demande',
    buildDescription: ({ clientName, dueLabel }) => `${clientName} a demandé une modification de rendez-vous${dueLabel ? ` — ${dueLabel}` : ''}.`,
    isQuickCounter: true,
  },
  project_to_call_back: {
    reason: 'project_to_call_back',
    rank: 2,
    label: 'À rappeler',
    categoryLabel: 'À rappeler',
    basePriority: 'high',
    icon: 'phone',
    ctaLabel: 'Ouvrir le dossier',
    buildDescription: ({ clientName }) => `${clientName} est marqué à rappeler.`,
    isQuickCounter: true,
  },
  appointment_awaiting_confirmation: {
    reason: 'appointment_awaiting_confirmation',
    rank: 3,
    label: 'Rendez-vous à confirmer',
    categoryLabel: 'Rendez-vous à confirmer',
    basePriority: 'medium',
    icon: 'calendar-check',
    ctaLabel: 'Confirmer le rendez-vous',
    buildDescription: ({ clientName, dueLabel }) => `Rendez-vous avec ${clientName} en attente de confirmation${dueLabel ? ` — ${dueLabel}` : ''}.`,
    isQuickCounter: true,
  },
  quote_pending_too_long: {
    reason: 'quote_pending_too_long',
    rank: 4,
    label: 'Devis sans réponse',
    categoryLabel: 'Devis sans réponse',
    basePriority: 'high',
    icon: 'quote',
    ctaLabel: 'Relancer le client',
    buildDescription: ({ clientName, dueLabel }) => `Devis envoyé à ${clientName}${dueLabel ? `, ${dueLabel}` : ''}.`,
    isQuickCounter: true,
  },
  possible_duplicate: {
    reason: 'possible_duplicate',
    rank: 5,
    label: 'À rapprocher',
    categoryLabel: 'À rapprocher',
    basePriority: 'high',
    icon: 'users',
    ctaLabel: 'Examiner le contact',
    buildDescription: ({ clientName }) => `${clientName} pourrait correspondre à un client déjà existant.`,
    isQuickCounter: true,
  },
  stale_active_project: {
    reason: 'stale_active_project',
    rank: 6,
    label: 'Dossier sans activité',
    categoryLabel: 'Dossiers sans activité',
    basePriority: 'medium',
    icon: 'clock',
    ctaLabel: 'Reprendre le suivi',
    buildDescription: ({ clientName, dueLabel }) => `Le dossier de ${clientName} est actif mais sans activité récente${dueLabel ? ` — ${dueLabel}` : ''}.`,
    isQuickCounter: false,
  },
  client_follow_up: {
    reason: 'client_follow_up',
    rank: 7,
    label: 'Relance recommandée',
    categoryLabel: 'Relances recommandées',
    basePriority: 'medium',
    icon: 'refresh',
    ctaLabel: 'Préparer la relance',
    buildDescription: ({ clientName }) => `Une relance est recommandée pour ${clientName}.`,
    isQuickCounter: false,
  },
  legacy_unlinked: {
    reason: 'legacy_unlinked',
    rank: 8,
    label: 'Contact non lié',
    categoryLabel: 'Contacts non liés',
    basePriority: 'low',
    icon: 'link-off',
    ctaLabel: 'Ouvrir le dossier',
    buildDescription: ({ clientName }) => `${clientName} provient d’un ancien dossier et n’est pas encore rattaché à une fiche client.`,
    isQuickCounter: false,
  },
}

export const CLIENT_ACTION_QUICK_COUNTERS: ClientActionReason[] = CLIENT_ACTION_PRIORITY_ORDER.filter(
  (reason) => CLIENT_ACTION_CONFIG[reason].isQuickCounter,
)

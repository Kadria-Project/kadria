// Source de vérité unique pour la lecture des statuts devis/projet à travers
// le dashboard, la fiche projet, l'action engine et les relances. N'invente
// aucune nouvelle valeur de statut : se contente de lire/normaliser celles qui
// existent déjà (Devis.statut, Devis.sent/accepted/declined, Project.status).
import { getQuoteFollowupState, type QuoteFollowupInput } from '@/src/lib/quote-followup'

export type QuoteLifecycleState = 'draft' | 'sent' | 'accepted' | 'declined' | 'unknown'

// Accepte indifféremment les objets camelCase (SupabaseDevis) et les réponses
// API déjà sérialisées en snake_case (DevisListItem), comme QuoteFollowupInput.
export interface QuoteLifecycleInput extends QuoteFollowupInput {}

export function isQuoteAccepted(devis: QuoteLifecycleInput | null | undefined): boolean {
  if (!devis) return false
  return Boolean(devis.accepted) || Boolean(devis.acceptedAt ?? devis.accepted_at)
}

export function isQuoteDeclined(devis: QuoteLifecycleInput | null | undefined): boolean {
  if (!devis) return false
  return Boolean(devis.declined) || Boolean(devis.declinedAt ?? devis.declined_at) || Boolean(devis.declineReason ?? devis.decline_reason)
}

export function isQuoteSent(devis: QuoteLifecycleInput | null | undefined): boolean {
  if (!devis) return false
  const statut = (devis.statut || '').toLowerCase().trim()
  return Boolean(devis.sent) || statut.startsWith('envoy') || Boolean(devis.quoteSentAt ?? devis.quote_sent_at)
}

export function getQuoteLifecycleState(devis: QuoteLifecycleInput | null | undefined): QuoteLifecycleState {
  if (!devis) return 'unknown'
  if (isQuoteAccepted(devis)) return 'accepted'
  if (isQuoteDeclined(devis)) return 'declined'
  if (isQuoteSent(devis)) return 'sent'
  return 'draft'
}

// Délègue à la logique déjà éprouvée de quote-followup.ts plutôt que de
// dupliquer les règles d'éligibilité (statut clos, expiration, relances
// désactivées, etc.).
export function canFollowUpQuote(devis: QuoteLifecycleInput | null | undefined): boolean {
  if (!devis) return false
  return getQuoteFollowupState(devis).canFollowUp
}

export function shouldShowQuoteReminder(devis: QuoteLifecycleInput | null | undefined): boolean {
  return getQuoteLifecycleState(devis) === 'sent' && canFollowUpQuote(devis)
}

export type ProjectCommercialState = 'won' | 'lost' | 'quote_sent' | 'open'

export interface ProjectCommercialInput {
  status?: string | null
}

export function getProjectCommercialState(project: ProjectCommercialInput | null | undefined): ProjectCommercialState {
  const status = (project?.status || '').trim()
  if (status === 'Gagné') return 'won'
  if (status === 'Perdu') return 'lost'
  if (status.startsWith('Devis')) return 'quote_sent'
  return 'open'
}

// Un dossier gagné ou perdu est clos : plus de relance automatique, plus
// d'affichage en opportunité chaude/à traiter dans le dashboard.
export function isProjectClosed(project: ProjectCommercialInput | null | undefined): boolean {
  const state = getProjectCommercialState(project)
  return state === 'won' || state === 'lost'
}

export function shouldShowAsPriorityAction(
  project: ProjectCommercialInput | null | undefined,
  devis?: QuoteLifecycleInput | null
): boolean {
  if (isProjectClosed(project)) return false
  if (isQuoteAccepted(devis) || isQuoteDeclined(devis)) return false
  return true
}

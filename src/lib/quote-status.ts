// Source de vérité unique pour la lecture des statuts devis/projet à travers
// le dashboard, la fiche projet, l'action engine et les relances. N'invente
// aucune nouvelle valeur de statut : se contente de lire/normaliser celles qui
// existent déjà (Devis.statut, Devis.sent/accepted/declined, Project.status).
import { getQuoteFollowupState, type QuoteFollowupInput } from '@/src/lib/quote-followup'
import type { NextAction } from '@/src/lib/action-engine'

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

// Source unique de la décision commerciale affichée sur la fiche projet.
// Tous les blocs (Action recommandée, cartes rapides, Analyse Kadria,
// "Moment idéal pour relancer", Gestion du dossier, Suivi commercial)
// doivent lire ce même état plutôt que recalculer chacun leur propre
// condition de relance — c'est ce qui produisait des contradictions
// (ex : un bloc dit "attendre" pendant qu'un autre propose "relancer").
//
// canFollowUpQuote combine volontairement DEUX gardes :
//  - nextAction.actionType === 'follow_up_quote' : le délai de grâce
//    48h de l'Action Engine (jamais de relance immédiate après envoi) ;
//  - canFollowUpQuote(devis) : les règles d'éligibilité déjà éprouvées
//    de quote-followup.ts (clos, expiré, relances désactivées, quota
//    de relances atteint...).
// Les deux doivent être vraies pour qu'un bouton de relance soit montré —
// ça évite toute divergence sans modifier quote-followup.ts.
export type ProjectDecisionStateKey =
  | 'no_quote'
  | 'quote_draft'
  | 'quote_recently_sent'
  | 'quote_followup_available'
  | 'quote_accepted'
  | 'quote_declined'
  | 'won'
  | 'lost'

export interface ProjectDecision {
  state: ProjectDecisionStateKey
  label: string
  primaryActionLabel: string
  primaryActionType: NextAction['actionType']
  canFollowUpQuote: boolean
  shouldShowFollowupBlock: boolean
  followUpAvailableAt?: string
  priority: 'none' | 'low' | 'normal' | 'high'
}

function mapPriority(nextAction: NextAction): ProjectDecision['priority'] {
  if (nextAction.priority === 'critical' || nextAction.priority === 'high') return 'high'
  if (nextAction.priority === 'medium') return 'normal'
  if (nextAction.urgency === 'none') return 'none'
  return 'low'
}

export function getProjectDecisionState(
  project: ProjectCommercialInput | null | undefined,
  devis: QuoteLifecycleInput | null | undefined,
  nextAction: NextAction,
): ProjectDecision {
  const priority = mapPriority(nextAction)
  const base = {
    primaryActionLabel: nextAction.title,
    primaryActionType: nextAction.actionType,
  }

  if (project?.status === 'Perdu') {
    return { ...base, state: 'lost', label: 'Dossier perdu', canFollowUpQuote: false, shouldShowFollowupBlock: false, priority: 'none' }
  }

  if (project?.status === 'Gagné' && isQuoteAccepted(devis)) {
    return { ...base, state: 'won', label: 'Dossier gagné', canFollowUpQuote: false, shouldShowFollowupBlock: false, priority: 'none' }
  }

  if (isQuoteDeclined(devis)) {
    return { ...base, state: 'quote_declined', label: 'Devis refusé', canFollowUpQuote: false, shouldShowFollowupBlock: false, priority: 'low' }
  }

  if (isQuoteAccepted(devis)) {
    return { ...base, state: 'quote_accepted', label: 'Devis accepté', canFollowUpQuote: false, shouldShowFollowupBlock: false, priority }
  }

  if (!devis || !isQuoteSent(devis)) {
    return {
      ...base,
      state: devis ? 'quote_draft' : 'no_quote',
      label: devis ? 'Devis en préparation' : 'Pas de devis',
      canFollowUpQuote: false,
      shouldShowFollowupBlock: false,
      priority,
    }
  }

  const followUpAllowed = nextAction.actionType === 'follow_up_quote' && canFollowUpQuote(devis)

  if (followUpAllowed) {
    return {
      ...base,
      state: 'quote_followup_available',
      label: 'Devis envoyé — relance recommandée',
      canFollowUpQuote: true,
      shouldShowFollowupBlock: true,
      priority,
    }
  }

  return {
    ...base,
    state: 'quote_recently_sent',
    label: 'Devis envoyé — en attente de réponse client',
    canFollowUpQuote: false,
    shouldShowFollowupBlock: false,
    followUpAvailableAt: nextAction.followUpAvailableAt,
    priority,
  }
}

import { computeNextAction, type ActionEngineProjectInput, type NextAction } from '@/src/lib/action-engine'
import { normalizePublicDepositStatus, normalizeDepositStatus } from '@/src/lib/deposit'
import { canFollowUpQuote, isQuoteAccepted, isQuoteDeclined, isQuoteSent, type QuoteLifecycleInput } from '@/src/lib/quote-status'

export const PROJECT_STATUS_NORMALIZATION: Record<string, string> = {
  'A rappeler': 'À rappeler',
  Qualifie: 'Qualifié',
  'Devis envoye': 'Devis envoyé',
  'Devis accepte': 'Devis accepté',
  'Acompte demande': 'Acompte demandé',
  'Acompte paye': 'Acompte payé',
  'Realisation du projet': 'Réalisation du projet',
  Gagne: 'Gagné',
}

export const PROJECT_STATUS_OPTIONS = [
  'Nouveau',
  'À rappeler',
  'Qualifié',
  'En cours',
  'Devis envoyé',
  'Devis accepté',
  'Acompte demandé',
  'Acompte payé',
  'Réalisation du projet',
  'Gagné',
  'Perdu',
] as const

export type ProjectStatusValue = (typeof PROJECT_STATUS_OPTIONS)[number]
export type ProjectLifecycleStage =
  | 'new'
  | 'callback'
  | 'qualified'
  | 'in_progress'
  | 'quote_sent'
  | 'quote_accepted'
  | 'deposit_requested'
  | 'deposit_paid'
  | 'execution'
  | 'won'
  | 'lost'

export type ProjectLifecycleActionKey =
  | 'reply_client'
  | 'complete_project'
  | 'qualify_project'
  | 'schedule_sales_appointment'
  | 'prepare_quote'
  | 'send_quote'
  | 'follow_up_quote'
  | 'track_quote'
  | 'request_deposit'
  | 'follow_up_deposit'
  | 'schedule_worksite'
  | 'move_to_execution'
  | 'close_project'
  | 'view_summary'
  | 'view_reason'
  | 'monitor'

export type ProjectLifecycleSecondaryAction =
  | 'mark_won'
  | 'mark_lost'
  | 'move_to_execution'
  | 'schedule_sales_appointment'
  | 'schedule_worksite'
  | 'follow_up_quote'
  | 'follow_up_deposit'

export interface ProjectLifecycleInput {
  status?: string | null
  completenessScore?: number | null
  maturityScore?: number | null
  clientUpdateCount?: number | null
  unreadClientActivityCount?: number | null
  clientLastUpdateAt?: string | null
  callbackDate?: string | null
  desiredTimeline?: string | null
  quoteSentAt?: string | null
  acceptedAt?: string | null
  depositStatus?: string | null
  depositAmount?: number | null
  depositPaymentUrl?: string | null
  depositPaidAt?: string | null
  appointment?: { start?: string | null } | null
  latestDevis?: QuoteLifecycleInput | null
  actionEngineInput?: ActionEngineProjectInput | null
}

export interface ProjectLifecycleRecommendedAction {
  key: ProjectLifecycleActionKey
  title: string
  ctaLabel: string
  meta: string
  priority: 'none' | 'low' | 'normal' | 'high'
  nextAction: NextAction
}

export interface ProjectLifecycleResult {
  normalizedStatus: ProjectStatusValue
  stage: ProjectLifecycleStage
  displayStatus: string
  decisionLabel: string
  recommendedAction: ProjectLifecycleRecommendedAction
  secondaryActions: ProjectLifecycleSecondaryAction[]
  allowMarkWon: boolean
  allowMarkLost: boolean
  shouldUseWorksiteWording: boolean
  publicClientStatus: string
}

function getDefaultActionEngineInput(input: ProjectLifecycleInput): ActionEngineProjectInput {
  return input.actionEngineInput || {
    status: input.status || undefined,
    completenessScore: Number(input.completenessScore || 0),
    desiredTimeline: input.desiredTimeline || undefined,
    latestDevis: input.latestDevis
      ? {
          sent: isQuoteSent(input.latestDevis),
          accepted: isQuoteAccepted(input.latestDevis),
          declined: isQuoteDeclined(input.latestDevis),
          sentAt: input.latestDevis.quoteSentAt ?? input.latestDevis.quote_sent_at ?? input.quoteSentAt ?? null,
          declineReason: input.latestDevis.declineReason ?? input.latestDevis.decline_reason ?? null,
        }
      : undefined,
    appointment: input.appointment?.start ? { start: input.appointment.start } : null,
  }
}

export function normalizeProjectStatus(status?: string | null): ProjectStatusValue {
  const trimmed = String(status || '').trim()
  const normalized = PROJECT_STATUS_NORMALIZATION[trimmed] || trimmed
  if ((PROJECT_STATUS_OPTIONS as readonly string[]).includes(normalized)) return normalized as ProjectStatusValue
  return 'Nouveau'
}

export function isProjectClosedStatus(status?: string | null): boolean {
  const normalized = normalizeProjectStatus(status)
  return normalized === 'Gagné' || normalized === 'Perdu'
}

export function resolveProjectLifecycleStage(input: ProjectLifecycleInput): ProjectLifecycleStage {
  const normalizedStatus = normalizeProjectStatus(input.status)
  const depositPublicStatus = normalizePublicDepositStatus(input.depositStatus)
  const depositInternalStatus = normalizeDepositStatus(input.depositStatus)
  const latestDevis = input.latestDevis || null
  const quoteAccepted = isQuoteAccepted(latestDevis) || Boolean(input.acceptedAt)
  const quoteDeclined = isQuoteDeclined(latestDevis)
  const quoteSent = isQuoteSent(latestDevis) || Boolean(input.quoteSentAt)
  const hasDepositLink = typeof input.depositPaymentUrl === 'string' && input.depositPaymentUrl.trim().length > 0

  if (normalizedStatus === 'Perdu' || quoteDeclined) return 'lost'
  if (normalizedStatus === 'Gagné') return 'won'
  if (normalizedStatus === 'Réalisation du projet') return 'execution'
  if (normalizedStatus === 'Acompte payé' || depositPublicStatus === 'paid') return 'deposit_paid'
  if (
    normalizedStatus === 'Acompte demandé' ||
    depositInternalStatus === 'requested' ||
    depositPublicStatus === 'pending' ||
    hasDepositLink
  ) {
    return 'deposit_requested'
  }
  if (normalizedStatus === 'Devis accepté' || quoteAccepted) return 'quote_accepted'
  if (normalizedStatus === 'Devis envoyé' || normalizedStatus === 'En cours' && quoteSent || quoteSent) return 'quote_sent'
  if (normalizedStatus === 'En cours') return 'in_progress'
  if (normalizedStatus === 'Qualifié') return 'qualified'
  if (normalizedStatus === 'À rappeler') return 'callback'
  return 'new'
}

export function getClientPublicStatus(status: string | null | undefined, completenessScore?: number | null): string {
  const normalizedStatus = normalizeProjectStatus(status)
  if (Number(completenessScore || 0) > 0 && Number(completenessScore || 0) < 40) {
    return 'Informations à compléter'
  }
  switch (normalizedStatus) {
    case 'Nouveau':
      return 'Demande reçue'
    case 'À rappeler':
    case 'Qualifié':
      return "Demande en cours d'analyse"
    case 'En cours':
      return 'Étude en cours'
    case 'Devis envoyé':
      return 'Devis envoyé'
    case 'Devis accepté':
      return 'Devis accepté'
    case 'Acompte demandé':
      return 'Acompte à régler'
    case 'Acompte payé':
      return 'Acompte réglé'
    case 'Réalisation du projet':
      return 'Projet en cours de réalisation'
    case 'Gagné':
      return 'Projet terminé'
    case 'Perdu':
      return 'Demande clôturée'
    default:
      return 'Demande reçue'
  }
}

export function getProjectLifecycleStatusLabel(input: ProjectLifecycleInput): string {
  const stage = resolveProjectLifecycleStage(input)
  switch (stage) {
    case 'deposit_requested':
      return 'Acompte demandé'
    case 'deposit_paid':
      return 'Acompte payé'
    case 'quote_accepted':
      return 'Devis accepté'
    case 'execution':
      return 'Réalisation du projet'
    case 'won':
      return 'Gagné'
    case 'lost':
      return 'Perdu'
    default:
      return normalizeProjectStatus(input.status)
  }
}

export function getRecommendedProjectAction(input: ProjectLifecycleInput): ProjectLifecycleRecommendedAction {
  const actionEngineInput = getDefaultActionEngineInput(input)
  const nextAction = computeNextAction(actionEngineInput)
  const stage = resolveProjectLifecycleStage(input)
  const unreadClientActivityCount = Number(input.unreadClientActivityCount || 0)
  const completenessScore = Number(input.completenessScore || 0)
  const latestDevis = input.latestDevis || null
  const depositPublicStatus = normalizePublicDepositStatus(input.depositStatus)
  const depositInternalStatus = normalizeDepositStatus(input.depositStatus)
  const hasDepositLink = typeof input.depositPaymentUrl === 'string' && input.depositPaymentUrl.trim().length > 0
  const appointmentExists = Boolean(input.appointment?.start)
  const quoteCanFollowUp = latestDevis ? canFollowUpQuote(latestDevis) : false

  if (unreadClientActivityCount > 0) {
    return {
      key: 'reply_client',
      title: 'Répondre au client',
      ctaLabel: 'Voir les messages',
      meta: unreadClientActivityCount > 1 ? `${unreadClientActivityCount} nouveaux messages à traiter.` : 'Un message client attend une réponse.',
      priority: 'high',
      nextAction,
    }
  }

  if (completenessScore > 0 && completenessScore < 60) {
    return {
      key: 'complete_project',
      title: 'Compléter le dossier',
      ctaLabel: 'Demander un complément',
      meta: 'Des informations clés manquent encore pour faire avancer le dossier proprement.',
      priority: 'high',
      nextAction,
    }
  }

  switch (stage) {
    case 'new':
      // Ancien libellé "Ouvrir le dossier" : trompeur puisqu'on est déjà sur
      // la fiche projet (aucune navigation possible vers la page courante).
      // On propose désormais une action contextuelle réelle : planifier un
      // rendez-vous si aucun n'est encore fixé, sinon rester sur la
      // qualification sans bouton de navigation factice.
      if (!appointmentExists) {
        return {
          key: 'schedule_sales_appointment',
          title: 'Qualifier la demande',
          ctaLabel: 'Planifier un rendez-vous',
          meta: 'Planifiez un échange pour cadrer le besoin et vérifier les informations essentielles.',
          priority: 'normal',
          nextAction,
        }
      }
      return {
        key: 'qualify_project',
        title: 'Qualifier la demande',
        ctaLabel: 'Voir le résumé du dossier',
        meta: 'Le rendez-vous est planifié, poursuivez la qualification du besoin en attendant.',
        priority: 'low',
        nextAction,
      }
    case 'callback':
      return {
        key: 'reply_client',
        title: 'Rappeler le client',
        ctaLabel: 'Rappeler',
        meta: 'Le dossier attend un retour commercial avant de poursuivre.',
        priority: 'high',
        nextAction,
      }
    case 'qualified':
      return {
        key: 'prepare_quote',
        title: 'Préparer le devis',
        ctaLabel: 'Créer un devis',
        meta: 'Le besoin est qualifié, vous pouvez passer à la proposition chiffrée.',
        priority: 'high',
        nextAction,
      }
    case 'in_progress':
      return {
        key: appointmentExists ? 'prepare_quote' : 'schedule_sales_appointment',
        title: appointmentExists ? 'Préparer le devis' : 'Planifier un rendez-vous',
        ctaLabel: appointmentExists ? 'Créer un devis' : 'Planifier un rendez-vous',
        meta: appointmentExists
          ? 'Le dossier est en cours et peut être transformé en devis.'
          : 'Un échange commercial ou une visite permettra de verrouiller les derniers éléments.',
        priority: 'normal',
        nextAction,
      }
    case 'quote_sent':
      return {
        key: quoteCanFollowUp ? 'follow_up_quote' : 'track_quote',
        title: quoteCanFollowUp ? 'Relancer le devis' : 'Suivre le devis',
        ctaLabel: quoteCanFollowUp ? 'Relancer le client' : 'Voir le devis',
        meta: quoteCanFollowUp
          ? 'Le devis est parti, c’est le bon moment pour relancer.'
          : 'Le devis est en attente de réponse, gardez le suivi ouvert.',
        priority: quoteCanFollowUp ? 'high' : 'normal',
        nextAction,
      }
    case 'quote_accepted':
      return {
        key: hasDepositLink || depositInternalStatus === 'requested' || depositPublicStatus === 'pending' ? 'follow_up_deposit' : 'request_deposit',
        title: hasDepositLink || depositInternalStatus === 'requested' || depositPublicStatus === 'pending' ? 'Suivre l’acompte' : 'Demander l’acompte',
        ctaLabel: hasDepositLink ? 'Suivre l’acompte' : 'Partager le lien d’acompte',
        meta: hasDepositLink
          ? 'Le devis est accepté, l’acompte doit encore être confirmé.'
          : 'Le devis est accepté. Sécurisez le chantier avant planification.',
        priority: 'high',
        nextAction,
      }
    case 'deposit_requested':
      return {
        key: 'follow_up_deposit',
        title: 'Suivre l’acompte',
        ctaLabel: hasDepositLink ? 'Voir le paiement' : 'Relancer l’acompte',
        meta: 'Le lien d’acompte existe, le règlement est encore attendu.',
        priority: 'high',
        nextAction,
      }
    case 'deposit_paid':
      return {
        key: 'schedule_worksite',
        title: 'Planifier le chantier',
        ctaLabel: 'Planifier le chantier',
        meta: 'L’acompte est payé, vous pouvez passer à l’organisation du chantier.',
        priority: 'high',
        nextAction,
      }
    case 'execution':
      return {
        key: 'close_project',
        title: 'Clôturer le projet',
        ctaLabel: 'Marquer terminé',
        meta: 'Le chantier est en réalisation, préparez sa clôture commerciale.',
        priority: 'normal',
        nextAction,
      }
    case 'won':
      return {
        key: 'view_summary',
        title: 'Projet gagné',
        ctaLabel: 'Voir le récapitulatif',
        meta: 'Le dossier est terminé côté commercial.',
        priority: 'none',
        nextAction,
      }
    case 'lost':
      return {
        key: 'view_reason',
        title: 'Projet perdu',
        ctaLabel: 'Voir le motif',
        meta: 'Le dossier est clôturé comme perdu.',
        priority: 'none',
        nextAction,
      }
  }
}

export function getAvailableProjectActions(input: ProjectLifecycleInput): ProjectLifecycleSecondaryAction[] {
  const stage = resolveProjectLifecycleStage(input)
  switch (stage) {
    case 'quote_sent':
      return ['follow_up_quote']
    case 'deposit_requested':
      return ['follow_up_deposit']
    case 'deposit_paid':
      return ['move_to_execution', 'schedule_worksite']
    case 'execution':
      return ['mark_won', 'mark_lost']
    default:
      return []
  }
}

export function getProjectLifecycle(input: ProjectLifecycleInput): ProjectLifecycleResult {
  const normalizedStatus = normalizeProjectStatus(input.status)
  const stage = resolveProjectLifecycleStage(input)
  const recommendedAction = getRecommendedProjectAction(input)
  const secondaryActions = getAvailableProjectActions(input)

  return {
    normalizedStatus,
    stage,
    displayStatus: getProjectLifecycleStatusLabel(input),
    decisionLabel: stage === 'lost' ? 'Dossier perdu' : stage === 'won' ? 'Dossier gagné' : recommendedAction.title,
    recommendedAction,
    secondaryActions,
    allowMarkWon: secondaryActions.includes('mark_won'),
    allowMarkLost: secondaryActions.includes('mark_lost'),
    shouldUseWorksiteWording: stage === 'deposit_paid' || stage === 'execution' || stage === 'won',
    publicClientStatus: getClientPublicStatus(input.status, input.completenessScore),
  }
}

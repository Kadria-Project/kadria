// Source de vérité unique pour l'éligibilité et le contenu des relances de devis.
// Toute UI (fiche projet, route follow-up manuelle, route admin de relance
// contrôlée) doit passer par getQuoteFollowupState plutôt que ré-implémenter
// les règles de statut.

export type QuoteFollowupStage =
  | 'none'
  | 'j2_unopened'
  | 'j5_opened_no_decision'
  | 'j10_final'
  | 'stopped'
  | 'completed'
  | 'expired'

export interface QuoteFollowupState {
  canFollowUp: boolean
  shouldAutoFollowUp: boolean
  nextFollowupAt?: string
  reason: string
  stage: QuoteFollowupStage
}

// Accepte indifféremment les champs camelCase (objets serveur SupabaseDevis)
// et snake_case (réponses API déjà sérialisées côté client) pour éviter
// d'avoir un adaptateur par appelant.
export interface QuoteFollowupInput {
  sent?: boolean | null
  statut?: string | null
  accepted?: boolean | null
  acceptedAt?: string | null
  accepted_at?: string | null
  declined?: boolean | null
  declinedAt?: string | null
  declined_at?: string | null
  declineReason?: string | null
  decline_reason?: string | null
  dateValidite?: string | null
  date_validite?: string | null
  quoteSentAt?: string | null
  quote_sent_at?: string | null
  firstOpenedAt?: string | null
  first_opened_at?: string | null
  lastFollowUpAt?: string | null
  last_follow_up_at?: string | null
  followUpCount?: number | null
  follow_up_count?: number | null
  followUpDisabled?: boolean | null
  follow_up_disabled?: boolean | null
  clientEmail?: string | null
  client_email?: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000
export const MAX_QUOTE_FOLLOW_UPS = 3

const NON_FOLLOW_UP_STATUTS = [
  'accepté', 'accepte', 'refusé', 'refuse',
  'annulé', 'annule', 'expiré', 'expire',
  'cancelled', 'declined', 'refused', 'accepted', 'expired',
]

export function isQuoteExpired(quote: QuoteFollowupInput): boolean {
  const dateValidite = quote.dateValidite ?? quote.date_validite
  if (!dateValidite) return false
  const time = new Date(dateValidite).getTime()
  if (!Number.isFinite(time)) return false
  return time < Date.now()
}

export function getQuoteFollowupState(quote: QuoteFollowupInput): QuoteFollowupState {
  const accepted = Boolean(quote.accepted)
  const acceptedAt = quote.acceptedAt ?? quote.accepted_at
  if (accepted || acceptedAt) {
    return { canFollowUp: false, shouldAutoFollowUp: false, reason: 'Devis accepté — aucune relance nécessaire.', stage: 'completed' }
  }

  const declinedAt = quote.declinedAt ?? quote.declined_at
  const declineReason = quote.declineReason ?? quote.decline_reason
  if (Boolean(quote.declined) || declinedAt || declineReason) {
    return { canFollowUp: false, shouldAutoFollowUp: false, reason: 'Devis refusé — aucune relance.', stage: 'completed' }
  }

  const statut = (quote.statut || '').toLowerCase().trim()
  if (NON_FOLLOW_UP_STATUTS.includes(statut)) {
    return { canFollowUp: false, shouldAutoFollowUp: false, reason: 'Devis clos — aucune relance.', stage: 'completed' }
  }

  if (isQuoteExpired(quote)) {
    return { canFollowUp: false, shouldAutoFollowUp: false, reason: 'Devis expiré — aucune relance automatique.', stage: 'expired' }
  }

  const sent = Boolean(quote.sent) || statut.startsWith('envoy')
  const quoteSentAt = quote.quoteSentAt ?? quote.quote_sent_at
  if (!sent || !quoteSentAt) {
    return { canFollowUp: false, shouldAutoFollowUp: false, reason: 'Devis non envoyé.', stage: 'none' }
  }

  const followUpDisabled = Boolean(quote.followUpDisabled ?? quote.follow_up_disabled)
  if (followUpDisabled) {
    return { canFollowUp: false, shouldAutoFollowUp: false, reason: 'Relances désactivées pour ce devis.', stage: 'stopped' }
  }

  const sentAt = new Date(quoteSentAt).getTime()
  if (!Number.isFinite(sentAt)) {
    return { canFollowUp: false, shouldAutoFollowUp: false, reason: "Date d'envoi du devis invalide.", stage: 'none' }
  }

  const followUpCount = quote.followUpCount ?? quote.follow_up_count ?? 0
  if (followUpCount >= MAX_QUOTE_FOLLOW_UPS) {
    return { canFollowUp: false, shouldAutoFollowUp: false, reason: 'Toutes les relances prévues ont déjà été envoyées.', stage: 'completed' }
  }

  const clientEmail = quote.clientEmail ?? quote.client_email
  const firstOpenedAt = quote.firstOpenedAt ?? quote.first_opened_at
  const opened = Boolean(firstOpenedAt)
  const daysSinceSent = (Date.now() - sentAt) / DAY_MS

  let dueStage: QuoteFollowupStage = 'none'
  let expectedCount = 0
  if (daysSinceSent >= 10) {
    expectedCount = 3
    dueStage = 'j10_final'
  } else if (opened && daysSinceSent >= 5) {
    expectedCount = 2
    dueStage = 'j5_opened_no_decision'
  } else if (!opened && daysSinceSent >= 2) {
    expectedCount = 1
    dueStage = 'j2_unopened'
  }

  const isDue = expectedCount > followUpCount

  if (isDue) {
    return {
      canFollowUp: true,
      shouldAutoFollowUp: Boolean(clientEmail),
      nextFollowupAt: new Date().toISOString(),
      reason:
        dueStage === 'j2_unopened'
          ? 'Devis envoyé non ouvert depuis plus de 2 jours.'
          : dueStage === 'j5_opened_no_decision'
            ? 'Devis ouvert depuis plus de 5 jours sans décision.'
            : 'Devis sans décision depuis plus de 10 jours (relance finale).',
      stage: dueStage,
    }
  }

  let nextFollowupAt: string | undefined
  let reason = 'Relance manuelle possible — aucune relance automatique due pour le moment.'
  if (followUpCount === 0) {
    nextFollowupAt = new Date(sentAt + (opened ? 5 : 2) * DAY_MS).toISOString()
    reason = opened ? 'Relance J+5 prévue (devis ouvert, sans décision).' : 'Relance J+2 prévue si le devis reste non ouvert.'
  } else {
    nextFollowupAt = new Date(sentAt + 10 * DAY_MS).toISOString()
    reason = 'Relance finale J+10 prévue si toujours aucune décision.'
  }

  return { canFollowUp: true, shouldAutoFollowUp: false, nextFollowupAt, reason, stage: 'none' }
}

export function canFollowUpQuote(quote: QuoteFollowupInput): boolean {
  return getQuoteFollowupState(quote).canFollowUp
}

export interface QuoteFollowupEmailParams {
  firstName?: string
  quoteSentAt?: string
  projectType?: string
  artisanName?: string
}

function buildGreeting(firstName?: string) {
  const trimmed = firstName?.trim() || ''
  return trimmed ? `Bonjour ${trimmed},` : 'Bonjour,'
}

// Relance générique — utilisée pour la relance manuelle hors cycle automatique
// (ex : artisan qui relance avant l'échéance J+2/J+5/J+10).
export function generateQuoteFollowUpEmail(params: QuoteFollowupEmailParams) {
  const sentDate = params.quoteSentAt
    ? new Date(params.quoteSentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'précédemment'
  const greeting = buildGreeting(params.firstName)
  const projectType = params.projectType?.trim() || 'votre projet'
  const artisanName = params.artisanName?.trim() || 'Votre artisan'

  return {
    subject: 'Suite à votre demande de devis',
    text: `${greeting}

Je me permets de revenir vers vous concernant le devis transmis le ${sentDate} pour votre projet de ${projectType}.

Je reste disponible pour répondre à vos questions ou échanger sur certains points si nécessaire.

N'hésitez pas à me faire un retour afin que nous puissions avancer ensemble.

Bien cordialement,

${artisanName}`,
  }
}

// Relances du scénario V1, avec un ton qui monte progressivement en
// insistance sans jamais culpabiliser le prospect.
export function generateQuoteFollowupEmailForStage(
  stage: QuoteFollowupStage,
  params: QuoteFollowupEmailParams,
) {
  const greeting = buildGreeting(params.firstName)
  const projectType = params.projectType?.trim() || 'votre projet'
  const artisanName = params.artisanName?.trim() || 'Votre artisan'

  if (stage === 'j2_unopened') {
    return {
      subject: 'Votre devis est disponible',
      text: `${greeting}

${artisanName} vous a transmis un devis pour ${projectType}. Vous pouvez le consulter dès maintenant via le lien ci-dessous.

Bien cordialement,

${artisanName}`,
    }
  }

  if (stage === 'j5_opened_no_decision') {
    return {
      subject: 'Votre devis vous attend',
      text: `${greeting}

Vous avez consulté le devis transmis par ${artisanName} pour ${projectType}. Avez-vous une question avant de vous décider ?

Vous pouvez l'accepter ou le refuser directement depuis le lien ci-dessous.

Bien cordialement,

${artisanName}`,
    }
  }

  if (stage === 'j10_final') {
    return {
      subject: 'Dernier rappel concernant votre devis',
      text: `${greeting}

Dernier rappel concernant le devis transmis par ${artisanName} pour ${projectType}.

Vous pouvez l'accepter, le refuser ou poser une question directement depuis le lien ci-dessous.

Bien cordialement,

${artisanName}`,
    }
  }

  return generateQuoteFollowUpEmail(params)
}

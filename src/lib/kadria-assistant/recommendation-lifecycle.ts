import { MAX_QUOTE_FOLLOW_UPS, QUOTE_FOLLOW_UP_OBSERVATION_DAYS, type QuoteFollowupState } from '@/src/lib/quote-followup'

export type RecommendationLifecycle =
  | 'proposed'
  | 'viewed'
  | 'executed'
  | 'observing'
  | 'resolved'
  | 'follow_up_required'
  | 'inconclusive'
  | 'blocked'
  | 'obsolete'

export interface RecommendationLoop {
  lifecycle: RecommendationLifecycle
  explanation: string
  expectedObservation: string
  executionEvidence?: string
  observationEndsAt?: string
  uncertainty?: string
}

type QuoteRecommendationInput = {
  state: QuoteFollowupState
  hasClientEmail: boolean
  lastFollowUpAt?: string | null
  followUpCount?: number | null
}

function observationEndsAt(date: string | null | undefined) {
  if (!date) return null
  const timestamp = new Date(date).getTime()
  return Number.isFinite(timestamp)
    ? new Date(timestamp + QUOTE_FOLLOW_UP_OBSERVATION_DAYS * 24 * 60 * 60 * 1000)
    : null
}

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export function describeQuoteRecommendation(input: QuoteRecommendationInput, now = new Date()): RecommendationLoop | null {
  const followUpCount = input.followUpCount || 0
  const observationDeadline = observationEndsAt(input.lastFollowUpAt)

  if (followUpCount >= MAX_QUOTE_FOLLOW_UPS) {
    return {
      lifecycle: 'inconclusive',
      explanation: 'Trois relances sont enregistrées sans décision. Répéter le même envoi ne serait plus justifié.',
      expectedObservation: 'Je vérifierai une décision client ou une mise à jour du dossier avant toute nouvelle recommandation.',
      executionEvidence: 'Le cycle de relance prévu a été exécuté.',
      uncertainty: 'Le silence du client ne permet pas de conclure sur son intention.',
    }
  }

  if (input.state.stage === 'completed' || input.state.stage === 'expired' || input.state.stage === 'stopped') {
    return {
      lifecycle: 'resolved',
      explanation: input.state.reason,
      expectedObservation: 'Aucune nouvelle relance ne sera proposée tant qu’un nouveau fait ne modifie pas le dossier.',
      executionEvidence: 'Le devis est sorti du cas nécessitant une relance.',
    }
  }

  if (observationDeadline && observationDeadline > now) {
    const executedRecently = now.getTime() - new Date(input.lastFollowUpAt as string).getTime() < 24 * 60 * 60 * 1000
    return {
      lifecycle: executedRecently ? 'executed' : 'observing',
      explanation: executedRecently
        ? 'Relance enregistrée. Kadria ouvre maintenant une période d’observation.'
        : 'Relance enregistrée. Kadria surveille maintenant une réponse, une décision ou une évolution du dossier.',
      expectedObservation: `Nouvelle vérification prévue le ${formatDate(observationDeadline)}.`,
      observationEndsAt: observationDeadline.toISOString(),
      executionEvidence: 'Relance envoyée et enregistrée sur le devis.',
      uncertainty: 'Aucune réponse client n’est encore enregistrée.',
    }
  }

  if (input.state.canFollowUp && input.state.stage !== 'none') {
    if (!input.hasClientEmail) {
      return {
        lifecycle: 'inconclusive',
        explanation: "Le devis nécessite une relance, mais l'e-mail client manque : aucun envoi fiable n'est possible.",
        expectedObservation: "Je vérifierai que les coordonnées sont complétées avant de proposer l'envoi.",
        uncertainty: "L'absence d'e-mail ne permet pas de savoir si le client peut être joint par un autre canal.",
      }
    }

    return {
      lifecycle: input.lastFollowUpAt ? 'follow_up_required' : 'proposed',
      explanation: `${input.state.reason} Une relance aujourd'hui peut aider à obtenir une décision avant que le projet ne refroidisse.`,
      expectedObservation: "Après confirmation d'envoi, je vérifierai la relance enregistrée puis j'attendrai une réponse avant de recommander la suite.",
    }
  }

  if (observationDeadline && observationDeadline <= now) {
    return {
      lifecycle: 'inconclusive',
      explanation: 'La période d’observation est terminée sans décision enregistrée. Une nouvelle relance n’est pas encore justifiée par le contrat métier.',
      expectedObservation: input.state.nextFollowupAt
        ? `Je réévaluerai au prochain jalon prévu le ${formatDate(new Date(input.state.nextFollowupAt))}.`
        : 'Je réévaluerai dès qu’un fait fiable sera enregistré dans le dossier.',
      executionEvidence: 'Relance envoyée et enregistrée sur le devis.',
      uncertainty: 'Les données disponibles ne permettent pas d’interpréter le silence du client.',
    }
  }

  return null
}

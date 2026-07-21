import type { QuoteFollowupState } from '@/src/lib/quote-followup'

export type RecommendationLifecycle = 'proposed' | 'opened' | 'observed' | 'blocked' | 'obsolete'

export interface RecommendationLoop {
  lifecycle: RecommendationLifecycle
  explanation: string
  expectedObservation: string
  executionEvidence?: string
}

type QuoteRecommendationInput = {
  state: QuoteFollowupState
  hasClientEmail: boolean
  lastFollowUpAt?: string | null
}

function isRecent(date: string | null | undefined, now: Date) {
  if (!date) return false
  const timestamp = new Date(date).getTime()
  return Number.isFinite(timestamp) && timestamp <= now.getTime() && now.getTime() - timestamp <= 7 * 24 * 60 * 60 * 1000
}

export function describeQuoteRecommendation(input: QuoteRecommendationInput, now = new Date()): RecommendationLoop | null {
  if (input.state.canFollowUp && input.state.stage !== 'none') {
    if (!input.hasClientEmail) {
      return {
        lifecycle: 'blocked',
        explanation: "Le devis nécessite une relance, mais l'e-mail client manque : aucun envoi fiable n'est possible.",
        expectedObservation: "Je vérifierai que les coordonnées sont complétées avant de proposer l'envoi.",
      }
    }

    return {
      lifecycle: 'proposed',
      explanation: `${input.state.reason} Une relance aujourd'hui peut aider à obtenir une décision avant que le projet ne refroidisse.`,
      expectedObservation: "Après confirmation d'envoi, je vérifierai la relance enregistrée puis j'attendrai une réponse avant de recommander la suite.",
    }
  }

  if (input.state.stage === 'none' && isRecent(input.lastFollowUpAt, now)) {
    return {
      lifecycle: 'observed',
      explanation: 'Une relance est enregistrée récemment pour ce devis. Aucune nouvelle relance n’est recommandée pour le moment.',
      expectedObservation: "J'attends une réponse, une décision ou le prochain jalon de relance prévu.",
      executionEvidence: 'Relance envoyée et enregistrée sur le devis.',
    }
  }

  return null
}

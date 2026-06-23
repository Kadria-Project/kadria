// V1 légère de suggestions de lignes de devis : aide l'artisan à partir plus
// vite sur un devis, sans rien générer automatiquement ni inventer de prix
// métier. Logique 100% déterministe (pas d'IA, pas d'appel externe).
//
// Ces lignes ne sont jamais persistées : elles sont calculées à la demande
// dans la fiche projet, à partir des données déjà disponibles (métiers,
// taxonomie métier, résumé IA, réponses métier, frais de déplacement
// estimés). Aucune nouvelle table/colonne n'est nécessaire pour cette V1.

import { getTradeTaxonomies, getTradeTaxonomy } from '@/src/config/trade-taxonomy'

export type QuoteSuggestionLine = {
  label: string
  reason?: string
  source: 'trade' | 'project' | 'travel' | 'generic'
  suggestedAmount?: number
  optional?: boolean
}

export interface QuoteSuggestionProjectLike {
  trade?: string
  projectType?: string
  aiSummary?: string
  tradeAnswers?: unknown
}

export interface QuoteSuggestionBusinessConfig {
  acceptedWorkTypes?: string[]
  refusedWorkTypes?: string[]
  customAcceptedWork?: string
  customRefusedWork?: string
}

export interface QuoteSuggestionTravel {
  suggestedFee?: number
  estimatedCost?: number
  oneWayDistanceKm?: number
  isFreeZone?: boolean
}

export interface QuoteSuggestionParams {
  project: QuoteSuggestionProjectLike
  artisanTrades?: string[]
  businessConfig?: QuoteSuggestionBusinessConfig
  travel?: QuoteSuggestionTravel
}

const MAX_SUGGESTIONS = 8

function capitalize(label: string): string {
  if (!label) return label
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function tradeAnswersToText(tradeAnswers: unknown): string {
  if (!tradeAnswers) return ''
  let parsed = tradeAnswers
  if (typeof tradeAnswers === 'string') {
    try {
      parsed = JSON.parse(tradeAnswers)
    } catch {
      return tradeAnswers
    }
  }
  if (Array.isArray(parsed)) {
    return parsed
      .map((qa) => (qa && typeof qa === 'object' ? `${(qa as { question?: string }).question || ''} ${(qa as { answer?: string }).answer || ''}` : ''))
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

function buildProjectText(project: QuoteSuggestionProjectLike): string {
  return [project.trade, project.projectType, project.aiSummary, tradeAnswersToText(project.tradeAnswers)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

// Lignes specifiques a quelques besoins frequents, reperees par mots-cles
// dans le texte projet. Volontairement limite a des cas courants et non
// exhaustifs : objectif "aider a partir plus vite", pas couvrir tous les cas.
const KEYWORD_SPECIFIC_LINES: Array<{ keywords: string[]; lines: string[] }> = [
  {
    keywords: ['pompe à chaleur', 'pompe a chaleur', ' pac ', 'pac air', 'climatisation'],
    lines: ['Entretien pompe à chaleur', 'Contrôle fonctionnement', 'Nettoyage filtres', 'Vérification unités intérieure/extérieure'],
  },
  {
    keywords: ['clôture', 'cloture'],
    lines: ['Préparation du terrain', 'Fourniture / pose clôture', 'Évacuation déchets'],
  },
  {
    keywords: ['tableau électrique', 'tableau electrique', 'mise aux normes'],
    lines: ['Diagnostic électrique', 'Tableau électrique', 'Mise en sécurité'],
  },
]

function matchesWorkTypeList(projectText: string, workTypes: string[] | undefined): string | undefined {
  if (!workTypes || workTypes.length === 0 || !projectText) return undefined
  return workTypes.find((term) => term && term.trim() && projectText.includes(term.trim().toLowerCase()))
}

export function getQuoteSuggestions(params: QuoteSuggestionParams): QuoteSuggestionLine[] {
  const { project, artisanTrades, businessConfig, travel } = params
  const projectText = buildProjectText(project)
  const lines: QuoteSuggestionLine[] = []
  const seenLabels = new Set<string>()

  function addLine(line: QuoteSuggestionLine) {
    const key = line.label.trim().toLowerCase()
    if (!key || seenLabels.has(key)) return
    seenLabels.add(key)
    lines.push(line)
  }

  // Frais de déplacement (Mission 4) : toujours en premier quand connu.
  if (travel) {
    if (travel.isFreeZone) {
      addLine({
        label: 'Déplacement',
        reason: 'Déplacement dans zone proche.',
        source: 'travel',
        optional: true,
      })
    } else if (travel.suggestedFee !== undefined && travel.suggestedFee > 0) {
      addLine({
        label: 'Frais de déplacement',
        reason: 'Suggestion basée sur la distance et vos paramètres de déplacement.',
        source: 'travel',
        suggestedAmount: travel.suggestedFee,
      })
    }
  }

  // Si aucun signal déplacement n'est disponible (plan non éligible,
  // coordonnées manquantes...), on garde une ligne "Déplacement" générique
  // pour ne pas faire disparaître ce poste habituel des devis artisan.
  if (!travel) {
    addLine({ label: 'Déplacement', source: 'generic' })
  }

  // Lignes specifiques par mots-cles (Mission 3, cas concrets).
  for (const entry of KEYWORD_SPECIFIC_LINES) {
    if (entry.keywords.some((keyword) => projectText.includes(keyword))) {
      for (const label of entry.lines) {
        addLine({ label, source: 'project' })
      }
    }
  }

  // Lignes issues de la taxonomie metier declaree par l'artisan, ou inferee
  // depuis le metier du projet si l'artisan n'a pas de metiers configures.
  const tradesToUse = artisanTrades && artisanTrades.length > 0
    ? artisanTrades
    : (project.trade ? [project.trade] : [])
  const taxonomies = tradesToUse.length > 0 ? getTradeTaxonomies(tradesToUse) : []
  const hasKnownTrade = taxonomies.length > 0 && tradesToUse.some((t) => getTradeTaxonomy(t))

  // Main d'œuvre : toujours utile, priorisée avant les lignes metier
  // generiques pour ne jamais etre evincee par la limite de 8 suggestions.
  addLine({ label: 'Main d’œuvre', source: hasKnownTrade ? 'trade' : 'generic' })

  if (hasKnownTrade) {
    for (const taxonomy of taxonomies) {
      for (const item of taxonomy.quoteItems) {
        // "déplacement" et "main d'œuvre" sont déjà gérés explicitement
        // ci-dessus (le déplacement dépend du signal travel, pas du métier).
        const normalized = item.trim().toLowerCase()
        if (normalized === 'déplacement' || normalized.includes('main d')) continue
        addLine({ label: capitalize(item), source: 'trade' })
      }
    }
  } else {
    // Fallback générique (Mission 7, cas "projet sans métier").
    addLine({ label: 'Déplacement', source: 'generic' })
    addLine({ label: 'Fournitures', source: 'generic' })
    addLine({ label: 'Poste à préciser', source: 'generic', optional: true })
  }

  // Préférences métier (Mission 2) : signal léger, non bloquant — une ligne
  // qui correspond à un type de travaux que l'artisan évite habituellement
  // est marquée optionnelle avec une note, jamais retirée d'autorité.
  if (businessConfig?.refusedWorkTypes && businessConfig.refusedWorkTypes.length > 0) {
    const refusedMatch = matchesWorkTypeList(projectText, businessConfig.refusedWorkTypes)
    if (refusedMatch) {
      for (const line of lines) {
        if (line.source === 'trade' || line.source === 'project') {
          line.optional = true
          line.reason = line.reason || `Vérifiez que ce type de travaux (${refusedMatch}) correspond à ce que vous souhaitez réaliser.`
        }
      }
    }
  }

  return lines.slice(0, MAX_SUGGESTIONS)
}

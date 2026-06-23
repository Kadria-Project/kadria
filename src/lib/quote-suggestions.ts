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
  source: 'trade' | 'project' | 'travel' | 'generic' | 'template'
  suggestedAmount?: number
  optional?: boolean
  vatRate?: number
  fromCatalog?: boolean
}

// Catalogue de prestations configure par l'artisan (Mission "service
// catalog"). Stocke dans Artisan_config.business_config.serviceCatalog (JSONB,
// pas de migration). Les prix viennent uniquement de ce catalogue : Kadria
// n'invente jamais de grille tarifaire.
export type ArtisanServiceCatalogItem = {
  id: string
  label: string
  trade?: string
  category?: string
  unit?: 'forfait' | 'heure' | 'jour' | 'm2' | 'ml' | 'unite'
  unitPriceHT?: number | null
  vatRate?: number
  isActive?: boolean
  notes?: string
}

// Modeles de devis reutilisables configures par l'artisan (Mission "quote
// templates"). Stockes dans Artisan_config.business_config.quoteTemplates
// (JSONB, pas de migration). Les prix des lignes viennent uniquement du
// catalogue artisan (via catalogItemId) ou de ce que l'artisan a saisi lui
// meme dans le modele : Kadria n'invente jamais de prix.
export type ArtisanQuoteTemplateLine = {
  id: string
  label: string
  catalogItemId?: string
  description?: string
  quantity?: number
  unit?: 'forfait' | 'heure' | 'jour' | 'm2' | 'ml' | 'unite'
  unitPriceHT?: number | null
  vatRate?: number
  optional?: boolean
}

export type ArtisanQuoteTemplate = {
  id: string
  name: string
  trade?: string
  category?: string
  keywords?: string[]
  isActive?: boolean
  notes?: string
  lines: ArtisanQuoteTemplateLine[]
}

export interface QuoteSuggestionProjectLike {
  trade?: string
  projectType?: string
  aiSummary?: string
  tradeAnswers?: unknown
}

// Parametres commerciaux par defaut (Mission "quote commercial settings") :
// stockes dans businessConfig.quoteSettings, utilises uniquement pour
// preremplir /devis/new — jamais pour generer un devis automatiquement.
export type QuoteCommercialSettings = {
  defaultVatRate?: number
  defaultValidityDays?: number
  defaultPaymentTerms?: string
  defaultDepositPercent?: number | null
  defaultNotes?: string
  defaultEstimatedDelay?: string
  // Mission "quote legal compliance for France" — mention gratuit/payant.
  quotePricingType?: 'free' | 'paid'
  quoteFeeAmountTTC?: number | null
  quoteFeeDeductible?: boolean
  // Regime de TVA applicable par defaut aux devis de l'artisan.
  vatMode?: 'vat_applicable' | 'vat_exempt_293b'
  // Assurance professionnelle / decennale a afficher sur le devis.
  insuranceEnabled?: boolean
  insuranceType?: 'rc_pro' | 'decennale' | 'rc_pro_decennale'
  insuranceCompany?: string
  insurancePolicyNumber?: string
  insuranceCoveredActivities?: string
  insuranceGeographicCoverage?: string
  insuranceProviderAddress?: string
  // Mentions main-d'oeuvre / frais de deplacement.
  laborMentionMode?: 'included' | 'detailed' | 'not_applicable'
  travelFeeMentionMode?: 'included' | 'detailed' | 'not_charged' | 'not_applicable'
}

export interface QuoteSuggestionBusinessConfig {
  acceptedWorkTypes?: string[]
  refusedWorkTypes?: string[]
  customAcceptedWork?: string
  customRefusedWork?: string
  serviceCatalog?: ArtisanServiceCatalogItem[]
  quoteTemplates?: ArtisanQuoteTemplate[]
  quoteSettings?: QuoteCommercialSettings
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

// Matching V1 volontairement simple (label exact ou inclusion de mots-cles) :
// en cas de doute, on prefere ne pas prerempler de prix plutot que de risquer
// un montant incorrect. Quelques synonymes courants sont normalises pour
// couvrir le cas "Entretien pompe a chaleur" / "Entretien PAC".
const MIN_KEYWORD_MATCH_LENGTH = 4

const CATALOG_MATCH_SYNONYMS: Array<[RegExp, string]> = [
  [/pompe\s*à\s*chaleur|pompe\s*a\s*chaleur|\bpac\b/g, 'pac'],
]

function normalizeForCatalogMatch(text: string): string {
  let normalized = text.trim().toLowerCase()
  for (const [pattern, replacement] of CATALOG_MATCH_SYNONYMS) {
    normalized = normalized.replace(pattern, replacement)
  }
  return normalized
}

function findCatalogMatch(
  label: string,
  catalog: ArtisanServiceCatalogItem[] | undefined
): ArtisanServiceCatalogItem | undefined {
  if (!catalog || catalog.length === 0) return undefined
  const normalizedLabel = label.trim().toLowerCase()
  if (!normalizedLabel) return undefined

  const usableItems = catalog.filter(
    (item) => item.isActive !== false && typeof item.unitPriceHT === 'number' && item.unitPriceHT !== null
  )

  const exactMatch = usableItems.find((item) => item.label.trim().toLowerCase() === normalizedLabel)
  if (exactMatch) return exactMatch

  const keywordMatch = usableItems.find((item) => {
    const normalizedItemLabel = item.label.trim().toLowerCase()
    if (normalizedItemLabel.length < MIN_KEYWORD_MATCH_LENGTH) return false
    return normalizedLabel.includes(normalizedItemLabel) || normalizedItemLabel.includes(normalizedLabel)
  })
  if (keywordMatch) return keywordMatch

  const synonymLabel = normalizeForCatalogMatch(normalizedLabel)
  return usableItems.find((item) => {
    const synonymItemLabel = normalizeForCatalogMatch(item.label)
    if (synonymItemLabel.length < MIN_KEYWORD_MATCH_LENGTH) return false
    return synonymLabel.includes(synonymItemLabel) || synonymItemLabel.includes(synonymLabel)
  })
}

// Matching modele -> projet (Mission "quote templates"), volontairement
// simple et deterministe (pas d'IA, pas d'appel externe) : en cas de doute,
// on prefere ne suggerer aucun modele plutot que d'en imposer un incertain.
const QUOTE_TEMPLATE_MATCH_THRESHOLD = 2

export function findBestQuoteTemplate(params: {
  project: QuoteSuggestionProjectLike
  artisanTrades?: string[]
  businessConfig?: QuoteSuggestionBusinessConfig
}): ArtisanQuoteTemplate | null {
  const { project, artisanTrades, businessConfig } = params
  const templates = businessConfig?.quoteTemplates
  if (!templates || templates.length === 0) return null

  const projectText = buildProjectText(project)
  const tradesToUse = artisanTrades && artisanTrades.length > 0
    ? artisanTrades
    : (project.trade ? [project.trade] : [])
  const normalizedTrades = new Set(tradesToUse.map((t) => t.trim().toLowerCase()))

  let bestTemplate: ArtisanQuoteTemplate | null = null
  let bestScore = 0

  for (const template of templates) {
    if (template.isActive === false) continue
    if (!template.name || !template.name.trim()) continue

    let score = 0

    if (template.trade && normalizedTrades.has(template.trade.trim().toLowerCase())) {
      score += 3
    }

    const normalizedName = template.name.trim().toLowerCase()
    if (normalizedName.length >= MIN_KEYWORD_MATCH_LENGTH && projectText.includes(normalizedName)) {
      score += 2
    } else {
      const synonymName = normalizeForCatalogMatch(normalizedName)
      const synonymProjectText = normalizeForCatalogMatch(projectText)
      if (synonymName.length >= MIN_KEYWORD_MATCH_LENGTH && synonymProjectText.includes(synonymName)) {
        score += 2
      }
    }

    if (template.keywords) {
      for (const keyword of template.keywords) {
        const normalizedKeyword = keyword.trim().toLowerCase()
        if (normalizedKeyword && projectText.includes(normalizedKeyword)) {
          score += 1
        }
      }
    }

    if (template.category && projectText.includes(template.category.trim().toLowerCase())) {
      score += 1
    }

    if (score > bestScore) {
      bestScore = score
      bestTemplate = template
    }
  }

  return bestScore >= QUOTE_TEMPLATE_MATCH_THRESHOLD ? bestTemplate : null
}

export function templateLineToSuggestion(
  line: ArtisanQuoteTemplateLine,
  catalog: ArtisanServiceCatalogItem[] | undefined
): QuoteSuggestionLine {
  const catalogItem = line.catalogItemId
    ? catalog?.find((item) => item.id === line.catalogItemId && item.isActive !== false)
    : undefined

  if (catalogItem && typeof catalogItem.unitPriceHT === 'number') {
    return {
      label: line.label,
      source: 'template',
      optional: line.optional,
      suggestedAmount: catalogItem.unitPriceHT,
      vatRate: catalogItem.vatRate,
      fromCatalog: true,
    }
  }

  return {
    label: line.label,
    source: 'template',
    optional: line.optional,
    suggestedAmount: typeof line.unitPriceHT === 'number' ? line.unitPriceHT : undefined,
    vatRate: line.vatRate,
  }
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

  // Modele de devis (Mission "quote templates") : priorite 1. Si un modele
  // fiable correspond au projet, ses lignes remplacent les suggestions
  // metier/mots-cles generiques — on ne mélange pas un modele avec le
  // fallback automatique pour rester previsible pour l'artisan.
  const matchedTemplate = findBestQuoteTemplate({ project, artisanTrades, businessConfig })
  if (matchedTemplate) {
    for (const line of matchedTemplate.lines) {
      addLine(templateLineToSuggestion(line, businessConfig?.serviceCatalog))
    }
    if (!travel) {
      addLine({ label: 'Déplacement', source: 'generic' })
    }
    return lines.slice(0, MAX_SUGGESTIONS)
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

  // Catalogue de prestations (Mission "service catalog") : priorite 2, apres
  // le deplacement chiffre. Ne preremplit jamais un prix si aucune
  // prestation active du catalogue ne correspond raisonnablement.
  if (businessConfig?.serviceCatalog && businessConfig.serviceCatalog.length > 0) {
    for (const line of lines) {
      if (line.suggestedAmount !== undefined) continue
      const match = findCatalogMatch(line.label, businessConfig.serviceCatalog)
      if (match && typeof match.unitPriceHT === 'number') {
        line.suggestedAmount = match.unitPriceHT
        line.vatRate = match.vatRate
        line.fromCatalog = true
      }
    }
  }

  return lines.slice(0, MAX_SUGGESTIONS)
}

// Structure de brouillon cote front (Mission "prefill quote draft") : permet
// de transformer des suggestions en lignes exploitables par le formulaire de
// devis existant, sans jamais inventer de prix metier. Seul le deplacement
// peut porter un montant suggere. Tout reste modifiable/supprimable par
// l'artisan avant tout enregistrement.
export type QuoteDraftLine = {
  label: string
  description?: string
  quantity?: number
  unit?: string
  unitPrice?: number | null
  amount?: number | null
  vatRate?: number
  source?: 'trade' | 'project' | 'travel' | 'generic' | 'template'
  optional?: boolean
  fromCatalog?: boolean
}

export function getMatchedQuoteTemplateName(params: {
  project: QuoteSuggestionProjectLike
  artisanTrades?: string[]
  businessConfig?: QuoteSuggestionBusinessConfig
}): string | null {
  return findBestQuoteTemplate(params)?.name ?? null
}

export function getQuoteDraftStorageKey(projectId: string): string {
  return `kadria:quoteDraft:${projectId}`
}

// Charge utile stockee en sessionStorage entre la fiche projet et /devis/new
// (Mission "quote templates", point 8) : porte en plus le nom du modele
// utilise, pour un simple bandeau d'info — jamais utilisee pour generer quoi
// que ce soit automatiquement.
export type QuoteDraftPayload = {
  lines: QuoteDraftLine[]
  templateName?: string
}

export function buildQuoteDraftPayload(
  lines: QuoteSuggestionLine[],
  templateName?: string | null
): QuoteDraftPayload {
  return {
    lines: toQuoteDraftLines(lines),
    ...(templateName ? { templateName } : {}),
  }
}

export function toQuoteDraftLines(lines: QuoteSuggestionLine[]): QuoteDraftLine[] {
  return lines.map((line) => ({
    label: line.label,
    description: line.label,
    quantity: 1,
    unit: 'u',
    unitPrice: line.suggestedAmount ?? null,
    amount: line.suggestedAmount ?? null,
    vatRate: line.vatRate,
    source: line.source,
    optional: line.optional,
    fromCatalog: line.fromCatalog,
  }))
}

// Application manuelle d'un modele depuis /devis/new (Mission "manual
// template selection") : memes regles que le matching automatique — jamais
// de prix invente, le catalogue reste la seule source de prix hors saisie
// manuelle du modele lui-meme.
export function templateToQuoteDraftLines(params: {
  template: ArtisanQuoteTemplate
  serviceCatalog?: ArtisanServiceCatalogItem[]
}): QuoteDraftLine[] {
  const { template, serviceCatalog } = params
  return toQuoteDraftLines(template.lines.map((line) => templateLineToSuggestion(line, serviceCatalog)))
}

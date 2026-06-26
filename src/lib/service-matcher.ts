// Moteur de correspondance "référentiel métier" -> projet (V1).
//
// Objectif : transformer le référentiel métier (profil métier + profils de
// prestations) en suggestions de lignes de devis explicables, sans jamais
// inventer de donnée (pas de prix, pas de durée, pas de mot-clé fictifs —
// uniquement ce qui est déjà déclaré par l'artisan).
//
// Ce module ne dépend d'aucune interface (pas de React, pas de Next.js, pas
// du moteur de suggestions generiques) : il est destiné à être réutilisé
// par le devis, le chat, l'assistant vocal, l'Action Engine et les
// statistiques.

export interface ServiceMatcherBusinessProfile {
  primary_trade?: string | null
  specialties?: string[] | null
}

export interface ServiceMatcherServiceProfile {
  id: string
  service_catalog_id?: string | null
  name: string
  category?: string | null
  description?: string | null
  is_active: boolean
  detection_keywords?: string[] | null
  recommended_quote_lines?: unknown[] | null
  average_duration_minutes?: number | null
  default_vat_rate?: number | null
  required_photos?: boolean | null
}

export interface ServiceMatcherProject {
  trade?: string | null
  projectType?: string | null
  aiSummary?: string | null
  description?: string | null
  budget?: string | null
  photosCount?: number
}

export interface ServiceMatchResult {
  serviceProfile: ServiceMatcherServiceProfile
  confidence: number
  reasons: string[]
  recommendedQuoteLines: unknown[]
  estimatedDuration: number | null
  vatRate: number | null
}

function normalize(text: string | null | undefined): string {
  return (text || '').trim().toLowerCase()
}

function buildProjectText(project: ServiceMatcherProject): string {
  return [project.trade, project.projectType, project.aiSummary, project.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function isTradeCompatible(
  serviceProfile: ServiceMatcherServiceProfile,
  businessProfile: ServiceMatcherBusinessProfile | null | undefined
): boolean {
  if (!businessProfile) return false
  const category = normalize(serviceProfile.category)
  if (!category) return false
  const primaryTrade = normalize(businessProfile.primary_trade)
  if (primaryTrade && (category.includes(primaryTrade) || primaryTrade.includes(category))) return true
  const specialties = (businessProfile.specialties || []).map(normalize)
  return specialties.some((s) => s && (category.includes(s) || s.includes(category)))
}

/**
 * Compare le référentiel métier (profil métier + profils de prestations) au
 * projet en cours et renvoie les correspondances explicables, triées par
 * confiance décroissante. Ne renvoie que des prestations actives.
 */
export function matchProjectToServices(
  project: ServiceMatcherProject,
  businessProfile: ServiceMatcherBusinessProfile | null | undefined,
  serviceProfiles: ServiceMatcherServiceProfile[] | null | undefined
): ServiceMatchResult[] {
  const profiles = (serviceProfiles || []).filter((p) => p.is_active)
  if (profiles.length === 0) return []

  const projectText = buildProjectText(project)
  const hasBudget = Boolean(project.budget && project.budget.trim())
  const hasPhotos = (project.photosCount || 0) > 0

  const results: ServiceMatchResult[] = []

  for (const serviceProfile of profiles) {
    let score = 0
    const reasons: string[] = []

    const matchedKeyword = (serviceProfile.detection_keywords || []).find((keyword) => {
      const normalizedKeyword = normalize(keyword)
      return normalizedKeyword.length >= 3 && projectText.includes(normalizedKeyword)
    })
    if (matchedKeyword) {
      score += 45
      reasons.push(`✓ mot-clé "${matchedKeyword}"`)
    }

    if (isTradeCompatible(serviceProfile, businessProfile)) {
      score += 25
      reasons.push('✓ compatible métier')
    }

    const normalizedName = normalize(serviceProfile.name)
    if (normalizedName && normalizedName.length >= 3 && projectText.includes(normalizedName)) {
      score += 15
      reasons.push(`✓ nom de prestation reconnu dans le projet ("${serviceProfile.name}")`)
    }

    const normalizedCategory = normalize(serviceProfile.category)
    const normalizedProjectType = normalize(project.projectType)
    if (normalizedCategory && normalizedProjectType && normalizedCategory === normalizedProjectType) {
      score += 15
      reasons.push('✓ type de projet correspondant')
    }

    // Le budget et les photos ne sont que des signaux complémentaires : ils
    // ne suffisent jamais à eux seuls à faire apparaître une prestation sans
    // lien identifié avec le projet (mot-clé, métier, nom ou type de projet).
    if (score <= 0) continue

    // Le filtre `is_active` ci-dessus garantit que toute prestation retenue
    // ici est active : on l'explicite une fois la prestation qualifiée.
    score += 10
    reasons.push('✓ prestation active')

    if (serviceProfile.required_photos && hasPhotos) {
      score += 5
      reasons.push('✓ photos présentes')
    }

    if (hasBudget) {
      score += 5
      reasons.push('✓ budget renseigné')
    }

    results.push({
      serviceProfile,
      confidence: Math.min(95, score),
      reasons,
      recommendedQuoteLines: serviceProfile.recommended_quote_lines || [],
      estimatedDuration: serviceProfile.average_duration_minutes ?? null,
      vatRate: serviceProfile.default_vat_rate ?? null,
    })
  }

  return results.sort((a, b) => b.confidence - a.confidence)
}

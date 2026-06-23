// Helpers de mise en forme des mentions légales/devis, partagés par les deux
// générateurs de PDF (HTML preview et pdf-lib) afin d'éviter toute divergence.

export function formatFullAddress(parts: {
  address?: string | null
  postalCode?: string | null
  city?: string | null
}): string {
  const address = (parts.address || '').trim()
  const postalCode = (parts.postalCode || '').trim()
  const city = (parts.city || '').trim()

  // Si l'adresse contient déjà le code postal et/ou la ville (cas des champs
  // pré-remplis via autocomplete), on évite de les répéter.
  const cityPart = [postalCode, city].filter(Boolean).join(' ')
  if (cityPart && address.toLowerCase().includes(cityPart.toLowerCase())) {
    return address
  }
  if (postalCode && city && address.toLowerCase().includes(postalCode) && address.toLowerCase().includes(city.toLowerCase())) {
    return address
  }

  return [address, cityPart].filter(Boolean).join(', ')
}

export type VatMode = 'vat_applicable' | 'vat_exempt_293b'
export type QuotePricingType = 'free' | 'paid'

// Mission "complete quote compliance mentions" — par defaut (rien configure),
// on affiche "Devis gratuit" plutot que de ne rien afficher.
export function getPricingMention(quoteSettings?: {
  quotePricingType?: QuotePricingType
  quoteFeeAmountTTC?: number | null
  quoteFeeDeductible?: boolean
} | null): string {
  const pricingType = quoteSettings?.quotePricingType || 'free'
  if (pricingType === 'free') return 'Devis gratuit'
  const amount = quoteSettings?.quoteFeeAmountTTC
  if (!amount || amount <= 0) return 'Devis payant'
  const deductible = quoteSettings?.quoteFeeDeductible
    ? ' Coût du devis déductible en cas d\'acceptation.'
    : ''
  return `Devis payant : ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC${deductible}`
}

export function getVatExemptionMention(vatMode?: VatMode): string | null {
  if (vatMode === 'vat_exempt_293b') return 'TVA non applicable, art. 293 B du CGI'
  return null
}

// Delai d'intervention, distinct de la date de validite du devis.
// Priorite : champ specifique du devis > valeur par defaut artisan > fallback generique.
export function getDelayMention(devisDelay?: string | null, defaultEstimatedDelay?: string | null): string {
  const value = (devisDelay || '').trim() || (defaultEstimatedDelay || '').trim()
  return value || 'Délai d\'intervention : à convenir avec le client.'
}

export type InsuranceQuoteSettings = {
  insuranceEnabled?: boolean
  insuranceType?: 'rc_pro' | 'decennale' | 'rc_pro_decennale'
  insuranceCompany?: string
  insurancePolicyNumber?: string
  insuranceCoveredActivities?: string
  insuranceGeographicCoverage?: string
  insuranceProviderAddress?: string
}

// Bloc assurance detaille, en lignes distinctes (mission "PDF : assurance detaillee").
// Retourne null si l'assurance n'est pas activee ou si aucune information n'est renseignee.
export function getInsuranceLines(quoteSettings?: InsuranceQuoteSettings | null): string[] | null {
  if (!quoteSettings?.insuranceEnabled) return null
  const hasAnyDetail =
    quoteSettings.insuranceCompany ||
    quoteSettings.insurancePolicyNumber ||
    quoteSettings.insuranceCoveredActivities ||
    quoteSettings.insuranceGeographicCoverage
  if (!hasAnyDetail) return null

  const typeLabel =
    quoteSettings.insuranceType === 'decennale'
      ? 'Garantie décennale'
      : quoteSettings.insuranceType === 'rc_pro_decennale'
        ? 'RC Pro + Garantie décennale'
        : 'RC Pro'

  const lines = ['Assurance professionnelle', `Type : ${typeLabel}`]
  if (quoteSettings.insuranceCompany) lines.push(`Assureur : ${quoteSettings.insuranceCompany}`)
  if (quoteSettings.insurancePolicyNumber) lines.push(`N° de police : ${quoteSettings.insurancePolicyNumber}`)
  if (quoteSettings.insuranceCoveredActivities) lines.push(`Activités couvertes : ${quoteSettings.insuranceCoveredActivities}`)
  if (quoteSettings.insuranceGeographicCoverage) lines.push(`Zone géographique couverte : ${quoteSettings.insuranceGeographicCoverage}`)
  if (quoteSettings.insuranceProviderAddress) lines.push(`Adresse assureur : ${quoteSettings.insuranceProviderAddress}`)
  return lines
}

// Conservee pour les appelants qui veulent une mention assurance sur une seule ligne.
export function getInsuranceMention(quoteSettings?: InsuranceQuoteSettings | null): string | null {
  const lines = getInsuranceLines(quoteSettings)
  return lines ? lines.join(' — ') : null
}

type LineLike = { description?: string }

function linesMatch(lines: LineLike[] | undefined, keywords: string[]): boolean {
  if (!lines?.length) return false
  return lines.some((line) => {
    const text = (line.description || '').toLowerCase()
    return keywords.some((keyword) => text.includes(keyword))
  })
}

export function hasLaborLine(lines?: LineLike[]): boolean {
  return linesMatch(lines, ['main-d\'œuvre', 'main d\'œuvre', "main-d'oeuvre", "main d'oeuvre", 'main d\'oeuvre'])
}

export function hasTravelLine(lines?: LineLike[]): boolean {
  return linesMatch(lines, ['déplacement', 'deplacement'])
}

export type LaborMentionMode = 'included' | 'detailed' | 'not_applicable'
export type TravelFeeMentionMode = 'included' | 'detailed' | 'not_charged' | 'not_applicable'

export function getLaborMention(mode: LaborMentionMode | undefined, lines: LineLike[] | undefined): string | null {
  if (mode === 'included' && !hasLaborLine(lines)) {
    return 'Main-d\'œuvre incluse dans les prestations forfaitaires sauf mention contraire.'
  }
  return null
}

export function getTravelFeeMention(mode: TravelFeeMentionMode | undefined, lines: LineLike[] | undefined): string | null {
  if (hasTravelLine(lines)) return null
  if (mode === 'included') return 'Frais de déplacement inclus dans les prestations sauf mention contraire.'
  if (mode === 'not_charged') return 'Frais de déplacement non facturés.'
  return null
}

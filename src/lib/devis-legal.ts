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

export function getPricingMention(quoteSettings?: {
  quotePricingType?: QuotePricingType
  quoteFeeAmountTTC?: number | null
  quoteFeeDeductible?: boolean
} | null): string | null {
  if (!quoteSettings?.quotePricingType) return null
  if (quoteSettings.quotePricingType === 'free') return 'Devis gratuit'
  const amount = quoteSettings.quoteFeeAmountTTC
  if (!amount || amount <= 0) return 'Devis payant'
  const deductible = quoteSettings.quoteFeeDeductible
    ? ' (déductible du montant des travaux en cas d\'acceptation)'
    : ''
  return `Devis payant : ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC${deductible}`
}

export function getVatExemptionMention(vatMode?: VatMode): string | null {
  if (vatMode === 'vat_exempt_293b') return 'TVA non applicable, art. 293 B du CGI'
  return null
}

export function getInsuranceMention(quoteSettings?: {
  insuranceEnabled?: boolean
  insuranceType?: 'rc_pro' | 'decennale' | 'rc_pro_decennale'
  insuranceCompany?: string
  insurancePolicyNumber?: string
  insuranceCoveredActivities?: string
  insuranceGeographicCoverage?: string
} | null): string | null {
  if (!quoteSettings?.insuranceEnabled || !quoteSettings.insuranceCompany) return null

  const typeLabel =
    quoteSettings.insuranceType === 'decennale'
      ? 'Assurance décennale'
      : quoteSettings.insuranceType === 'rc_pro_decennale'
        ? 'Assurance RC professionnelle et décennale'
        : 'Assurance responsabilité civile professionnelle'

  const parts = [`${typeLabel} : ${quoteSettings.insuranceCompany}`]
  if (quoteSettings.insurancePolicyNumber) parts.push(`N° ${quoteSettings.insurancePolicyNumber}`)
  if (quoteSettings.insuranceCoveredActivities) parts.push(`Activités couvertes : ${quoteSettings.insuranceCoveredActivities}`)
  if (quoteSettings.insuranceGeographicCoverage) parts.push(`Couverture géographique : ${quoteSettings.insuranceGeographicCoverage}`)
  return parts.join(' — ')
}

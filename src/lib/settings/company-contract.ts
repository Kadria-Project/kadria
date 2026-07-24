import type { CompanySettingsValues } from '@/src/components/settings/sections/CompanySettingsSection'

export type CompanySettingsDomain = 'identity' | 'contact' | 'branding' | 'legal'
export type CompanySettingsPatch = Partial<CompanySettingsValues>

export const COMPANY_FIELDS: Record<CompanySettingsDomain, readonly (keyof CompanySettingsValues)[]> = {
  identity: ['companyName', 'raisonSociale', 'websiteUrl', 'googleReviewUrl'],
  contact: ['phone', 'notificationEmail', 'adressePro', 'cpPro', 'villePro'],
  branding: ['logoUrl'],
  legal: ['formeJuridique', 'siret', 'tvaNumber', 'tvaAssujetti', 'assureur', 'numAssurance', 'assuranceNonRequise', 'devisMentionLegale'],
}

export function companyPanelStatus(domain: CompanySettingsDomain, values: CompanySettingsValues): 'complete' | 'incomplete' | 'optional' {
  if (domain === 'branding') return values.logoUrl ? 'complete' : 'optional'
  if (domain === 'legal') return values.siret || values.assuranceNonRequise || values.assureur ? 'complete' : 'incomplete'
  if (domain === 'contact') return values.phone || values.notificationEmail || values.adressePro ? 'complete' : 'incomplete'
  return values.companyName ? 'complete' : 'incomplete'
}

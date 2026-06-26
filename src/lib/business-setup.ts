// Helpers pour l'assistant de configuration métier (BusinessSetupWizard).
//
// Transforme les réponses du wizard en payloads prêts à envoyer aux routes
// existantes (business-profile, service-profiles). Aucune nouvelle table,
// aucune donnée inventée : les champs facultatifs laissés vides restent
// `undefined`/non envoyés plutôt que remplis par une valeur par défaut.

import { ServiceProfileTemplate, serviceProfileTemplateToPayload } from '@/src/lib/service-profile-templates'

export interface WizardWorkMethodAnswers {
  travelBilled: boolean
  acceptsEmergencies: boolean
  requiresPhotosBeforeVisit: boolean
  prefersAppointmentBeforeQuote: boolean
  worksOnSaturday: boolean
}

export interface WizardPricingAnswers {
  hourlyRateHt: string
  travelFeeHt: string
  defaultVatRate: string
  diagnosticFeeHt: string
  defaultMarginPercent: string
  paymentTerms: string
}

export interface WizardZoneAnswers {
  baseCity: string
  interventionRadiusKm: string
  workStartTime: string
  workEndTime: string
  workingDays: string[]
}

/**
 * Construit le payload PATCH /api/artisan/business-profile à partir des
 * réponses du wizard. Les champs texte/nombre vides ne sont pas envoyés afin
 * de ne jamais écraser une valeur existante par une chaîne vide.
 */
export function buildBusinessProfilePayloadFromWizard(
  primaryTrade: string,
  workMethod: WizardWorkMethodAnswers,
  pricing: WizardPricingAnswers,
  zone: WizardZoneAnswers
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    primaryTrade,
    urgentAvailable: workMethod.acceptsEmergencies,
  }

  if (pricing.hourlyRateHt.trim()) fields.hourlyRateHt = Number(pricing.hourlyRateHt.replace(',', '.'))
  if (pricing.travelFeeHt.trim()) fields.travelFeeHt = Number(pricing.travelFeeHt.replace(',', '.'))
  if (pricing.defaultVatRate.trim()) fields.defaultVatRate = Number(pricing.defaultVatRate.replace(',', '.'))
  if (pricing.diagnosticFeeHt.trim()) fields.diagnosticFeeHt = Number(pricing.diagnosticFeeHt.replace(',', '.'))
  if (pricing.defaultMarginPercent.trim()) fields.defaultMarginPercent = Number(pricing.defaultMarginPercent.replace(',', '.'))
  if (pricing.paymentTerms.trim()) fields.paymentTerms = pricing.paymentTerms.trim()

  if (zone.baseCity.trim()) fields.baseCity = zone.baseCity.trim()
  if (zone.interventionRadiusKm.trim()) fields.interventionRadiusKm = Number(zone.interventionRadiusKm.replace(',', '.'))
  if (zone.workStartTime.trim()) fields.workStartTime = zone.workStartTime.trim()
  if (zone.workEndTime.trim()) fields.workEndTime = zone.workEndTime.trim()
  if (zone.workingDays.length > 0) fields.workingDays = zone.workingDays

  return fields
}

/**
 * Transforme un modèle de prestation en payload service_profiles, en
 * appliquant les réponses "méthode de travail" du wizard sur les champs
 * concernés (travel_required, emergency_supported, required_photos,
 * appointment_recommended) plutôt que les valeurs par défaut du modèle.
 */
export function serviceProfileTemplateToWizardPayload(
  template: ServiceProfileTemplate,
  workMethod: WizardWorkMethodAnswers
): Record<string, unknown> {
  const base = serviceProfileTemplateToPayload(template)
  return {
    ...base,
    travelRequired: workMethod.travelBilled ? base.travelRequired : false,
    emergencySupported: workMethod.acceptsEmergencies ? base.emergencySupported : false,
    requiredPhotos: workMethod.requiresPhotosBeforeVisit ? true : base.requiredPhotos,
    appointmentRecommended: workMethod.prefersAppointmentBeforeQuote ? true : base.appointmentRecommended,
  }
}

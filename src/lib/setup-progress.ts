// Centre de configuration progressif : calcule un score de preparation
// simple et explicable a partir de donnees deja declarees par l'artisan.
// Aucune IA, aucune donnee inventee : chaque etape est "done" ou "todo"
// selon des champs reellement renseignes.

export interface SetupProgressBusinessProfile {
  primaryTrade?: string | null
  baseCity?: string | null
  interventionRadiusKm?: string | number | null
  hourlyRateHt?: string | number | null
  defaultVatRate?: string | number | null
  workingDays?: string[] | null
  workStartTime?: string | null
  workEndTime?: string | null
}

export interface SetupProgressArtisanConfig {
  companyName?: string | null
  phone?: string | null
  villePro?: string | null
  address?: string | null
  artisanId?: string | null
  googleReviewUrl?: string | null
  depositEnabled?: boolean | null
  devisConditionsPaiement?: string | null
  stripeConnectStatus?: string | null
  businessConfig?: {
    calendarMode?: string | null
    serviceCatalog?: unknown[] | null
  } | null
}

export interface SetupProgressServiceProfile {
  id?: string
}

export interface SetupProgressCalendarIntegration {
  connected?: boolean | null
}

export interface ComputeSetupProgressInput {
  businessProfile?: SetupProgressBusinessProfile | null
  serviceProfiles?: SetupProgressServiceProfile[] | null
  calendarIntegration?: SetupProgressCalendarIntegration | null
  artisanConfig?: SetupProgressArtisanConfig | null
}

export type SetupStepStatus = 'done' | 'todo'
export type SetupStepCategory = 'essential' | 'recommended'

export interface SetupProgressStep {
  key: string
  label: string
  description: string
  status: SetupStepStatus
  category: SetupStepCategory
  ctaLabel: string
  href: string
  priority: number
}

export interface SetupProgressResult {
  percent: number
  completedSteps: number
  totalSteps: number
  steps: SetupProgressStep[]
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasValue(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'number') return Number.isFinite(value)
  return value.trim().length > 0
}

/**
 * Calcule le score de preparation du profil metier de l'artisan. Score
 * simple : nombre d'etapes "done" / nombre total d'etapes, sans ponderation
 * ni heuristique cachee : chaque etape est explicable individuellement.
 */
export function computeSetupProgress(input: ComputeSetupProgressInput): SetupProgressResult {
  const businessProfile = input.businessProfile || null
  const serviceProfiles = input.serviceProfiles || []
  const calendarIntegration = input.calendarIntegration || null
  const artisanConfig = input.artisanConfig || null
  const calendarMode = artisanConfig?.businessConfig?.calendarMode === 'google' ? 'google' : 'kadria'
  const serviceCatalogCount = Array.isArray(artisanConfig?.businessConfig?.serviceCatalog)
    ? artisanConfig?.businessConfig?.serviceCatalog?.length || 0
    : 0

  const entrepriseDone =
    hasText(artisanConfig?.companyName) && hasText(artisanConfig?.phone) &&
    (hasText(artisanConfig?.villePro) || hasText(artisanConfig?.address) || hasText(businessProfile?.baseCity))

  const steps: SetupProgressStep[] = [
    {
      key: 'entreprise',
      label: 'Entreprise renseignee',
      description: "Nom de l'entreprise, telephone et commune.",
      status: entrepriseDone ? 'done' : 'todo',
      category: 'essential',
      ctaLabel: 'Completer mon entreprise',
      href: '/parametres/entreprise',
      priority: 1,
    },
    {
      key: 'metier',
      label: 'Metier principal renseigne',
      description: 'Le metier principal permet a Kadria de qualifier vos demandes.',
      status: hasText(businessProfile?.primaryTrade) ? 'done' : 'todo',
      category: 'essential',
      ctaLabel: 'Renseigner mon metier',
      href: '/parametres/activite',
      priority: 2,
    },
    {
      key: 'zone',
      label: "Zone d'intervention",
      description: "Ville de depart et rayon d'intervention.",
      status: hasText(businessProfile?.baseCity) && hasValue(businessProfile?.interventionRadiusKm) ? 'done' : 'todo',
      category: 'essential',
      ctaLabel: 'Definir ma zone',
      href: '/parametres/entreprise',
      priority: 4,
    },
    {
      key: 'tarifs',
      label: 'Tarifs de base',
      description: 'Tarif horaire ou TVA par defaut.',
      status: hasValue(businessProfile?.hourlyRateHt) || hasValue(businessProfile?.defaultVatRate) ? 'done' : 'todo',
      category: 'essential',
      ctaLabel: 'Renseigner mes tarifs',
      href: '/parametres/activite',
      priority: 5,
    },
    {
      key: 'prestations',
      label: 'Prestations configurees',
      description: 'Au moins une fiche prestation dans votre bibliotheque.',
      status: serviceProfiles.length > 0 || serviceCatalogCount > 0 ? 'done' : 'todo',
      category: 'essential',
      ctaLabel: 'Configurer mes prestations',
      href: '/parametres/activite',
      priority: 3,
    },
    {
      key: 'devis',
      label: 'Conditions de paiement / devis',
      description: 'Base utile pour vos devis et votre suivi commercial.',
      status: hasText(artisanConfig?.devisConditionsPaiement) ? 'done' : 'todo',
      category: 'essential',
      ctaLabel: 'Configurer mes devis',
      href: '/parametres/activite',
      priority: 6,
    },
    {
      key: 'calendar',
      label: 'Agenda configure',
      description: 'Choisissez Planning Kadria ou connectez Google Calendar.',
      status: calendarMode === 'kadria' || calendarIntegration?.connected ? 'done' : 'todo',
      category: 'recommended',
      ctaLabel: 'Configurer mon agenda',
      href: '/dashboard-v2',
      priority: 9,
    },
    {
      key: 'horaires',
      label: 'Horaires renseignes',
      description: 'Jours travailles et creneaux horaires habituels.',
      status: (businessProfile?.workingDays || []).length > 0 && hasText(businessProfile?.workStartTime) && hasText(businessProfile?.workEndTime) ? 'done' : 'todo',
      category: 'recommended',
      ctaLabel: 'Renseigner mes horaires',
      href: '/parametres/activite',
      priority: 10,
    },
    {
      key: 'google_review',
      label: 'Lien avis Google',
      description: "Permet d'envoyer plus facilement des demandes d'avis.",
      status: hasText(artisanConfig?.googleReviewUrl) ? 'done' : 'todo',
      category: 'recommended',
      ctaLabel: 'Ajouter le lien',
      href: '/parametres/entreprise',
      priority: 11,
    },
    {
      key: 'deposit',
      label: 'Acomptes actives',
      description: 'Activez les acomptes pour securiser vos chantiers.',
      status: artisanConfig?.depositEnabled ? 'done' : 'todo',
      category: 'recommended',
      ctaLabel: 'Activer',
      href: '/parametres/activite',
      priority: 12,
    },
    {
      key: 'stripe_connect',
      label: 'Stripe connecte',
      description: 'Necessaire seulement si vous voulez encaisser des acomptes en ligne.',
      status: artisanConfig?.stripeConnectStatus === 'active' ? 'done' : 'todo',
      category: 'recommended',
      ctaLabel: 'Connecter',
      href: '/parametres/activite',
      priority: 13,
    },
    {
      key: 'widget',
      label: 'Widget / lien projet',
      description: 'Votre lien projet peut deja etre partage ou installe sur votre site.',
      status: hasText(artisanConfig?.artisanId) ? 'done' : 'todo',
      category: 'recommended',
      ctaLabel: 'Ouvrir',
      href: '/parametres/assistants',
      priority: 8,
    },
  ]

  const scoredSteps = steps.filter((s) => s.category === 'essential')
  const completedSteps = scoredSteps.filter((s) => s.status === 'done').length
  const totalSteps = scoredSteps.length
  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  return { percent, completedSteps, totalSteps, steps }
}

export type SetupProgressBand = 'a_demarrer' | 'a_completer' | 'presque_pret' | 'complet'

export interface SetupProgressBandInfo {
  key: SetupProgressBand
  label: string
}

/**
 * Categorise un pourcentage deja calcule par computeSetupProgress en bande
 * d'affichage admin. Ne recalcule rien, ne fait que classer une valeur.
 */
export function getSetupProgressBand(percent: number): SetupProgressBandInfo {
  if (percent >= 100) return { key: 'complet', label: 'Complet' }
  if (percent >= 71) return { key: 'presque_pret', label: 'Presque pret' }
  if (percent >= 26) return { key: 'a_completer', label: 'A completer' }
  return { key: 'a_demarrer', label: 'A demarrer' }
}

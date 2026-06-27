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
  businessConfig?: {
    calendarMode?: string | null
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

export interface SetupProgressStep {
  key: string
  label: string
  description: string
  status: SetupStepStatus
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

  const entrepriseDone =
    hasText(artisanConfig?.companyName) && hasText(artisanConfig?.phone) &&
    (hasText(artisanConfig?.villePro) || hasText(artisanConfig?.address) || hasText(businessProfile?.baseCity))

  const steps: SetupProgressStep[] = [
    {
      key: 'entreprise',
      label: 'Entreprise renseignee',
      description: "Nom de l'entreprise, telephone et commune.",
      status: entrepriseDone ? 'done' : 'todo',
      ctaLabel: 'Completer mon entreprise',
      href: '/parametres/profil-metier',
      priority: 1,
    },
    {
      key: 'metier',
      label: 'Metier principal renseigne',
      description: 'Le metier principal permet a Kadria de qualifier vos demandes.',
      status: hasText(businessProfile?.primaryTrade) ? 'done' : 'todo',
      ctaLabel: 'Renseigner mon metier',
      href: '/parametres/profil-metier',
      priority: 2,
    },
    {
      key: 'zone',
      label: "Zone d'intervention",
      description: "Ville de depart et rayon d'intervention.",
      status: hasText(businessProfile?.baseCity) && hasValue(businessProfile?.interventionRadiusKm) ? 'done' : 'todo',
      ctaLabel: 'Definir ma zone',
      href: '/parametres/profil-metier',
      priority: 4,
    },
    {
      key: 'tarifs',
      label: 'Tarifs de base',
      description: 'Tarif horaire ou TVA par defaut.',
      status: hasValue(businessProfile?.hourlyRateHt) || hasValue(businessProfile?.defaultVatRate) ? 'done' : 'todo',
      ctaLabel: 'Renseigner mes tarifs',
      href: '/parametres/profil-metier',
      priority: 5,
    },
    {
      key: 'prestations',
      label: 'Prestations configurees',
      description: 'Au moins une fiche prestation dans votre bibliotheque.',
      status: serviceProfiles.length > 0 ? 'done' : 'todo',
      ctaLabel: 'Configurer mes prestations',
      href: '/parametres/profil-metier',
      priority: 3,
    },
    {
      key: 'calendar',
      label: 'Agenda configure',
      description: 'Choisissez Planning Kadria ou connectez Google Calendar.',
      status: calendarMode === 'kadria' || calendarIntegration?.connected ? 'done' : 'todo',
      ctaLabel: 'Configurer mon agenda',
      href: '/dashboard-v2',
      priority: 7,
    },
    {
      key: 'horaires',
      label: 'Horaires renseignes',
      description: 'Jours travailles et creneaux horaires habituels.',
      status: (businessProfile?.workingDays || []).length > 0 && hasText(businessProfile?.workStartTime) && hasText(businessProfile?.workEndTime) ? 'done' : 'todo',
      ctaLabel: 'Renseigner mes horaires',
      href: '/parametres/profil-metier',
      priority: 6,
    },
  ]

  const completedSteps = steps.filter((s) => s.status === 'done').length
  const totalSteps = steps.length
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

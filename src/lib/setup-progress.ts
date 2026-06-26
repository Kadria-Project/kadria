// Centre de configuration progressif : calcule un score de préparation
// simple et explicable à partir de données déjà déclarées par l'artisan.
// Aucune IA, aucune donnée inventée — chaque étape est "done" ou "todo"
// selon des champs réellement renseignés.

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
 * Calcule le score de préparation du profil métier de l'artisan. Score
 * simple : nombre d'étapes "done" / nombre total d'étapes, sans pondération
 * ni heuristique cachée — chaque étape est explicable individuellement.
 */
export function computeSetupProgress(input: ComputeSetupProgressInput): SetupProgressResult {
  const businessProfile = input.businessProfile || null
  const serviceProfiles = input.serviceProfiles || []
  const calendarIntegration = input.calendarIntegration || null
  const artisanConfig = input.artisanConfig || null

  const entrepriseDone =
    hasText(artisanConfig?.companyName) && hasText(artisanConfig?.phone) &&
    (hasText(artisanConfig?.villePro) || hasText(artisanConfig?.address) || hasText(businessProfile?.baseCity))

  const steps: SetupProgressStep[] = [
    {
      key: 'entreprise',
      label: 'Entreprise renseignée',
      description: 'Nom de l\'entreprise, téléphone et commune.',
      status: entrepriseDone ? 'done' : 'todo',
      ctaLabel: 'Compléter mon entreprise',
      href: '/parametres/profil-metier',
      priority: 1,
    },
    {
      key: 'metier',
      label: 'Métier principal renseigné',
      description: 'Le métier principal permet à Kadria de qualifier vos demandes.',
      status: hasText(businessProfile?.primaryTrade) ? 'done' : 'todo',
      ctaLabel: 'Renseigner mon métier',
      href: '/parametres/profil-metier',
      priority: 2,
    },
    {
      key: 'zone',
      label: 'Zone d\'intervention',
      description: 'Ville de départ et rayon d\'intervention.',
      status: hasText(businessProfile?.baseCity) && hasValue(businessProfile?.interventionRadiusKm) ? 'done' : 'todo',
      ctaLabel: 'Définir ma zone',
      href: '/parametres/profil-metier',
      priority: 4,
    },
    {
      key: 'tarifs',
      label: 'Tarifs de base',
      description: 'Tarif horaire ou TVA par défaut.',
      status: hasValue(businessProfile?.hourlyRateHt) || hasValue(businessProfile?.defaultVatRate) ? 'done' : 'todo',
      ctaLabel: 'Renseigner mes tarifs',
      href: '/parametres/profil-metier',
      priority: 5,
    },
    {
      key: 'prestations',
      label: 'Prestations configurées',
      description: 'Au moins une fiche prestation dans votre bibliothèque.',
      status: serviceProfiles.length > 0 ? 'done' : 'todo',
      ctaLabel: 'Configurer mes prestations',
      href: '/parametres/profil-metier',
      priority: 3,
    },
    {
      key: 'calendar',
      label: 'Google Calendar connecté',
      description: 'Connectez votre agenda pour planifier vos rendez-vous.',
      status: calendarIntegration?.connected ? 'done' : 'todo',
      ctaLabel: 'Connecter Google Calendar',
      href: '/dashboard-v2',
      priority: 7,
    },
    {
      key: 'horaires',
      label: 'Horaires renseignés',
      description: 'Jours travaillés et créneaux horaires habituels.',
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
 * Catégorise un pourcentage déjà calculé par computeSetupProgress en bande
 * d'affichage admin. Ne recalcule rien, ne fait que classer une valeur.
 */
export function getSetupProgressBand(percent: number): SetupProgressBandInfo {
  if (percent >= 100) return { key: 'complet', label: 'Complet' }
  if (percent >= 71) return { key: 'presque_pret', label: 'Presque prêt' }
  if (percent >= 26) return { key: 'a_completer', label: 'À compléter' }
  return { key: 'a_demarrer', label: 'À démarrer' }
}

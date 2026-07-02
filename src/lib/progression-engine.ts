// Centre de progression : transforme le score brut de setup-progress.ts en
// recommandations motivantes. N'invente jamais de statistiques ni de gains
// chiffrés : chaque temps estimé est une constante éditoriale (temps pour
// compléter l'étape), chaque bénéfice est descriptif, jamais calculé.
import {
  computeSetupProgress,
  type ComputeSetupProgressInput,
  type SetupStepCategory,
  type SetupProgressResult,
  type SetupProgressStep,
} from '@/src/lib/setup-progress'

export interface ProgressNextStep {
  key: string
  title: string
  description: string
  estimatedTime: string
  priority: number
  category: SetupStepCategory
  benefits: string[]
  unlocks: string[]
  icon: string
  cta: string
  href: string
}

export interface ProgressRecommendations {
  progress: SetupProgressResult
  nextSteps: ProgressNextStep[]
  globalMessage: string
  estimatedCompletionTime: string
}

interface StepMeta {
  icon: string
  estimatedTime: string
  estimatedMinutes: number
  benefits: string[]
  unlocks: string[]
  cta: string
}

const STEP_META: Record<string, StepMeta> = {
  entreprise: {
    icon: '🏢',
    estimatedTime: '30 secondes',
    estimatedMinutes: 0.5,
    benefits: ['meilleure personnalisation', 'identité complète'],
    unlocks: ['Profil entreprise complet'],
    cta: 'Configurer',
  },
  metier: {
    icon: '🛠️',
    estimatedTime: '30 secondes',
    estimatedMinutes: 0.5,
    benefits: ['meilleure qualification de vos demandes', 'suggestions plus pertinentes'],
    unlocks: ['Qualification automatique des demandes'],
    cta: 'Configurer',
  },
  zone: {
    icon: '📍',
    estimatedTime: '30 secondes',
    estimatedMinutes: 0.5,
    benefits: ['filtrage intelligent', 'déplacements mieux évalués'],
    unlocks: ['Filtrage géographique des demandes'],
    cta: 'Configurer',
  },
  tarifs: {
    icon: '💶',
    estimatedTime: '1 minute',
    estimatedMinutes: 1,
    benefits: ['devis plus rapides', 'estimations cohérentes', 'moins de modifications'],
    unlocks: ['Devis pré-calculés'],
    cta: 'Configurer',
  },
  prestations: {
    icon: '📋',
    estimatedTime: '2 minutes',
    estimatedMinutes: 2,
    benefits: ['suggestions personnalisées', 'devis préremplis', 'meilleure qualification'],
    unlocks: ['Suggestions de devis personnalisées'],
    cta: 'Configurer',
  },
  calendar: {
    icon: '📅',
    estimatedTime: '1 minute',
    estimatedMinutes: 1,
    benefits: ['rendez-vous synchronisés', 'planning fiable', 'moins d\'oublis'],
    unlocks: ['Synchronisation de l\'agenda'],
    cta: 'Connecter',
  },
  horaires: {
    icon: '🕒',
    estimatedTime: '30 secondes',
    estimatedMinutes: 0.5,
    benefits: ['meilleure planification', 'créneaux plus cohérents'],
    unlocks: ['Créneaux de rendez-vous fiables'],
    cta: 'Configurer',
  },
}

const DEFAULT_META: StepMeta = {
  icon: '✨',
  estimatedTime: '1 minute',
  estimatedMinutes: 1,
  benefits: ['amélioration de votre profil'],
  unlocks: [],
  cta: 'Continuer',
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 minute'
  if (totalMinutes < 1) return '30 secondes'
  const rounded = Math.round(totalMinutes)
  return `${rounded} minute${rounded > 1 ? 's' : ''}`
}

function toNextStep(step: SetupProgressStep): ProgressNextStep {
  const meta = STEP_META[step.key] || DEFAULT_META
  return {
    key: step.key,
    title: step.label,
    description: step.description,
    estimatedTime: meta.estimatedTime,
    priority: step.priority,
    category: step.category,
    benefits: meta.benefits,
    unlocks: meta.unlocks,
    icon: meta.icon,
    cta: meta.cta,
    href: step.href,
  }
}

function buildGlobalMessage(progress: SetupProgressResult, estimatedCompletionTime: string): string {
  if (progress.percent >= 100) {
    return 'Votre entreprise est prête à 100 %. Toutes les fonctionnalités de Kadria peuvent désormais fonctionner à leur plein potentiel.'
  }
  return `Votre entreprise est déjà prête à ${progress.percent} %. Encore ${estimatedCompletionTime} et Kadria pourra préparer des devis plus pertinents, améliorer vos suggestions et accélérer votre qualification.`
}

/**
 * Calcule des recommandations de progression motivantes à partir du score
 * de computeSetupProgress(). N'effectue aucun nouveau calcul de score : se
 * limite à enrichir les étapes "todo" avec des bénéfices/temps déjà connus.
 */
export function computeProgressRecommendations(input: ComputeSetupProgressInput): ProgressRecommendations {
  const progress = computeSetupProgress(input)

  const todoSteps = progress.steps
    .filter((s) => s.status === 'todo')
    .sort((a, b) => a.priority - b.priority)

  const nextSteps = todoSteps.map(toNextStep)

  const totalMinutes = todoSteps.reduce((sum, step) => {
    const meta = STEP_META[step.key] || DEFAULT_META
    return sum + meta.estimatedMinutes
  }, 0)

  const estimatedCompletionTime = formatMinutes(totalMinutes)
  const globalMessage = buildGlobalMessage(progress, estimatedCompletionTime)

  return { progress, nextSteps, globalMessage, estimatedCompletionTime }
}

// Coach Kadria — couche d'orchestration, pas un moteur de scoring.
// Agrege les moteurs deja existants (Action Engine, Progression Engine,
// setup-progress, quotas, agenda) pour repondre a une seule question :
// "Qu'est-ce que je dois faire maintenant ?"
//
// Regle absolue : ne jamais inventer de donnees. Le Coach ne recalcule
// aucun score et ne fabrique aucune statistique — il lit uniquement les
// resultats deja produits par les moteurs en entree et les ordonne.
import type { NextAction } from '@/src/lib/action-engine'
import type { ProgressRecommendations } from '@/src/lib/progression-engine'
import type { SetupProgressResult } from '@/src/lib/setup-progress'

export type CoachPriorityLevel = 'low' | 'medium' | 'high' | 'critical'
export type CoachActionType =
  | 'progression_step'
  | 'project_action'
  | 'follow_up_quote'
  | 'schedule_appointment'
  | 'connect_calendar'
  | 'quota_alert'
  | 'monitor'

export interface CoachAction {
  title: string
  description: string
  ctaLabel: string
  href?: string
  actionType: CoachActionType
  priority: number
  estimatedTime?: string
}

export interface CoachWin {
  title: string
  description: string
}

export type CoachAlertSeverity = 'info' | 'warning' | 'critical'

export interface CoachAlert {
  title: string
  description: string
  severity: CoachAlertSeverity
}

export interface KadriaCoachResult {
  title: string
  message: string
  priorityLevel: CoachPriorityLevel
  primaryAction: CoachAction | null
  recommendations: CoachAction[]
  wins: CoachWin[]
  alerts: CoachAlert[]
}

export interface KadriaCoachProjectEntry {
  id?: string
  clientLabel: string
  action: NextAction
  href?: string
}

export interface KadriaCoachUsageSummary {
  projects?: { used: number; limit: number | null; unlimited: boolean; status: string }
  vapi?: { callsUsed: number; callsLimit: number | null; callsUnlimited: boolean; status: string }
  devis?: { used: number; limit: number | null; unlimited: boolean; status: string }
}

export interface KadriaCoachInput {
  projects: KadriaCoachProjectEntry[]
  progression: ProgressRecommendations | null
  setupProgress?: SetupProgressResult | null
  usageSummary?: KadriaCoachUsageSummary | null
  calendarStatus?: { connected: boolean } | null
}

function progressionStepAction(progression: ProgressRecommendations, priority: number): CoachAction | null {
  const step = progression.nextSteps[0]
  if (!step) return null
  return {
    title: step.title,
    description: `${step.benefits[0] ? `Débloque ${step.benefits[0]}.` : step.description}`,
    ctaLabel: step.cta,
    href: step.key === 'calendar' ? undefined : step.href,
    actionType: 'progression_step',
    priority,
    estimatedTime: step.estimatedTime,
  }
}

function quoteFollowUpEntries(projects: KadriaCoachProjectEntry[]): KadriaCoachProjectEntry[] {
  return projects.filter((p) => p.action.actionType === 'follow_up_quote')
}

function appointmentEntries(projects: KadriaCoachProjectEntry[]): KadriaCoachProjectEntry[] {
  return projects.filter((p) => p.action.actionType === 'schedule_appointment')
}

function criticalOrHighEntries(projects: KadriaCoachProjectEntry[]): KadriaCoachProjectEntry[] {
  return projects.filter((p) => p.action.priority === 'critical' || p.action.priority === 'high')
}

function toProjectAction(entry: KadriaCoachProjectEntry, priority: number): CoachAction {
  const actionType: CoachActionType =
    entry.action.actionType === 'follow_up_quote'
      ? 'follow_up_quote'
      : entry.action.actionType === 'schedule_appointment'
        ? 'schedule_appointment'
        : 'project_action'
  return {
    title: `${entry.action.title} — ${entry.clientLabel}`,
    description: entry.action.description,
    ctaLabel: entry.action.title,
    href: entry.href,
    actionType,
    priority,
    estimatedTime: entry.action.estimatedDuration,
  }
}

/**
 * Orchestration pure : aucun nouveau calcul metier. Lit Action Engine,
 * Progression Engine, quotas et agenda deja calcules, et determine la
 * recommandation prioritaire selon un ordre fixe de regles.
 */
export function computeKadriaCoach(input: KadriaCoachInput): KadriaCoachResult {
  const projects = input.projects || []
  const progression = input.progression || null
  const usage = input.usageSummary || null
  const calendarConnected = !!input.calendarStatus?.connected

  const candidates: CoachAction[] = []
  const alerts: CoachAlert[] = []
  const wins: CoachWin[] = []

  // 1. Profil metier incomplet : prochaine etape du Progression Engine.
  if (progression && progression.progress.percent < 100) {
    const step = progressionStepAction(progression, 1)
    if (step) candidates.push(step)
  }

  // 2. Actions critiques/hautes issues de l'Action Engine.
  const urgent = criticalOrHighEntries(projects)
  urgent.forEach((entry) => candidates.push(toProjectAction(entry, entry.action.priority === 'critical' ? 0 : 2)))

  // 3. Devis a relancer (deja inclus si critique/high, sinon remontes ici).
  quoteFollowUpEntries(projects)
    .filter((entry) => entry.action.priority !== 'critical' && entry.action.priority !== 'high')
    .forEach((entry) => candidates.push(toProjectAction(entry, 3)))

  // 4. Rendez-vous a planifier.
  appointmentEntries(projects)
    .filter((entry) => entry.action.priority !== 'critical' && entry.action.priority !== 'high')
    .forEach((entry) => candidates.push(toProjectAction(entry, 4)))

  // 5. Google Calendar non connecte (remonte seulement si rien de plus urgent).
  if (!calendarConnected && progression?.progress.steps.some((s) => s.key === 'calendar' && s.status === 'todo')) {
    candidates.push({
      title: 'Connecter Google Calendar',
      description: 'Synchronisez vos rendez-vous et fiabilisez votre planning.',
      ctaLabel: 'Connecter',
      actionType: 'connect_calendar',
      priority: 5,
    })
  }

  candidates.sort((a, b) => a.priority - b.priority)

  // -- Alertes (quotas, configuration, activite).
  if (usage?.projects?.status === 'warning' || usage?.projects?.status === 'limit_reached' || usage?.projects?.status === 'exceeded') {
    alerts.push({
      title: 'Quota de dossiers',
      description: 'Vous approchez ou avez atteint la limite de dossiers de votre offre.',
      severity: usage.projects.status === 'warning' ? 'warning' : 'critical',
    })
  }
  if (usage?.vapi?.status === 'warning' || usage?.vapi?.status === 'limit_reached' || usage?.vapi?.status === 'exceeded') {
    alerts.push({
      title: 'Quota d\'appels vocaux',
      description: 'Vous approchez ou avez atteint la limite d\'appels vocaux de votre offre.',
      severity: usage.vapi.status === 'warning' ? 'warning' : 'critical',
    })
  }
  if (projects.length === 0) {
    alerts.push({
      title: 'Aucun dossier actif',
      description: 'Vous n\'avez pas encore de dossier actif.',
      severity: 'info',
    })
  }
  if (progression && progression.progress.steps.find((s) => s.key === 'prestations')?.status === 'todo') {
    alerts.push({
      title: 'Aucune prestation configurée',
      description: 'Configurer vos prestations améliorera vos suggestions de devis.',
      severity: 'info',
    })
  }

  // -- Petites reussites, uniquement a partir de donnees deja disponibles.
  if (progression) {
    progression.progress.steps
      .filter((s) => s.status === 'done')
      .forEach((s) => {
        if (s.key === 'entreprise') wins.push({ title: 'Profil métier complet', description: 'Votre entreprise est renseignée.' })
        if (s.key === 'calendar') wins.push({ title: 'Google Calendar connecté', description: 'Votre agenda est synchronisé.' })
        if (s.key === 'prestations') wins.push({ title: 'Prestations configurées', description: 'Votre bibliothèque de prestations est prête.' })
      })
  }
  if (projects.length > 0) {
    wins.push({ title: `${projects.length} dossier${projects.length > 1 ? 's' : ''} actif${projects.length > 1 ? 's' : ''}`, description: 'Des dossiers sont en cours de suivi.' })
  }
  const sentQuotesCount = quoteFollowUpEntries(projects).length
  if (sentQuotesCount > 0) {
    wins.push({ title: `${sentQuotesCount} devis envoyé${sentQuotesCount > 1 ? 's' : ''}`, description: 'En attente de réponse client.' })
  }

  const primaryAction = candidates[0] || null
  const recommendations = candidates.slice(1, 3)

  const criticalCount = candidates.filter((c) => c.priority === 0).length
  const priorityLevel: CoachPriorityLevel =
    criticalCount > 0 || alerts.some((a) => a.severity === 'critical')
      ? 'critical'
      : candidates.some((c) => c.priority <= 2) || alerts.some((a) => a.severity === 'warning')
        ? 'high'
        : primaryAction
          ? 'medium'
          : 'low'

  const recommendationCount = primaryAction ? 1 + recommendations.length : 0
  const title = '👋 Coach Kadria'
  const message = primaryAction
    ? `Aujourd'hui, je vous recommande ${recommendationCount} action${recommendationCount > 1 ? 's' : ''}.`
    : 'Tout est sous contrôle : aucune action prioritaire pour le moment.'

  return { title, message, priorityLevel, primaryAction, recommendations, wins, alerts }
}

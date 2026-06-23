import type { PlanKey } from '@/src/config/plans'
import type { MonthlyUsageSummary } from '@/src/lib/usage/quotas'

export type ClientHealthStatus =
  | 'healthy'
  | 'watch'
  | 'quota_warning'
  | 'upgrade_opportunity'
  | 'inactive'

export interface ClientHealthResult {
  status: ClientHealthStatus
  reasons: string[]
  recommendation: string
}

const HEALTH_LABELS: Record<ClientHealthStatus, string> = {
  healthy: 'Sain',
  watch: 'À surveiller',
  quota_warning: 'Alerte quota',
  upgrade_opportunity: 'Upgrade recommandé',
  inactive: 'Client inactif',
}

export function getClientHealthLabel(status: ClientHealthStatus): string {
  return HEALTH_LABELS[status]
}

const INACTIVITY_DAYS_THRESHOLD = 30

function daysSince(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export interface ClientHealthInput {
  plan: PlanKey
  statut: string
  lastLogin?: string | null
  createdAt?: string | null
  usage?: Pick<MonthlyUsageSummary, 'projects' | 'vapi' | 'devis'> | null
}

/**
 * Déterministe : aucune IA, aucune donnée inventée. Si une donnée manque,
 * on traite prudemment (statut "watch" plutôt qu'un faux positif).
 */
export function computeClientHealth(input: ClientHealthInput): ClientHealthResult {
  const { plan, statut, lastLogin, createdAt, usage } = input
  const reasons: string[] = []

  if (statut === 'Suspendu') {
    return {
      status: 'inactive',
      reasons: ['Compte suspendu'],
      recommendation: 'Compte actuellement suspendu — aucune action requise sauf demande du client.',
    }
  }
  if (statut === 'Résilié') {
    return {
      status: 'inactive',
      reasons: ['Abonnement résilié'],
      recommendation: 'Abonnement résilié — client hors cockpit actif.',
    }
  }

  if (!usage) {
    return {
      status: 'watch',
      reasons: ['Données d’usage indisponibles'],
      recommendation: 'Pas assez de données pour évaluer ce client pour le moment.',
    }
  }

  const projectsUsed = usage.projects.used
  const vapiUsed = usage.vapi.callsUsed
  const devisUsed = usage.devis.used
  const noActivityThisMonth = projectsUsed === 0 && vapiUsed === 0 && devisUsed === 0
  const lastLoginDays = daysSince(lastLogin)
  const accountAgeDays = daysSince(createdAt)
  const accountIsOldEnough = accountAgeDays === null || accountAgeDays >= INACTIVITY_DAYS_THRESHOLD

  const isInactive =
    noActivityThisMonth &&
    accountIsOldEnough &&
    (lastLoginDays === null || lastLoginDays >= INACTIVITY_DAYS_THRESHOLD)

  if (isInactive) {
    reasons.push('Aucun dossier, devis ou appel vocal ce mois-ci')
    if (lastLoginDays !== null) {
      reasons.push(`Dernière connexion il y a ${lastLoginDays} jours`)
    } else {
      reasons.push('Aucune connexion connue')
    }
    return {
      status: 'inactive',
      reasons,
      recommendation: 'Aucune activité récente détectée.',
    }
  }

  const quotaStatuses = [usage.projects.status, usage.vapi.status, usage.devis.status]
  const hasQuotaIssue = quotaStatuses.some((s) => s === 'warning' || s === 'limit_reached' || s === 'exceeded')

  const essentielNearLimit =
    plan === 'essentiel' &&
    ((usage.projects.percent ?? 0) >= 80 || (usage.devis.percent ?? 0) >= 80)

  if (essentielNearLimit && !noActivityThisMonth) {
    if ((usage.projects.percent ?? 0) >= 80) {
      reasons.push(`Dossiers à ${usage.projects.percent}% du quota Essentiel`)
    }
    if ((usage.devis.percent ?? 0) >= 80) {
      reasons.push(`Devis à ${usage.devis.percent}% du quota Essentiel`)
    }
    return {
      status: 'upgrade_opportunity',
      reasons,
      recommendation:
        'Ce client utilise régulièrement Kadria et approche les limites du plan Essentiel.',
    }
  }

  if (hasQuotaIssue) {
    if (usage.projects.status !== 'ok') reasons.push(`Dossiers : ${usage.projects.percent ?? '—'}%`)
    if (usage.vapi.status !== 'ok') reasons.push(`Appels vocaux : ${usage.vapi.callsPercent ?? '—'}%`)
    if (usage.devis.status !== 'ok') reasons.push(`Devis : ${usage.devis.percent ?? '—'}%`)
    return {
      status: 'quota_warning',
      reasons,
      recommendation: 'Au moins un quota approche ou dépasse sa limite — vérifier si une intervention est nécessaire.',
    }
  }

  if (noActivityThisMonth) {
    reasons.push('Activité faible ce mois-ci')
    return {
      status: 'watch',
      reasons,
      recommendation: 'Activité faible — à surveiller dans les prochaines semaines.',
    }
  }

  reasons.push('Usage régulier, quotas dans les limites')
  return {
    status: 'healthy',
    reasons,
    recommendation: 'Aucune action requise.',
  }
}

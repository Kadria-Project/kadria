import {
  normalizeProjectStatus,
  PROJECT_STATUS_NORMALIZATION,
  PROJECT_STATUS_OPTIONS as LIFECYCLE_STATUS_OPTIONS,
} from '@/src/lib/project-lifecycle'

export { PROJECT_STATUS_NORMALIZATION, normalizeProjectStatus }

export const PROJECT_STATUS_OPTIONS = LIFECYCLE_STATUS_OPTIONS.map((value) => ({
  value,
  label: value,
  cls:
    value === 'Nouveau' ? 'bg-[var(--bg-hover)] text-[var(--text-1)]' :
    value === 'À rappeler' ? 'bg-amber-500/20 text-amber-400' :
    value === 'Qualifié' ? 'bg-green-500/20 text-green-400' :
    value === 'En cours' ? 'bg-purple-500/20 text-purple-400' :
    value === 'Devis envoyé' ? 'bg-blue-500/20 text-blue-400' :
    value === 'Devis accepté' ? 'bg-emerald-500/20 text-emerald-300' :
    value === 'Acompte demandé' ? 'bg-cyan-500/20 text-cyan-300' :
    value === 'Acompte payé' ? 'bg-teal-500/20 text-teal-300' :
    value === 'Réalisation du projet' ? 'bg-indigo-500/20 text-indigo-300' :
    value === 'Gagné' ? 'bg-green-600/20 text-green-300' :
    value === 'Perdu' ? 'bg-red-500/20 text-red-400' :
    'bg-red-500/20 text-red-300',
}))

export const QUOTE_STAGE_STATUSES = [
  'Devis envoyé',
  'Devis accepté',
  'Acompte demandé',
  'Acompte payé',
  'Réalisation du projet',
] as const

export function isProjectLostStatus(status?: string | null): boolean {
  return normalizeProjectStatus(status) === 'Perdu'
}

export function isProjectWonStatus(status?: string | null): boolean {
  return normalizeProjectStatus(status) === 'Gagné'
}

export function isProjectClosedStatus(status?: string | null): boolean {
  return isProjectWonStatus(status) || isProjectLostStatus(status)
}

export function isProjectQuoteAcceptedStatus(status?: string | null): boolean {
  const normalized = normalizeProjectStatus(status)
  return (
    normalized === 'Devis accepté' ||
    normalized === 'Acompte demandé' ||
    normalized === 'Acompte payé' ||
    normalized === 'Réalisation du projet' ||
    normalized === 'Gagné'
  )
}

export function isProjectDepositRequestedStatus(status?: string | null): boolean {
  return normalizeProjectStatus(status) === 'Acompte demandé'
}

export function isProjectDepositPaidStatus(status?: string | null): boolean {
  return normalizeProjectStatus(status) === 'Acompte payé'
}

export function isProjectExecutionStatus(status?: string | null): boolean {
  return normalizeProjectStatus(status) === 'Réalisation du projet'
}

export function isProjectQuoteSentStatus(status?: string | null): boolean {
  const normalized = normalizeProjectStatus(status)
  return normalized === 'Devis envoyé' || isProjectQuoteAcceptedStatus(normalized)
}

export function isProjectQuoteStageStatus(status?: string | null): boolean {
  return QUOTE_STAGE_STATUSES.includes(normalizeProjectStatus(status) as (typeof QUOTE_STAGE_STATUSES)[number])
}

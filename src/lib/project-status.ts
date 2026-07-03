export const PROJECT_STATUS_NORMALIZATION: Record<string, string> = {
  'A rappeler': 'À rappeler',
  Qualifie: 'Qualifié',
  'Devis envoye': 'Devis envoyé',
  'Devis accepte': 'Devis accepté',
  'Acompte demande': 'Acompte demandé',
  'Acompte paye': 'Acompte payé',
  'Realisation du projet': 'Réalisation du projet',
  Gagne: 'Gagné',
}

export function normalizeProjectStatus(status?: string | null): string {
  const value = String(status || '').trim()
  if (!value) return 'Nouveau'
  return PROJECT_STATUS_NORMALIZATION[value] || value
}

export const PROJECT_STATUS_OPTIONS = [
  { value: 'Nouveau', label: 'Nouveau', cls: 'bg-[var(--bg-hover)] text-[var(--text-1)]' },
  { value: 'À rappeler', label: 'À rappeler', cls: 'bg-amber-500/20 text-amber-400' },
  { value: 'Qualifié', label: 'Qualifié', cls: 'bg-green-500/20 text-green-400' },
  { value: 'En cours', label: 'En cours', cls: 'bg-purple-500/20 text-purple-400' },
  { value: 'Devis envoyé', label: 'Devis envoyé', cls: 'bg-blue-500/20 text-blue-400' },
  { value: 'En risque', label: 'En risque', cls: 'bg-red-500/20 text-red-300' },
  { value: 'A relancer', label: 'A relancer', cls: 'bg-amber-500/20 text-amber-300' },
  { value: 'Devis accepté', label: 'Devis accepté', cls: 'bg-emerald-500/20 text-emerald-300' },
  { value: 'Acompte demandé', label: 'Acompte demandé', cls: 'bg-cyan-500/20 text-cyan-300' },
  { value: 'Acompte payé', label: 'Acompte payé', cls: 'bg-teal-500/20 text-teal-300' },
  { value: 'Réalisation du projet', label: 'Réalisation du projet', cls: 'bg-indigo-500/20 text-indigo-300' },
  { value: 'Gagné', label: 'Gagné', cls: 'bg-green-600/20 text-green-300' },
  { value: 'Perdu', label: 'Perdu', cls: 'bg-red-500/20 text-red-400' },
] as const

export const QUOTE_STAGE_STATUSES = [
  'Devis envoyé',
  'A relancer',
  'En risque',
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
  return normalized === 'Devis envoyé' || normalized === 'A relancer' || normalized === 'En risque' || isProjectQuoteAcceptedStatus(normalized)
}

export function isProjectQuoteStageStatus(status?: string | null): boolean {
  return QUOTE_STAGE_STATUSES.includes(normalizeProjectStatus(status) as (typeof QUOTE_STAGE_STATUSES)[number])
}

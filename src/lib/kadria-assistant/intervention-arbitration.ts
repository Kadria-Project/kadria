export const ARBITRATION_TYPES = ['snoozed', 'not_relevant', 'already_handled', 'declined', 'priority_disputed'] as const
export type InterventionArbitrationType = typeof ARBITRATION_TYPES[number]

export const SNOOZE_OPTIONS = {
  tomorrow: 1,
  three_days: 3,
  next_week: 7,
} as const
export type SnoozeOption = keyof typeof SNOOZE_OPTIONS

export const PRIORITY_DISPUTE_DAYS = 3

export type ArbitrationActivity = {
  action: string | null
  description: string | null
  created_at: string | null
}

export type ActiveInterventionArbitration = {
  arbitrationType: InterventionArbitrationType
  createdAt: string
  snoozeUntil?: string
  actorUserId?: string
  isActive: boolean
  supersededByNewEvidence: boolean
  reappearanceReason?: string
}

export type ArbitrationEvidence = {
  observedAt?: string | null
  hasSignificantEscalation?: boolean
}

export function arbitrationActivity(type: InterventionArbitrationType) {
  return `KADRIA_INTERVENTION_${type.toUpperCase()}`
}

export const ARBITRATION_ACTIVITY_TYPES = ARBITRATION_TYPES.map(arbitrationActivity)

export function resolveSnoozeUntil(option: SnoozeOption, now = new Date()) {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() + SNOOZE_OPTIONS[option])
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString()
}

export function arbitrationDescription(type: InterventionArbitrationType, interventionId: string, snoozeUntil?: string) {
  return `${arbitrationActivity(type)}:${interventionId}${snoozeUntil ? `:${snoozeUntil}` : ''}`
}

export function parseArbitration(description?: string | null) {
  const match = /^(KADRIA_INTERVENTION_(SNOOZED|NOT_RELEVANT|ALREADY_HANDLED|DECLINED|PRIORITY_DISPUTED)):(.+?)(?::(\d{4}-\d{2}-\d{2}T.*Z))?$/.exec(description || '')
  if (!match) return null
  return { type: match[2].toLowerCase() as InterventionArbitrationType, interventionId: match[3], snoozeUntil: match[4] }
}

function isAfter(left?: string | null, right?: string | null) {
  if (!left || !right) return false
  return new Date(left).getTime() > new Date(right).getTime()
}

export function readActiveInterventionArbitration(
  activities: ArbitrationActivity[],
  interventionId: string,
  evidence: ArbitrationEvidence = {},
  now = new Date(),
): ActiveInterventionArbitration | undefined {
  const latest = activities
    .map((activity) => ({ activity, parsed: parseArbitration(activity.description) }))
    .filter((entry): entry is { activity: ArbitrationActivity; parsed: NonNullable<ReturnType<typeof parseArbitration>> } => entry.parsed?.interventionId === interventionId && !!entry.activity.created_at)
    .sort((a, b) => new Date(b.activity.created_at as string).getTime() - new Date(a.activity.created_at as string).getTime())[0]

  if (!latest?.activity.created_at) return undefined

  const createdAt = latest.activity.created_at
  const supersededByNewEvidence = isAfter(evidence.observedAt, createdAt)
  const snoozeExpired = latest.parsed.type === 'snoozed' && !!latest.parsed.snoozeUntil && new Date(latest.parsed.snoozeUntil).getTime() <= now.getTime()
  const disputeExpired = latest.parsed.type === 'priority_disputed'
    && new Date(createdAt).getTime() + PRIORITY_DISPUTE_DAYS * 86_400_000 <= now.getTime()
  const escalationOverridesSnooze = latest.parsed.type === 'snoozed' && !!evidence.hasSignificantEscalation
  const isActive = !supersededByNewEvidence && !snoozeExpired && !disputeExpired && !escalationOverridesSnooze
  const reappearanceReason = supersededByNewEvidence
    ? 'Une nouvelle preuve métier a été observée depuis votre dernier choix.'
    : escalationOverridesSnooze
      ? 'Le risque s’est aggravé pendant le report demandé.'
      : snoozeExpired
        ? 'Le délai demandé est terminé : Kadria réévalue les faits actuels.'
        : disputeExpired
          ? 'La priorité a été réévaluée après le délai demandé.'
          : undefined

  return {
    arbitrationType: latest.parsed.type,
    createdAt,
    ...(latest.parsed.snoozeUntil ? { snoozeUntil: latest.parsed.snoozeUntil } : {}),
    isActive,
    supersededByNewEvidence,
    ...(reappearanceReason ? { reappearanceReason } : {}),
  }
}

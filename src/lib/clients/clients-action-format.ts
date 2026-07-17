/**
 * Human, French, relative date labels for the CRM action center. Never
 * expose a raw ISO date to the user (§14) and never invent a due date that
 * wasn't provided.
 */

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** For a future/near appointment date-time. */
export function formatDueLabel(value: string | null, now: Date = new Date()): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const dayDelta = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS)
  if (dayDelta === 0) return `Aujourd’hui à ${timeLabel(date)}`
  if (dayDelta === 1) return `Demain à ${timeLabel(date)}`
  if (dayDelta > 1) return `Dans ${dayDelta} jours`
  if (dayDelta === -1) return 'En retard de 1 jour'
  if (dayDelta < -1) return `En retard de ${Math.abs(dayDelta)} jours`
  return null
}

/** For a past "sent since" / "no answer since" duration. */
export function formatSinceLabel(value: string | null, now: Date = new Date()): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const days = Math.floor((now.getTime() - date.getTime()) / DAY_MS)
  if (days <= 0) return 'Depuis aujourd’hui'
  if (days === 1) return 'Sans réponse depuis 1 jour'
  return `Sans réponse depuis ${days} jours`
}

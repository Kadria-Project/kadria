import 'server-only'

// Logique pure de calcul de créneaux libres pour la prise de rendez-vous
// assistée (V1). Partagée entre /api/appointments/availability (proposition
// de créneaux) et /api/appointments/book (re-vérification anti-course
// avant création de l'événement Google Calendar).
//
// Règles V1 (fixées par le cahier des charges) :
// - jours ouvrés Lundi-Vendredi uniquement, sur les 7 prochains jours ouvrés
// - horaires 09:00-18:00 Europe/Paris
// - pause déjeuner 12:00-14:00 exclue
// - créneaux de 60 minutes
// - ne jamais proposer un créneau passé
// - ne jamais proposer un créneau qui chevauche un événement existant

export interface BusyInterval {
  start: number // epoch ms
  end: number // epoch ms
}

export interface CandidateSlot {
  start: string // ISO 8601
  end: string // ISO 8601
}

// Note : l'API Calendar travaille avec des dateTime + timeZone explicite
// (Europe/Paris), donc le calcul ci-dessous raisonne en "heure de Paris"
// approximée en construisant les bornes UTC correspondantes. Comme la V1 ne
// gère qu'un seul fuseau (Europe/Paris, déjà la convention du repo), une
// approximation à +2h (heure d'été) ou +1h (heure d'hiver) est nécessaire en
// l'absence de librairie de fuseaux horaires dans le repo. On détermine le
// décalage à partir de la date Intl plutôt que de coder une valeur fixe.
function parisOffsetHoursFor(date: Date): number {
  // Utilise Intl pour obtenir l'heure locale Europe/Paris du même instant,
  // puis en déduit le décalage horaire par rapport à UTC, sans dépendance
  // externe.
  const utcHour = date.getUTCHours()
  const parisFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    hourCycle: 'h23',
  })
  const parisHour = Number(parisFormatter.format(date))
  let diff = parisHour - utcHour
  if (diff < 0) diff += 24
  if (diff > 12) diff -= 24
  return diff
}

function buildParisDateTime(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Construit un instant UTC correspondant à hour:minute en heure de Paris
  // pour le jour donné, en tenant compte du décalage saisonnier.
  const approxUtc = new Date(Date.UTC(year, month, day, hour, minute))
  const offset = parisOffsetHoursFor(approxUtc)
  return new Date(Date.UTC(year, month, day, hour - offset, minute))
}

function isWeekday(date: Date): boolean {
  const parisFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
  })
  const day = parisFormatter.format(date)
  return !['Sat', 'Sun'].includes(day)
}

function parisDateParts(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1
  const day = Number(parts.find((p) => p.type === 'day')?.value)
  return { year, month, day }
}

function overlaps(aStart: number, aEnd: number, busy: BusyInterval[]): boolean {
  return busy.some((b) => aStart < b.end && aEnd > b.start)
}

/**
 * Calcule jusqu'à `maxSlots` créneaux libres de 60 minutes, en business hours
 * Europe/Paris, sur les `maxBusinessDays` prochains jours ouvrés, en excluant
 * la pause déjeuner et tout chevauchement avec `busyIntervals`.
 */
export function computeFreeSlots(
  busyIntervals: BusyInterval[],
  options: { now?: Date; maxSlots?: number; maxBusinessDays?: number; forDate?: string } = {}
): CandidateSlot[] {
  const now = options.now || new Date()
  const maxSlots = options.maxSlots ?? 3
  const maxBusinessDays = options.maxBusinessDays ?? 7

  const slots: CandidateSlot[] = []

  // Créneaux horaires de la journée : 09-12 puis 14-18, par tranches de 60 min.
  const dayRanges: Array<[number, number]> = [[9, 12], [14, 18]]

  const collectForDay = (year: number, month: number, day: number) => {
    for (const [startHour, endHour] of dayRanges) {
      for (let hour = startHour; hour < endHour && slots.length < maxSlots; hour += 1) {
        const slotStart = buildParisDateTime(year, month, day, hour, 0)
        const slotEnd = buildParisDateTime(year, month, day, hour + 1, 0)

        if (slotStart.getTime() < now.getTime()) continue
        if (overlaps(slotStart.getTime(), slotEnd.getTime(), busyIntervals)) continue

        slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() })
      }
    }
  }

  if (options.forDate) {
    // Mode "date précise" : on ne calcule que sur cette journée. Mêmes
    // règles (jour ouvré, horaires, pause déjeuner, pas de passé, pas de
    // conflit) ; un week-end ou une journée pleine renvoie simplement [].
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(options.forDate)
    if (!match) return []
    const year = Number(match[1])
    const month = Number(match[2]) - 1
    const day = Number(match[3])

    const probeDate = buildParisDateTime(year, month, day, 12, 0)
    if (!isWeekday(probeDate)) return []

    collectForDay(year, month, day)
    return slots.slice(0, maxSlots)
  }

  let businessDaysScanned = 0
  for (let i = 0; i < 30 && businessDaysScanned < maxBusinessDays && slots.length < maxSlots; i += 1) {
    const dayDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    if (!isWeekday(dayDate)) continue
    businessDaysScanned += 1

    const { year, month, day } = parisDateParts(dayDate)
    collectForDay(year, month, day)
  }

  return slots.slice(0, maxSlots)
}

/**
 * Vérifie qu'un créneau [start, end) précis ne chevauche aucun événement
 * busy et n'est pas dans le passé. Utilisé pour la re-vérification
 * anti-course juste avant la création de l'événement Google Calendar.
 */
export function isSlotStillFree(
  start: string,
  end: string,
  busyIntervals: BusyInterval[],
  now: Date = new Date()
): boolean {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) return false
  if (startMs < now.getTime()) return false
  return !overlaps(startMs, endMs, busyIntervals)
}

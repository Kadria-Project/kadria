import 'server-only'
import type { BusyInterval } from '@/src/lib/appointment-slots'

interface GoogleEventDateTime {
  dateTime?: string
  date?: string
}

interface GoogleEvent {
  id: string
  start?: GoogleEventDateTime
  end?: GoogleEventDateTime
}

interface GoogleEventsListResponse {
  items?: GoogleEvent[]
}

/**
 * Récupère les événements Google Calendar de l'artisan sur la fenêtre
 * [now, now + windowDays] et les renvoie sous forme d'intervalles "busy"
 * uniquement (start/end en epoch ms) — jamais les titres/détails des
 * événements, conformément à la contrainte de confidentialité V1 (cette
 * fonction n'est jamais utilisée pour exposer le contenu d'un événement à
 * un client/prospect).
 *
 * Réutilise le même endpoint Calendar API que
 * app/api/integrations/google-calendar/events/route.ts, sans dupliquer la
 * logique d'auth/refresh de token (le accessToken est fourni par l'appelant
 * via getValidAccessToken).
 */
export async function fetchBusyIntervals(
  accessToken: string,
  now: Date,
  windowDays: number
): Promise<BusyInterval[]> {
  const timeMin = now.toISOString()
  const timeMax = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000).toISOString()

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    maxResults: '250',
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    console.error('[GOOGLE CALENDAR BUSY] Échec appel Calendar API', response.status, await response.text())
    throw new Error('calendar_api_error')
  }

  const json = (await response.json()) as GoogleEventsListResponse

  return (json.items || [])
    .map((item) => {
      const startStr = item.start?.dateTime || item.start?.date
      const endStr = item.end?.dateTime || item.end?.date
      if (!startStr || !endStr) return null
      const start = new Date(startStr).getTime()
      const end = new Date(endStr).getTime()
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null
      return { start, end }
    })
    .filter((interval): interval is BusyInterval => Boolean(interval))
}

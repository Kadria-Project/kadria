import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getCalendarIntegration, getValidAccessToken } from '@/src/lib/google-calendar'

interface GoogleEventDateTime {
  dateTime?: string
  date?: string
}

interface GoogleEvent {
  id: string
  summary?: string
  location?: string
  start?: GoogleEventDateTime
  end?: GoogleEventDateTime
}

interface GoogleEventsListResponse {
  items?: GoogleEvent[]
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { row, tableMissing } = await getCalendarIntegration(session.artisanId)

    if (tableMissing || !row || !row.is_connected) {
      return NextResponse.json({ success: true, connected: false, events: [] })
    }

    const accessToken = await getValidAccessToken(row)
    if (!accessToken) {
      return NextResponse.json({ success: true, connected: false, events: [] })
    }

    const params = new URLSearchParams({
      timeMin: new Date().toISOString(),
      maxResults: '10',
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!eventsResponse.ok) {
      console.error('[GOOGLE CALENDAR EVENTS GET] Échec appel Calendar API', eventsResponse.status, await eventsResponse.text())
      return NextResponse.json({ success: false, error: 'Synchronisation Google impossible' }, { status: 502 })
    }

    const eventsJson = (await eventsResponse.json()) as GoogleEventsListResponse

    const events = (eventsJson.items || []).map((item) => ({
      id: item.id,
      title: item.summary || '(Sans titre)',
      start: item.start?.dateTime || item.start?.date || null,
      end: item.end?.dateTime || item.end?.date || null,
      location: item.location || null,
    }))

    return NextResponse.json({ success: true, connected: true, events })
  } catch (error) {
    console.error('[GOOGLE CALENDAR EVENTS GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ success: false, error: 'Corps de requête invalide' }, { status: 400 })
    }

    const { title, description, start, end, location } = body as {
      title?: string
      description?: string
      start?: string
      end?: string
      location?: string
      projectId?: string // Champ accepté pour compatibilité future (liaison projet), non utilisé en V1.
    }

    if (!title || !start || !end) {
      return NextResponse.json({ success: false, error: 'Titre, date de début et date de fin requis' }, { status: 400 })
    }

    const { row, tableMissing } = await getCalendarIntegration(session.artisanId)

    if (tableMissing || !row || !row.is_connected) {
      return NextResponse.json({ success: false, error: 'Agenda non connecté' }, { status: 409 })
    }

    const accessToken = await getValidAccessToken(row)
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Agenda non connecté' }, { status: 409 })
    }

    const googleEventBody: Record<string, unknown> = {
      summary: title,
      description: description || undefined,
      location: location || undefined,
      start: { dateTime: start },
      end: { dateTime: end },
    }

    const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleEventBody),
    })

    if (!createResponse.ok) {
      console.error('[GOOGLE CALENDAR EVENTS POST] Échec création événement', createResponse.status, await createResponse.text())
      return NextResponse.json({ success: false, error: 'Création de l\'événement impossible' }, { status: 502 })
    }

    const created = (await createResponse.json()) as GoogleEvent

    return NextResponse.json({
      success: true,
      event: {
        id: created.id,
        title: created.summary || title,
        start: created.start?.dateTime || created.start?.date || start,
        end: created.end?.dateTime || created.end?.date || end,
        location: created.location || location || null,
      },
    })
  } catch (error) {
    console.error('[GOOGLE CALENDAR EVENTS POST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

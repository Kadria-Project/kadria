import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getCalendarIntegration, getValidAccessToken } from '@/src/lib/google-calendar'
import { fetchBusyIntervals } from '@/src/lib/google-calendar-busy'
import { isSlotStillFree } from '@/src/lib/appointment-slots'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { TABLES } from '@/src/lib/airtable'

interface GoogleEvent {
  id: string
  summary?: string
  location?: string
  htmlLink?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
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

    const { projectId, start, end, location, note } = body as {
      projectId?: string
      start?: string
      end?: string
      location?: string
      note?: string
    }

    if (!projectId || !start || !end) {
      return NextResponse.json({ success: false, error: 'projectId, start et end requis' }, { status: 400 })
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('id, artisan_id, client_name, client_first_name, client_email, client_phone, site_address, city, project_type, budget, desired_timeline')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) {
      console.error('[APPOINTMENTS BOOK] Erreur lecture projet:', projectError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    if (project.artisan_id !== session.artisanId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const { row, tableMissing } = await getCalendarIntegration(session.artisanId)
    if (tableMissing || !row || !row.is_connected) {
      return NextResponse.json({ success: false, error: 'not_connected' }, { status: 409 })
    }

    const accessToken = await getValidAccessToken(row)
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'not_connected' }, { status: 409 })
    }

    // Re-vérification anti-course : on recharge les événements à l'instant T
    // et on s'assure que le créneau demandé est toujours libre avant de
    // créer l'événement Google Calendar.
    const now = new Date()
    let busyIntervals
    try {
      busyIntervals = await fetchBusyIntervals(accessToken, now, 14)
    } catch {
      return NextResponse.json({ success: false, error: 'google_calendar_error' }, { status: 502 })
    }

    if (!isSlotStillFree(start, end, busyIntervals, now)) {
      return NextResponse.json({ success: false, error: 'slot_unavailable' }, { status: 409 })
    }

    const clientFullName = [project.client_first_name, project.client_name].filter(Boolean).join(' ').trim()
    const title = `RDV - ${clientFullName || 'Client'}`

    const descriptionParts: string[] = []
    if (project.project_type) descriptionParts.push(`Type de projet : ${project.project_type}`)
    if (project.budget) descriptionParts.push(`Budget : ${project.budget}`)
    if (project.desired_timeline) descriptionParts.push(`Délai souhaité : ${project.desired_timeline}`)
    if (note) descriptionParts.push(`Note : ${note}`)
    const description = descriptionParts.join('\n') || undefined

    const eventLocation =
      [project.site_address, project.city].filter(Boolean).join(', ') || location || undefined

    const timeZone = 'Europe/Paris'

    const googleEventBody: Record<string, unknown> = {
      summary: title,
      description,
      location: eventLocation,
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
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
      console.error('[APPOINTMENTS BOOK] Échec création événement', createResponse.status, await createResponse.text())
      return NextResponse.json({ success: false, error: 'google_calendar_error' }, { status: 502 })
    }

    const created = (await createResponse.json()) as GoogleEvent

    const insertRow = {
      artisan_id: session.artisanId,
      project_id: projectId,
      provider: 'google',
      google_event_id: created.id || null,
      title,
      start_time: created.start?.dateTime || start,
      end_time: created.end?.dateTime || end,
      location: created.location || eventLocation || null,
      client_name: clientFullName || null,
      client_email: project.client_email || null,
      client_phone: project.client_phone || null,
      status: 'confirmed',
    }

    const { data: appointment, error: insertError } = await supabaseAdmin
      .from('project_appointments')
      .insert(insertRow)
      .select('id, start_time, end_time, location, status')
      .single()

    if (insertError) {
      console.error('[APPOINTMENTS BOOK] Erreur insertion project_appointments:', insertError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        start: appointment.start_time,
        end: appointment.end_time,
        location: appointment.location,
        status: appointment.status,
      },
    })
  } catch (error) {
    console.error('[APPOINTMENTS BOOK]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

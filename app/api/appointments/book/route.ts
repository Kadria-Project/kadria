import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { getSession } from '@/src/lib/auth-utils'
import {
  canCreatePersonalAppointments,
  canManageTeamPlanning,
  findAppointmentConflict,
  listAssignableAppointmentMembers,
  logAppointmentActivity,
} from '@/src/lib/appointments/access'
import { isSlotStillFree } from '@/src/lib/appointment-slots'
import { fetchBusyIntervals } from '@/src/lib/google-calendar-busy'
import { getCalendarIntegration, getValidAccessToken } from '@/src/lib/google-calendar'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { sendAppointmentPush } from '@/src/lib/push'

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

    const { projectId, start, end, location, note, assignedUserId: requestedAssignedUserId } = body as {
      projectId?: string
      start?: string
      end?: string
      location?: string
      note?: string
      assignedUserId?: string | null
    }

    if (!projectId || !start || !end) {
      return NextResponse.json({ success: false, error: 'projectId, start et end requis' }, { status: 400 })
    }

    const access = await authorizeProjectAccess({
      projectId,
      select: 'id, tenant_id, artisan_id, client_name, client_first_name, client_email, client_phone, site_address, city, project_type, budget, desired_timeline',
      allowAppointmentAccess: true,
    })

    if (!access) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    const tenantContext = access.tenantContext
    if (tenantContext && !canCreatePersonalAppointments(tenantContext)) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    const project = access.project as Record<string, unknown>
    const { row, tableMissing } = await getCalendarIntegration(session.artisanId)
    if (tableMissing || !row || !row.is_connected) {
      return NextResponse.json({ success: false, error: 'not_connected' }, { status: 409 })
    }

    const accessToken = await getValidAccessToken(row)
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'not_connected' }, { status: 409 })
    }

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

    let assignedUserId: string | null = tenantContext?.userId || null
    let assignedUserName: string | null = null

    if (tenantContext) {
      const canManageTeam = canManageTeamPlanning(tenantContext)
      if (canManageTeam && requestedAssignedUserId) {
        const assignableMembers = await listAssignableAppointmentMembers(tenantContext.tenantId)
        const member = assignableMembers.find((item) => item.userId === requestedAssignedUserId)
        if (!member) {
          return NextResponse.json(
            { success: false, error: "Le collaborateur sélectionné n'appartient pas à votre équipe." },
            { status: 403 },
          )
        }
        assignedUserId = requestedAssignedUserId
        assignedUserName = [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.email
      } else if (tenantContext.userId) {
        assignedUserName = [tenantContext.user.firstName, tenantContext.user.lastName].filter(Boolean).join(' ').trim() || tenantContext.user.email
      }
    }

    const conflict = tenantContext
      ? await findAppointmentConflict({
          tenantId: tenantContext.tenantId,
          assignedUserId,
          start,
          end,
        })
      : null

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
      project_id: access.projectId,
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
      tenant_id: tenantContext?.tenantId || null,
      assigned_user_id: assignedUserId,
      created_by_user_id: tenantContext?.userId || null,
      event_type: 'appointment',
      all_day: false,
      description: description || null,
      source: 'google-project-booking',
      is_unassigned: !assignedUserId,
      updated_at: new Date().toISOString(),
    }

    const { data: appointment, error: insertError } = await supabaseAdmin
      .from('project_appointments')
      .insert(insertRow)
      .select('id, title, client_name, project_id, start_time, end_time, location, status, assigned_user_id, event_type, is_unassigned, updated_at')
      .single()

    if (insertError) {
      console.error('[APPOINTMENTS BOOK] Erreur insertion project_appointments:', insertError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    await logAppointmentActivity({
      projectId: access.projectId,
      action: 'APPOINTMENT_BOOKED',
      description: assignedUserId
        ? `Rendez-vous planifié pour ${assignedUserName || 'un collaborateur'}`
        : 'Rendez-vous planifié sans collaborateur affecté',
    })

    if (tenantContext) {
      waitUntil(sendAppointmentPush({
        id: appointment.id,
        tenantId: tenantContext.tenantId,
        artisanId: tenantContext.legacyArtisanId || session.artisanId,
        assignedUserId: appointment.assigned_user_id,
        projectId: appointment.project_id,
        title: appointment.title,
        clientName: appointment.client_name,
        start: appointment.start_time,
        end: appointment.end_time,
        eventVersion: appointment.updated_at,
      }, 'appointment_created', tenantContext.userId).catch((error) => {
        console.warn('[PUSH][APPOINTMENT_BOOKED]', { appointmentId: appointment.id, message: error instanceof Error ? error.message : String(error) })
      }))
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        start: appointment.start_time,
        end: appointment.end_time,
        location: appointment.location,
        status: appointment.status,
        assignedUserId: appointment.assigned_user_id,
        eventType: appointment.event_type,
        isUnassigned: appointment.is_unassigned,
      },
      conflictWarning: conflict
        ? {
            message: 'Ce collaborateur a déjà un rendez-vous sur ce créneau.',
            appointmentId: conflict.id,
          }
        : null,
    })
  } catch (error) {
    console.error('[APPOINTMENTS BOOK]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

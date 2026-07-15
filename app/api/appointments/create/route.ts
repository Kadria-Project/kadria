import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { getSession } from '@/src/lib/auth-utils'
import {
  canCreatePersonalAppointments,
  canManageTeamPlanning,
  canReadPlanning,
  findAppointmentConflict,
  listAssignableAppointmentMembers,
  logAppointmentActivity,
  resolveProjectForAppointment,
} from '@/src/lib/appointments/access'
import { isEventType } from '@/src/lib/calendar/event-types'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { sendAppointmentPush } from '@/src/lib/push'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const tenantContext = await getCurrentTenantContext()
    if (!tenantContext || !canReadPlanning(tenantContext) || !canCreatePersonalAppointments(tenantContext)) {
      return NextResponse.json(
        { success: false, error: 'Contexte workspace introuvable pour ce compte.' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ success: false, error: 'Corps de requête invalide' }, { status: 400 })
    }

    const {
      title,
      eventType,
      start,
      end,
      allDay,
      location,
      description,
      projectId,
      assignedUserId: requestedAssignedUserId,
    } = body as {
      title?: string
      eventType?: string
      start?: string
      end?: string
      allDay?: boolean
      location?: string
      description?: string
      projectId?: string | null
      assignedUserId?: string | null
    }

    if (!title || !start) {
      return NextResponse.json({ success: false, error: 'Titre et date de début requis' }, { status: 400 })
    }

    const endValue = end || start
    const startDate = new Date(start)
    const endDate = new Date(endValue)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json(
        { success: false, error: "La fin du rendez-vous doit \u00eatre apr\u00e8s son d\u00e9but." },
        { status: 400 },
      )
    }
    if (!isEventType(eventType)) {
      return NextResponse.json({ success: false, error: "Type d'événement invalide" }, { status: 400 })
    }

    let clientName: string | null = null
    let clientPhone: string | null = null
    let resolvedLocation: string | null = location || null

    if (projectId) {
      const project = await resolveProjectForAppointment({ projectId, tenantContext })
      if (!project) {
        return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
      }

      const projectRecord = project as Record<string, unknown>
      clientName = [projectRecord.client_first_name, projectRecord.client_name].filter(Boolean).join(' ').trim() || null
      clientPhone = projectRecord.client_phone ? String(projectRecord.client_phone) : null
      resolvedLocation = resolvedLocation || [projectRecord.site_address, projectRecord.city].filter(Boolean).join(', ') || null
    }

    const canManageTeam = canManageTeamPlanning(tenantContext)
    const assignableMembers = await listAssignableAppointmentMembers(tenantContext.tenantId)
    const assignableMemberIds = new Set(assignableMembers.map((member) => member.userId))

    let assignedUserId = tenantContext.userId
    if (canManageTeam && requestedAssignedUserId) {
      if (!assignableMemberIds.has(requestedAssignedUserId)) {
        return NextResponse.json(
          { success: false, error: "Le collaborateur sélectionné n'appartient pas à votre équipe." },
          { status: 403 },
        )
      }
      assignedUserId = requestedAssignedUserId
    }

    const conflict = await findAppointmentConflict({
      tenantId: tenantContext.tenantId,
      assignedUserId,
      start,
      end: endValue,
    })

    const insertRow = {
      artisan_id: tenantContext.legacyArtisanId,
      project_id: projectId || null,
      provider: 'kadria',
      title,
      start_time: start,
      end_time: endValue,
      location: resolvedLocation,
      client_name: clientName,
      client_phone: clientPhone,
      status: 'confirmed',
      tenant_id: tenantContext.tenantId,
      assigned_user_id: assignedUserId,
      created_by_user_id: tenantContext.userId,
      event_type: eventType,
      all_day: Boolean(allDay),
      description: description || null,
      source: 'team-planning',
      is_unassigned: false,
      updated_at: new Date().toISOString(),
    }

    const { data: appointment, error: insertError } = await supabaseAdmin
      .from('project_appointments')
      .insert(insertRow)
      .select('id, title, client_name, project_id, start_time, end_time, location, status, assigned_user_id, is_unassigned, event_type, updated_at')
      .single()

    if (insertError) {
      console.error('[APPOINTMENTS CREATE] Erreur insertion project_appointments:', insertError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    await logAppointmentActivity({
      projectId: projectId || null,
      action: 'APPOINTMENT_CREATED',
      description: `Rendez-vous créé et affecté à ${assignableMembers.find((member) => member.userId === assignedUserId)?.firstName || 'un collaborateur'}`,
    })

    // The primary API response stays independent from an optional Push delivery.
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
      console.warn('[PUSH][APPOINTMENT_CREATED]', { appointmentId: appointment.id, message: error instanceof Error ? error.message : String(error) })
    }))

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        start: appointment.start_time,
        end: appointment.end_time,
        location: appointment.location,
        status: appointment.status,
        assignedUserId: appointment.assigned_user_id,
        isUnassigned: appointment.is_unassigned,
        eventType: appointment.event_type,
      },
      conflictWarning: conflict
        ? {
            message: 'Ce collaborateur a déjà un rendez-vous sur ce créneau.',
            appointmentId: conflict.id,
          }
        : null,
    })
  } catch (error) {
    console.error('[APPOINTMENTS CREATE]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

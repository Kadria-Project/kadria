import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { getSession } from '@/src/lib/auth-utils'
import {
  canDeleteAppointment,
  canAssignAppointments,
  canEditAppointment,
  findAppointmentConflict,
  listAssignableAppointmentMembers,
  logAppointmentActivity,
  resolveProjectForAppointment,
} from '@/src/lib/appointments/access'
import { isEventType } from '@/src/lib/calendar/event-types'
import { getCalendarIntegration, getValidAccessToken } from '@/src/lib/google-calendar'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext, tableHasColumn } from '@/src/lib/tenant-context'
import { sendAppointmentPush } from '@/src/lib/push'

async function syncGoogleAppointment(artisanId: string, googleEventId: string, method: 'PATCH' | 'DELETE', payload?: Record<string, unknown>) {
  const { row, tableMissing } = await getCalendarIntegration(artisanId)
  if (tableMissing || !row || !row.is_connected) return false
  const accessToken = await getValidAccessToken(row)
  if (!accessToken) return false
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(googleEventId),
    {
      method,
      headers: { Authorization: 'Bearer ' + accessToken, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    },
  )
  return response.ok
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const tenantContext = await getCurrentTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'Contexte workspace introuvable.' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ success: false, error: 'Corps de requête invalide' }, { status: 400 })
    }

    const confirmationAvailable = await tableHasColumn('project_appointments', 'confirmation_status')
    const { data: existingResult, error: fetchError } = await supabaseAdmin
      .from('project_appointments')
      .select(['id, tenant_id, artisan_id, project_id, assigned_user_id, title, client_name, start_time, end_time, location, description, status, event_type, provider, google_event_id', confirmationAvailable ? 'confirmation_status, confirmation_version' : ''].filter(Boolean).join(', '))
      .eq('id', id)
      .maybeSingle()
    const existing = existingResult as unknown as Record<string, unknown> | null

    if (fetchError) {
      console.error('[APPOINTMENTS PATCH] Erreur lecture rendez-vous:', fetchError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }
    if (!existing || existing.tenant_id !== tenantContext.tenantId) {
      return NextResponse.json({ success: false, error: 'Rendez-vous introuvable' }, { status: 404 })
    }
    if (!canEditAppointment(tenantContext, existing.assigned_user_id ? String(existing.assigned_user_id) : null)) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    const isTemporalAdjustment = body.move === true || body.resize === true
    if (isTemporalAdjustment && existing.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Un rendez-vous annulé ne peut pas être déplacé.' }, { status: 409 })
    }

    const nextAssignedUserId = body.assignedUserId === undefined
      ? (existing.assigned_user_id ? String(existing.assigned_user_id) : tenantContext.userId)
      : body.assignedUserId
        ? String(body.assignedUserId)
        : tenantContext.userId
    const shouldUpdateAssignee = body.assignedUserId !== undefined || !existing.assigned_user_id
    const wasReassigned = shouldUpdateAssignee && nextAssignedUserId !== (existing.assigned_user_id ? String(existing.assigned_user_id) : null)

    if (wasReassigned && !canAssignAppointments(tenantContext)) {
      return NextResponse.json({ success: false, error: "Vous n'avez pas accès à cette affectation." }, { status: 403 })
    }

    if (body.eventType !== undefined && !isEventType(body.eventType)) {
      return NextResponse.json({ success: false, error: "Type d'événement invalide" }, { status: 400 })
    }

    const nextProjectId = body.projectId === undefined
      ? (existing.project_id ? String(existing.project_id) : null)
      : body.projectId
        ? String(body.projectId)
        : null

    if (nextProjectId) {
      const project = await resolveProjectForAppointment({
        projectId: nextProjectId,
        tenantContext,
      })
      if (!project) {
        return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
      }
    }

    if (nextAssignedUserId) {
      const assignableMembers = await listAssignableAppointmentMembers(tenantContext.tenantId)
      const member = assignableMembers.find((item) => item.userId === nextAssignedUserId)
      if (!member) {
        return NextResponse.json(
          { success: false, error: "Le collaborateur sélectionné n'appartient pas à votre équipe." },
          { status: 403 },
        )
      }
    }

    const nextStart = body.start ? String(body.start) : String(existing.start_time)
    const nextEnd = body.end ? String(body.end) : String(existing.end_time)
    const startDate = new Date(nextStart)
    const endDate = new Date(nextEnd)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json(
        { success: false, error: "La fin du rendez-vous doit \u00eatre apr\u00e8s son d\u00e9but." },
        { status: 400 },
      )
    }
    if (isTemporalAdjustment && endDate.getTime() - startDate.getTime() < 15 * 60_000) {
      return NextResponse.json(
        { success: false, error: 'La durée minimale d’un rendez-vous est de 15 minutes.' },
        { status: 400 },
      )
    }
    const conflict = await findAppointmentConflict({
      tenantId: tenantContext.tenantId,
      assignedUserId: nextAssignedUserId,
      start: nextStart,
      end: nextEnd,
      excludeAppointmentId: id,
    })
    if (isTemporalAdjustment && conflict && body.forceConflict !== true) {
      console.info('[CALENDAR][APPOINTMENT_MOVE_CONFLICT]', { appointmentId: id, tenantId: tenantContext.tenantId, assignedUserId: nextAssignedUserId, previousStart: existing.start_time, nextStart })
      return NextResponse.json({ success: false, error: 'Ce collaborateur possède déjà un rendez-vous sur cette plage horaire.', code: 'APPOINTMENT_CONFLICT', conflict }, { status: 409 })
    }
    if (existing.provider === 'google' && existing.google_event_id) {
      const synced = await syncGoogleAppointment(String(existing.artisan_id || session.artisanId), String(existing.google_event_id), 'PATCH', {
        summary: body.title !== undefined ? String(body.title || '') : existing.title,
        description: body.description !== undefined ? (body.description ? String(body.description) : undefined) : existing.description,
        location: body.location !== undefined ? (body.location ? String(body.location) : undefined) : existing.location,
        start: { dateTime: nextStart, timeZone: 'Europe/Paris' },
        end: { dateTime: nextEnd, timeZone: 'Europe/Paris' },
      })
      if (!synced) return NextResponse.json({ success: false, error: 'Impossible de mettre a jour Google Agenda.' }, { status: 502 })
    }

    const wasRescheduled = nextStart !== String(existing.start_time) || nextEnd !== String(existing.end_time)
    const updatePayload = {
      ...(body.title !== undefined ? { title: String(body.title || '') } : {}),
      ...(body.start !== undefined ? { start_time: nextStart } : {}),
      ...(body.end !== undefined ? { end_time: nextEnd } : {}),
      ...(body.location !== undefined ? { location: body.location ? String(body.location) : null } : {}),
      ...(body.description !== undefined ? { description: body.description ? String(body.description) : null } : {}),
      ...(body.status !== undefined ? { status: String(body.status || '') } : {}),
      ...(body.eventType !== undefined ? { event_type: body.eventType } : {}),
      ...(body.projectId !== undefined ? { project_id: nextProjectId } : {}),
      ...(shouldUpdateAssignee ? { assigned_user_id: nextAssignedUserId, is_unassigned: false } : {}),
      ...(confirmationAvailable && wasRescheduled ? { confirmation_status: 'pending', confirmation_source: 'system', confirmation_note: null, confirmation_updated_at: new Date().toISOString(), confirmation_updated_by: tenantContext.userId, confirmation_version: Number((existing as Record<string, unknown>).confirmation_version || 0) + 1 } : {}),
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('project_appointments')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)
      .select('id, title, client_name, project_id, start_time, end_time, location, description, status, event_type, assigned_user_id, is_unassigned, updated_at')
      .single()

    if (updateError) {
      console.error('[CALENDAR][APPOINTMENT_MOVE_ERROR]', { appointmentId: id, tenantId: tenantContext.tenantId, assignedUserId: nextAssignedUserId, previousStart: existing.start_time, nextStart, message: updateError.message })
      console.error('[APPOINTMENTS PATCH] Erreur mise à jour:', updateError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    await logAppointmentActivity({
      projectId: nextProjectId,
      action: 'APPOINTMENT_UPDATED',
      description: 'Rendez-vous mis à jour',
    })

    waitUntil(sendAppointmentPush({
      id: updated.id,
      tenantId: tenantContext.tenantId,
      artisanId: String(existing.artisan_id || session.artisanId),
      assignedUserId: updated.assigned_user_id,
      projectId: updated.project_id,
      title: updated.title,
      clientName: updated.client_name || existing.client_name,
      start: updated.start_time,
      end: updated.end_time,
      eventVersion: updated.updated_at,
    }, wasReassigned ? 'appointment_assigned' : 'appointment_updated', tenantContext.userId).catch((error) => {
      console.warn('[PUSH][APPOINTMENT_UPDATED]', { appointmentId: updated.id, message: error instanceof Error ? error.message : String(error) })
    }))
    if (wasRescheduled) console.info('[CALENDAR][APPOINTMENT_MOVE_SUCCESS]', { appointmentId: id, tenantId: tenantContext.tenantId, assignedUserId: updated.assigned_user_id, previousStart: existing.start_time, nextStart: updated.start_time })

    return NextResponse.json({
      success: true,
      appointment: {
        id: updated.id,
        title: updated.title,
        start: updated.start_time,
        end: updated.end_time,
        location: updated.location,
        description: updated.description,
        status: updated.status,
        eventType: updated.event_type,
        assignedUserId: updated.assigned_user_id,
        isUnassigned: updated.is_unassigned,
      },
      conflictWarning: conflict
        ? {
            message: 'Ce collaborateur a déjà un rendez-vous sur ce créneau.',
            appointmentId: conflict.id,
          }
        : null,
    })
  } catch (error) {
    console.error('[APPOINTMENTS PATCH]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const tenantContext = await getCurrentTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'Contexte workspace introuvable.' }, { status: 403 })
    }

    const { id } = await context.params
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('project_appointments')
      .select('id, tenant_id, artisan_id, project_id, assigned_user_id, title, client_name, start_time, end_time, provider, google_event_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('[APPOINTMENTS DELETE] Erreur lecture rendez-vous:', fetchError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }
    if (!existing || existing.tenant_id !== tenantContext.tenantId) {
      return NextResponse.json({ success: false, error: 'Rendez-vous introuvable' }, { status: 404 })
    }
    if (!canDeleteAppointment(tenantContext, existing.assigned_user_id ? String(existing.assigned_user_id) : null)) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }
    if (existing.provider === 'google' && existing.google_event_id) {
      const synced = await syncGoogleAppointment(String(existing.artisan_id || session.artisanId), String(existing.google_event_id), 'DELETE')
      if (!synced) return NextResponse.json({ success: false, error: 'Impossible de supprimer le rendez-vous dans Google Agenda.' }, { status: 502 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('project_appointments')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)

    if (deleteError) {
      console.error('[APPOINTMENTS DELETE] Erreur suppression rendez-vous:', deleteError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    await logAppointmentActivity({
      projectId: existing.project_id ? String(existing.project_id) : null,
      action: 'APPOINTMENT_DELETED',
      description: 'Rendez-vous supprimé',
    })

    waitUntil(sendAppointmentPush({
      id: String(existing.id),
      tenantId: tenantContext.tenantId,
      artisanId: String(existing.artisan_id || session.artisanId),
      assignedUserId: existing.assigned_user_id ? String(existing.assigned_user_id) : null,
      projectId: existing.project_id ? String(existing.project_id) : null,
      title: existing.title ? String(existing.title) : null,
      clientName: existing.client_name ? String(existing.client_name) : null,
      start: existing.start_time ? String(existing.start_time) : null,
      end: existing.end_time ? String(existing.end_time) : null,
      eventVersion: new Date().toISOString(),
    }, 'appointment_cancelled', tenantContext.userId).catch((error) => {
      console.warn('[PUSH][APPOINTMENT_CANCELLED]', { appointmentId: existing.id, message: error instanceof Error ? error.message : String(error) })
    }))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[APPOINTMENTS DELETE]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

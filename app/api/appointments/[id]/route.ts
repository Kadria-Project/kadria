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
import { normalizeAppointmentMutationRequestId, type AppointmentMutationRequest, type AppointmentMutationResponse } from '@/src/lib/appointments/mutation-contract'
import { detectSubstantiveAppointmentChange, recordAppointmentLifecycleActivity, sendAppointmentReconfirmationEmail } from '@/src/lib/appointments/reconfirmation'
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

function matchesWorkspaceProject(value: unknown, projectId: string | null) {
  return !projectId || String(value || '') === projectId
}

const workspacePatchFields = new Set(['title', 'start', 'end', 'location', 'description', 'projectId', 'requestId'])

export function validateWorkspaceAppointmentPatch(body: Record<string, unknown>) {
  if (typeof body.projectId !== 'string' || !body.projectId.trim()) return
  const unknown = Object.keys(body).find((key) => !workspacePatchFields.has(key))
  if (unknown) throw new Error('Champ non autorisé.')
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const tenantContext = await getCurrentTenantContext()
    if (!tenantContext) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    const { id } = await context.params
    const projectId = request.nextUrl.searchParams.get('projectId')
    const { data, error } = await supabaseAdmin.from('project_appointments').select('id, tenant_id, project_id, assigned_user_id, title, start_time, end_time, status, location, description').eq('id', id).maybeSingle()
    if (error) { console.error('[APPOINTMENTS GET] Erreur lecture rendez-vous:', error.message); return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 }) }
    if (!data || data.tenant_id !== tenantContext.tenantId || !matchesWorkspaceProject(data.project_id, projectId)) return NextResponse.json({ success: false, error: 'Rendez-vous introuvable' }, { status: 404 })
    if (!canEditAppointment(tenantContext, data.assigned_user_id ? String(data.assigned_user_id) : null)) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    return NextResponse.json({ success: true, appointment: { id: String(data.id), title: String(data.title || ''), start: String(data.start_time || ''), end: String(data.end_time || ''), status: String(data.status || ''), assignedUserId: data.assigned_user_id ? String(data.assigned_user_id) : null, location: String(data.location || ''), description: String(data.description || '') } })
  } catch (error) { console.error('[APPOINTMENTS GET]', error instanceof Error ? error.message : String(error)); return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 }) }
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
    try { validateWorkspaceAppointmentPatch(body as Record<string, unknown>) } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Corps de requête invalide' }, { status: 400 }) }

    const requestId = normalizeAppointmentMutationRequestId((body as AppointmentMutationRequest).requestId)
    const confirmationAvailable = await tableHasColumn('project_appointments', 'confirmation_status')
    const { data: existingResult, error: fetchError } = await supabaseAdmin
      .from('project_appointments')
      .select(['id, tenant_id, artisan_id, project_id, assigned_user_id, title, client_name, start_time, end_time, location, description, status, event_type, provider, google_event_id, updated_at', confirmationAvailable ? 'confirmation_status, confirmation_version, confirmation_request_id' : ''].filter(Boolean).join(', '))
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
    if (!matchesWorkspaceProject(existing.project_id, typeof body.projectId === 'string' ? body.projectId : null)) return NextResponse.json({ success: false, error: 'Rendez-vous introuvable' }, { status: 404 })
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

    const nextProjectId = existing.project_id ? String(existing.project_id) : null

    const project = nextProjectId
      ? await resolveProjectForAppointment({
        projectId: nextProjectId,
        tenantContext,
      })
      : null
    if (nextProjectId && !project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
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

    const nextStart = body.start !== undefined ? String(body.start || '') : String(existing.start_time || '')
    const nextEnd = body.end !== undefined ? String(body.end || '') : String(existing.end_time || '')
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
    const changes = detectSubstantiveAppointmentChange(
      { start: existing.start_time ? String(existing.start_time) : null, end: existing.end_time ? String(existing.end_time) : null, assignedUserId: existing.assigned_user_id ? String(existing.assigned_user_id) : null },
      { start: nextStart, end: nextEnd, assignedUserId: nextAssignedUserId },
    )
    if (changes.substantiveChange && existing.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Un rendez-vous annulé ne peut pas être modifié.' }, { status: 409 })
    }

    const isReconfirmationRetry = Boolean(
      confirmationAvailable
      && requestId
      && existing.confirmation_request_id === requestId
      && existing.confirmation_status === 'pending'
      && !changes.substantiveChange,
    )
    if (isReconfirmationRetry) {
      console.info('[APPOINTMENT][RECONFIRMATION_IDEMPOTENT]', { appointmentId: id, tenantId: tenantContext.tenantId, requestId })
      return NextResponse.json({ success: true, appointmentUpdated: true, reconfirmationRequired: true, emailSent: false, idempotent: true, requestId } satisfies AppointmentMutationResponse)
    }

    const conflict = changes.substantiveChange
      ? await findAppointmentConflict({
        tenantId: tenantContext.tenantId,
        assignedUserId: nextAssignedUserId,
        start: nextStart,
        end: nextEnd,
        excludeAppointmentId: id,
      })
      : null
    if (changes.substantiveChange && conflict && body.forceConflict !== true) {
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

    const reschedulingAfterClientRequest = Boolean(
      existing.confirmation_status === 'change_requested'
      && changes.substantiveChange,
    )
    const reconfirmationRequired = Boolean(
      confirmationAvailable
      && (existing.confirmation_status === 'confirmed' || reschedulingAfterClientRequest)
      && changes.substantiveChange
      && existing.status !== 'cancelled',
    )
    const now = new Date().toISOString()
    const updatePayload = {
      ...(body.title !== undefined ? { title: String(body.title || '') } : {}),
      ...(body.start !== undefined ? { start_time: nextStart } : {}),
      ...(body.end !== undefined ? { end_time: nextEnd } : {}),
      ...(body.location !== undefined ? { location: body.location ? String(body.location) : null } : {}),
      ...(body.description !== undefined ? { description: body.description ? String(body.description) : null } : {}),
      ...(body.status !== undefined ? { status: String(body.status || '') } : {}),
      ...(body.eventType !== undefined ? { event_type: body.eventType } : {}),
      ...(shouldUpdateAssignee ? { assigned_user_id: nextAssignedUserId, is_unassigned: false } : {}),
      ...(reconfirmationRequired ? {
        confirmation_status: 'pending',
        confirmation_source: 'artisan',
        confirmation_note: null,
        confirmation_updated_at: now,
        confirmation_updated_by: tenantContext.userId,
        confirmation_version: Number(existing.confirmation_version || 0) + 1,
        confirmation_request_id: requestId,
      } : {}),
      updated_at: now,
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('project_appointments')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)
      .eq('updated_at', String(existing.updated_at || ''))
      .select('id, title, client_name, project_id, start_time, end_time, location, description, status, event_type, assigned_user_id, is_unassigned, updated_at')
      .maybeSingle()

    if (updateError || !updated) {
      if (!updateError) {
        const { data: currentResult } = await supabaseAdmin
          .from('project_appointments')
          .select(confirmationAvailable ? 'start_time, end_time, assigned_user_id, confirmation_status, confirmation_request_id' : 'start_time, end_time, assigned_user_id')
          .eq('id', id)
          .eq('tenant_id', tenantContext.tenantId)
          .maybeSingle()
        const current = currentResult as Record<string, unknown> | null
        const retryApplied = Boolean(
          confirmationAvailable
          && requestId
          && current?.confirmation_request_id === requestId
          && current.confirmation_status === 'pending'
          && !detectSubstantiveAppointmentChange(
            {
              start: typeof current?.start_time === 'string' ? current.start_time : null,
              end: typeof current?.end_time === 'string' ? current.end_time : null,
              assignedUserId: typeof current?.assigned_user_id === 'string' ? current.assigned_user_id : null,
            },
            { start: nextStart, end: nextEnd, assignedUserId: nextAssignedUserId },
          ).substantiveChange,
        )
        if (retryApplied) {
          console.info('[APPOINTMENT][RECONFIRMATION_IDEMPOTENT]', { appointmentId: id, tenantId: tenantContext.tenantId, requestId })
          return NextResponse.json({ success: true, appointmentUpdated: true, reconfirmationRequired: true, emailSent: false, idempotent: true, requestId } satisfies AppointmentMutationResponse)
        }
      }
      const safeUpdateError = updateError || { message: 'La version du rendez-vous a changé.' }
      console.error('[CALENDAR][APPOINTMENT_MOVE_ERROR]', { appointmentId: id, tenantId: tenantContext.tenantId, assignedUserId: nextAssignedUserId, previousStart: existing.start_time, nextStart, message: safeUpdateError.message })
      console.error('[APPOINTMENTS PATCH] Erreur mise à jour:', safeUpdateError.message)
      return NextResponse.json({ success: false, error: updateError ? 'Erreur serveur' : 'Le rendez-vous a été modifié entre-temps. Rechargez le planning avant de recommencer.', code: updateError ? undefined : 'APPOINTMENT_VERSION_CONFLICT' }, { status: updateError ? 500 : 409 })
    }

    const changeActivity = reschedulingAfterClientRequest && (changes.startChanged || changes.endChanged)
      ? { action: 'APPOINTMENT_RESCHEDULED', description: `Rendez-vous replanifié au ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(updated.start_time))}.` }
      : changes.assigneeChanged && (changes.startChanged || changes.endChanged)
      ? { action: 'APPOINTMENT_UPDATED', description: 'Rendez-vous déplacé et réaffecté.' }
      : changes.assigneeChanged
        ? { action: 'APPOINTMENT_REASSIGNED', description: 'Rendez-vous réaffecté.' }
        : changes.startChanged
          ? { action: 'APPOINTMENT_UPDATED', description: 'Rendez-vous déplacé.' }
          : changes.endChanged
            ? { action: 'APPOINTMENT_UPDATED', description: 'Durée du rendez-vous modifiée.' }
            : { action: 'APPOINTMENT_UPDATED', description: 'Rendez-vous mis à jour.' }
    await recordAppointmentLifecycleActivity({ projectId: nextProjectId, ...changeActivity }).catch((error) => {
      console.warn('[APPOINTMENT][ACTIVITY_FAILED]', { appointmentId: id, projectId: nextProjectId, requestId, message: error instanceof Error ? error.message : String(error) })
    })
    if (reconfirmationRequired) {
      console.info('[APPOINTMENT][RECONFIRMATION_REQUIRED]', { appointmentId: id, projectId: nextProjectId, tenantId: tenantContext.tenantId, requestId, changes })
      await recordAppointmentLifecycleActivity({ projectId: nextProjectId, action: 'APPOINTMENT_RECONFIRMATION_REQUIRED', description: 'Nouvelle confirmation client requise après modification du rendez-vous.' }).catch((error) => {
        console.warn('[APPOINTMENT][ACTIVITY_FAILED]', { appointmentId: id, projectId: nextProjectId, requestId, message: error instanceof Error ? error.message : String(error) })
      })
    }

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
    if (changes.startChanged || changes.endChanged) console.info('[CALENDAR][APPOINTMENT_MOVE_SUCCESS]', { appointmentId: id, tenantId: tenantContext.tenantId, assignedUserId: updated.assigned_user_id, previousStart: existing.start_time, nextStart: updated.start_time })

    const emailResult: { sent: boolean; emailId?: string; errorCode?: string } = reconfirmationRequired
      ? await sendAppointmentReconfirmationEmail({
        appointmentId: id,
        projectId: nextProjectId,
        artisanId: project?.artisanId || String(existing.artisan_id || session.artisanId || ''),
        clientEmail: project?.clientEmail || null,
        clientName: project?.client_name || (existing.client_name ? String(existing.client_name) : null),
        title: updated.title || null,
        start: updated.start_time || null,
        reason: reschedulingAfterClientRequest ? 'rescheduling' : 'modification',
      })
      : { sent: false as const }
    if (reconfirmationRequired && emailResult.sent) {
      console.info('[APPOINTMENT][RECONFIRMATION_EMAIL_SENT]', { appointmentId: id, projectId: nextProjectId, tenantId: tenantContext.tenantId, requestId, emailId: emailResult.emailId })
      await recordAppointmentLifecycleActivity({ projectId: nextProjectId, action: 'APPOINTMENT_RECONFIRMATION_EMAIL_SENT', description: reschedulingAfterClientRequest ? 'Email de nouvelle proposition envoyé au client.' : 'Email de nouvelle confirmation envoyé au client.' }).catch((error) => {
        console.warn('[APPOINTMENT][ACTIVITY_FAILED]', { appointmentId: id, projectId: nextProjectId, requestId, message: error instanceof Error ? error.message : String(error) })
      })
    } else if (reconfirmationRequired) {
      console.warn('[APPOINTMENT][RECONFIRMATION_EMAIL_FAILED]', { appointmentId: id, projectId: nextProjectId, tenantId: tenantContext.tenantId, requestId, errorCode: emailResult.errorCode || null })
    }

    const mutationResponse: AppointmentMutationResponse = {
      success: true,
      appointmentUpdated: true,
      reconfirmationRequired,
      ...(reschedulingAfterClientRequest ? { reconfirmationReason: 'rescheduling' as const } : {}),
      emailSent: emailResult.sent,
      ...(reconfirmationRequired && !emailResult.sent ? { warningCode: 'RECONFIRMATION_EMAIL_FAILED', warning: reschedulingAfterClientRequest ? 'Le nouveau créneau a été enregistré, mais l’email n’a pas pu être envoyé.' : 'Le rendez-vous a été modifié, mais l’email n’a pas pu être envoyé.' } : {}),
      requestId,
    }

    return NextResponse.json({
      ...mutationResponse,
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
    if (!matchesWorkspaceProject(existing.project_id, request.nextUrl.searchParams.get('projectId'))) return NextResponse.json({ success: false, error: 'Rendez-vous introuvable' }, { status: 404 })
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

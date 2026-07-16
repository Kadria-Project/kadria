import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { getSession } from '@/src/lib/auth-utils'
import { canAssignAppointments, listAssignableAppointmentMembers, resolveProjectForAppointment } from '@/src/lib/appointments/access'
import { normalizeAppointmentMutationRequestId, type AppointmentMutationRequest, type AppointmentMutationResponse } from '@/src/lib/appointments/mutation-contract'
import { detectSubstantiveAppointmentChange, recordAppointmentLifecycleActivity, sendAppointmentReconfirmationEmail } from '@/src/lib/appointments/reconfirmation'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { sendAppointmentPush } from '@/src/lib/push'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const tenantContext = await getCurrentTenantContext()
    if (!tenantContext || !canAssignAppointments(tenantContext)) {
      return NextResponse.json({ success: false, error: 'Contexte workspace introuvable.' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ success: false, error: 'Corps de requête invalide' }, { status: 400 })
    }

    const { assignedUserId } = body as { assignedUserId?: string | null }
    const requestId = normalizeAppointmentMutationRequestId((body as AppointmentMutationRequest).requestId)

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('project_appointments')
      .select('id, tenant_id, artisan_id, project_id, assigned_user_id, title, client_name, start_time, end_time, status, updated_at, confirmation_status, confirmation_version, confirmation_request_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('[APPOINTMENTS ASSIGN] Erreur lecture rendez-vous:', fetchError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }
    if (!existing || existing.tenant_id !== tenantContext.tenantId) {
      return NextResponse.json({ success: false, error: 'Rendez-vous introuvable' }, { status: 404 })
    }

    const assignableMembers = await listAssignableAppointmentMembers(tenantContext.tenantId)
    const nextAssignedUserId = assignedUserId || tenantContext.userId
    let nextAssignedUserName: string | null = null
    const changes = detectSubstantiveAppointmentChange(
      { start: existing.start_time ? String(existing.start_time) : null, end: existing.end_time ? String(existing.end_time) : null, assignedUserId: existing.assigned_user_id ? String(existing.assigned_user_id) : null },
      { start: existing.start_time ? String(existing.start_time) : null, end: existing.end_time ? String(existing.end_time) : null, assignedUserId: nextAssignedUserId },
    )
    if (!changes.assigneeChanged && requestId && existing.confirmation_request_id === requestId && existing.confirmation_status === 'pending') {
      console.info('[APPOINTMENT][RECONFIRMATION_IDEMPOTENT]', { appointmentId: id, tenantId: tenantContext.tenantId, requestId })
      return NextResponse.json({ success: true, appointmentUpdated: true, reconfirmationRequired: true, emailSent: false, idempotent: true, requestId, assignedUserId: existing.assigned_user_id || null, assignedUserName: null } satisfies AppointmentMutationResponse & { assignedUserId: string | null; assignedUserName: string | null })
    }
    if (!changes.assigneeChanged) {
      return NextResponse.json({ success: true, appointmentUpdated: true, reconfirmationRequired: false, emailSent: false, idempotent: true, requestId, assignedUserId: existing.assigned_user_id || null, assignedUserName: null } satisfies AppointmentMutationResponse & { assignedUserId: string | null; assignedUserName: string | null })
    }
    if (existing.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Un rendez-vous annulé ne peut pas être réaffecté.' }, { status: 409 })
    }

    if (nextAssignedUserId) {
      const member = assignableMembers.find((item) => item.userId === nextAssignedUserId)
      if (!member) {
        return NextResponse.json(
          { success: false, error: "Le collaborateur sélectionné n'appartient pas à votre équipe." },
          { status: 403 },
        )
      }
      nextAssignedUserName = [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.email
    }

    const project = existing.project_id
      ? await resolveProjectForAppointment({ projectId: String(existing.project_id), tenantContext })
      : null
    const reconfirmationRequired = existing.confirmation_status === 'confirmed'
    const now = new Date().toISOString()

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('project_appointments')
      .update({
        assigned_user_id: nextAssignedUserId,
        is_unassigned: false,
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
      })
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)
      .eq('updated_at', String(existing.updated_at || ''))
      .select('id, title, client_name, project_id, assigned_user_id, start_time, end_time, updated_at')
      .maybeSingle()

    if (updateError || !updated) {
      if (!updateError) {
        const { data: current } = await supabaseAdmin
          .from('project_appointments')
          .select('assigned_user_id, confirmation_status, confirmation_request_id')
          .eq('id', id)
          .eq('tenant_id', tenantContext.tenantId)
          .maybeSingle()
        if (requestId && current?.assigned_user_id === nextAssignedUserId && current.confirmation_status === 'pending' && current.confirmation_request_id === requestId) {
          console.info('[APPOINTMENT][RECONFIRMATION_IDEMPOTENT]', { appointmentId: id, tenantId: tenantContext.tenantId, requestId })
          return NextResponse.json({ success: true, appointmentUpdated: true, reconfirmationRequired: true, emailSent: false, idempotent: true, requestId, assignedUserId: nextAssignedUserId, assignedUserName: nextAssignedUserName } satisfies AppointmentMutationResponse & { assignedUserId: string | null; assignedUserName: string | null })
        }
      }
      if (!updateError) {
        return NextResponse.json({ success: false, error: 'Le rendez-vous a été modifié entre-temps. Rechargez le planning avant de recommencer.', code: 'APPOINTMENT_VERSION_CONFLICT' }, { status: 409 })
      }
      console.error('[APPOINTMENTS ASSIGN] Erreur mise à jour:', updateError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    await recordAppointmentLifecycleActivity({
      projectId: existing.project_id ? String(existing.project_id) : null,
      action: 'APPOINTMENT_REASSIGNED',
      description: `Collaborateur affecté : ${nextAssignedUserName || 'Collaborateur'}`,
    }).catch((error) => {
      console.warn('[APPOINTMENT][ACTIVITY_FAILED]', { appointmentId: id, projectId: existing.project_id || null, requestId, message: error instanceof Error ? error.message : String(error) })
    })
    if (reconfirmationRequired) {
      console.info('[APPOINTMENT][RECONFIRMATION_REQUIRED]', { appointmentId: id, projectId: existing.project_id || null, tenantId: tenantContext.tenantId, requestId, changes })
      await recordAppointmentLifecycleActivity({ projectId: existing.project_id ? String(existing.project_id) : null, action: 'APPOINTMENT_RECONFIRMATION_REQUIRED', description: 'Nouvelle confirmation client requise après modification du rendez-vous.' }).catch((error) => {
        console.warn('[APPOINTMENT][ACTIVITY_FAILED]', { appointmentId: id, projectId: existing.project_id || null, requestId, message: error instanceof Error ? error.message : String(error) })
      })
    }

    if (nextAssignedUserId && nextAssignedUserId !== existing.assigned_user_id) {
      waitUntil(sendAppointmentPush({
        id: String(updated.id),
        tenantId: tenantContext.tenantId,
        artisanId: String(existing.artisan_id || session.artisanId),
        assignedUserId: nextAssignedUserId,
        projectId: updated.project_id ? String(updated.project_id) : null,
        title: updated.title ? String(updated.title) : null,
        clientName: updated.client_name ? String(updated.client_name) : null,
        start: updated.start_time ? String(updated.start_time) : null,
        end: updated.end_time ? String(updated.end_time) : null,
        eventVersion: updated.updated_at ? String(updated.updated_at) : now,
      }, 'appointment_assigned', tenantContext.userId).catch((error) => {
        console.warn('[PUSH][APPOINTMENT_ASSIGNED]', { appointmentId: existing.id, message: error instanceof Error ? error.message : String(error) })
      }))
    }

    const emailResult: { sent: boolean; emailId?: string; errorCode?: string } = reconfirmationRequired
      ? await sendAppointmentReconfirmationEmail({
        appointmentId: id,
        projectId: existing.project_id ? String(existing.project_id) : null,
        artisanId: project?.artisanId || String(existing.artisan_id || session.artisanId || ''),
        clientEmail: project?.clientEmail || null,
        clientName: project?.client_name || (existing.client_name ? String(existing.client_name) : null),
        title: updated.title || null,
        start: updated.start_time || null,
      })
      : { sent: false as const }
    if (reconfirmationRequired && emailResult.sent) {
      console.info('[APPOINTMENT][RECONFIRMATION_EMAIL_SENT]', { appointmentId: id, projectId: existing.project_id || null, tenantId: tenantContext.tenantId, requestId, emailId: emailResult.emailId })
      await recordAppointmentLifecycleActivity({ projectId: existing.project_id ? String(existing.project_id) : null, action: 'APPOINTMENT_RECONFIRMATION_EMAIL_SENT', description: 'Email de nouvelle confirmation envoyé au client.' }).catch((error) => {
        console.warn('[APPOINTMENT][ACTIVITY_FAILED]', { appointmentId: id, projectId: existing.project_id || null, requestId, message: error instanceof Error ? error.message : String(error) })
      })
    } else if (reconfirmationRequired) {
      console.warn('[APPOINTMENT][RECONFIRMATION_EMAIL_FAILED]', { appointmentId: id, projectId: existing.project_id || null, tenantId: tenantContext.tenantId, requestId, errorCode: emailResult.errorCode || null })
    }

    const mutationResponse: AppointmentMutationResponse = {
      success: true,
      appointmentUpdated: true,
      reconfirmationRequired,
      emailSent: emailResult.sent,
      ...(reconfirmationRequired && !emailResult.sent ? { warningCode: 'RECONFIRMATION_EMAIL_FAILED', warning: 'Le rendez-vous a été modifié, mais l’email n’a pas pu être envoyé.' } : {}),
      requestId,
    }

    return NextResponse.json({
      ...mutationResponse,
      assignedUserId: nextAssignedUserId,
      assignedUserName: nextAssignedUserName,
    })
  } catch (error) {
    console.error('[APPOINTMENTS ASSIGN]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

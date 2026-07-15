import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createClientEvent } from '@/src/lib/client-events'
import { isConfirmationStatus, type AppointmentConfirmationStatus } from '@/src/lib/appointment-confirmation'
import { getUserByArtisanIdentifier, TABLES } from '@/src/lib/airtable'
import { sendAppointmentPush } from '@/src/lib/push'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function isValidToken(token: string) { return /^[0-9a-f]{48}$/i.test(token) }
function textOrNull(value: unknown, max: number) { return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null }
function fail(status: number, errorCode: string, error: string) {
  return NextResponse.json({ success: false, errorCode, error }, { status })
}

function actionCopy(status: AppointmentConfirmationStatus) {
  if (status === 'confirmed') return { title: 'Rendez-vous confirmé par le client', notification: 'Le client a confirmé le rendez-vous.' }
  if (status === 'change_requested') return { title: 'Changement demandé par le client', notification: 'Le client demande une modification du rendez-vous.' }
  return { title: 'Rendez-vous refusé par le client', notification: 'Le client a refusé le rendez-vous.' }
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string; appointmentId: string }> }) {
  try {
    const { token, appointmentId } = await context.params
    if (!isValidToken(token)) return fail(404, 'PORTAL_TOKEN_INVALID', 'Ce lien n’est plus valide.')
    const body = await request.json().catch(() => null)
    if (!body || !isConfirmationStatus(body.status) || !['confirmed', 'change_requested', 'cancelled'].includes(body.status)) {
      return fail(400, 'INVALID_CONFIRMATION_STATUS', 'Cette réponse ne peut pas être enregistrée.')
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('id, tenant_id, artisan_id')
      .eq('client_portal_token', token)
      .maybeSingle()
    if (projectError) throw projectError
    if (!project || !project.tenant_id) return fail(404, 'PORTAL_TOKEN_INVALID', 'Ce lien n’est plus valide.')

    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('project_appointments')
      .select('id, tenant_id, project_id, assigned_user_id, title, client_name, start_time, end_time, status, confirmation_status, confirmation_version')
      .eq('id', appointmentId)
      .eq('project_id', project.id)
      .eq('tenant_id', project.tenant_id)
      .maybeSingle()
    if (appointmentError) throw appointmentError
    if (!appointment) return fail(404, 'APPOINTMENT_NOT_FOUND', 'Ce rendez-vous n’est plus disponible.')
    if (appointment.status === 'cancelled' || appointment.confirmation_status === 'cancelled') {
      return fail(409, 'APPOINTMENT_ALREADY_CANCELLED', 'Ce rendez-vous est déjà annulé.')
    }

    const note = textOrNull(body.note, 1000)
    const requestId = textOrNull(body.requestId, 120)
    const { data, error } = await supabaseAdmin.rpc('confirm_project_appointment', {
      p_appointment_id: appointment.id,
      p_tenant_id: project.tenant_id,
      p_status: body.status,
      p_source: 'client',
      p_note: note,
      p_expected_version: Number.isInteger(body.expectedVersion) ? body.expectedVersion : Number(appointment.confirmation_version || 0),
      p_request_id: requestId,
      p_actor_user_id: null,
    })
    if (error) {
      if (/CONFIRMATION_VERSION_CONFLICT/.test(error.message || '')) return fail(409, 'APPOINTMENT_VERSION_CONFLICT', 'Le rendez-vous a été modifié. Les informations ont été actualisées.')
      if (/APPOINTMENT_NOT_FOUND/.test(error.message || '')) return fail(404, 'APPOINTMENT_NOT_FOUND', 'Ce rendez-vous n’est plus disponible.')
      throw error
    }

    const copy = actionCopy(body.status)
    await createClientEvent({
      projectId: String(project.id), artisanId: String(project.artisan_id), tenantId: String(project.tenant_id),
      eventType: 'appointment_updated', visibility: 'client', source: 'client', title: copy.title, message: note,
    })
    const fallbackUser = appointment.assigned_user_id ? null : await getUserByArtisanIdentifier(String(project.artisan_id))
    waitUntil(sendAppointmentPush({
      id: String(appointment.id), tenantId: String(project.tenant_id), artisanId: String(project.artisan_id),
      assignedUserId: appointment.assigned_user_id ? String(appointment.assigned_user_id) : fallbackUser?.id || null,
      projectId: String(project.id), title: appointment.title ? String(appointment.title) : null,
      clientName: appointment.client_name ? String(appointment.client_name) : null,
      start: appointment.start_time ? String(appointment.start_time) : null, end: appointment.end_time ? String(appointment.end_time) : null,
      eventVersion: new Date().toISOString(),
    }, 'appointment_updated').catch(() => undefined))

    return NextResponse.json({ success: true, appointment: {
      id: String(appointment.id), title: String(appointment.title || 'Rendez-vous'), start: appointment.start_time ? String(appointment.start_time) : null,
      end: appointment.end_time ? String(appointment.end_time) : null, status: body.status, source: 'client', note,
      updatedAt: new Date().toISOString(), version: Number((data as { confirmation_version?: number } | null)?.confirmation_version || Number(appointment.confirmation_version || 0) + 1),
    } })
  } catch (error) {
    console.error('[CLIENT-PORTAL][APPOINTMENT_CONFIRMATION]', { message: error instanceof Error ? error.message : 'Unknown error' })
    return fail(500, 'APPOINTMENT_CONFIRMATION_FAILED', 'Votre réponse n’a pas pu être enregistrée. Réessayez dans un instant.')
  }
}

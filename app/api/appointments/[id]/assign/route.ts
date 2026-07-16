import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { getSession } from '@/src/lib/auth-utils'
import { canAssignAppointments, listAssignableAppointmentMembers, logAppointmentActivity } from '@/src/lib/appointments/access'
import { normalizeAppointmentMutationRequestId, type AppointmentMutationRequest, type AppointmentMutationResponse } from '@/src/lib/appointments/mutation-contract'
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
      .select('id, tenant_id, artisan_id, project_id, assigned_user_id, title, client_name, start_time, end_time')
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

    const { error: updateError } = await supabaseAdmin
      .from('project_appointments')
      .update({
        assigned_user_id: nextAssignedUserId,
        is_unassigned: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)

    if (updateError) {
      console.error('[APPOINTMENTS ASSIGN] Erreur mise à jour:', updateError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    await logAppointmentActivity({
      projectId: existing.project_id ? String(existing.project_id) : null,
      action: 'APPOINTMENT_REASSIGNED',
      description: `Collaborateur affecté : ${nextAssignedUserName || 'Collaborateur'}`,
    })

    if (nextAssignedUserId && nextAssignedUserId !== existing.assigned_user_id) {
      waitUntil(sendAppointmentPush({
        id: String(existing.id),
        tenantId: tenantContext.tenantId,
        artisanId: String(existing.artisan_id || session.artisanId),
        assignedUserId: nextAssignedUserId,
        projectId: existing.project_id ? String(existing.project_id) : null,
        title: existing.title ? String(existing.title) : null,
        clientName: existing.client_name ? String(existing.client_name) : null,
        start: existing.start_time ? String(existing.start_time) : null,
        end: existing.end_time ? String(existing.end_time) : null,
        eventVersion: new Date().toISOString(),
      }, 'appointment_assigned', tenantContext.userId).catch((error) => {
        console.warn('[PUSH][APPOINTMENT_ASSIGNED]', { appointmentId: existing.id, message: error instanceof Error ? error.message : String(error) })
      }))
    }

    const mutationResponse: AppointmentMutationResponse = {
      success: true,
      appointmentUpdated: true,
      reconfirmationRequired: false,
      emailSent: false,
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

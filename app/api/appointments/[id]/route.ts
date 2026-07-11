import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import {
  canDeleteAppointment,
  canEditAppointment,
  findAppointmentConflict,
  listAssignableAppointmentMembers,
  logAppointmentActivity,
  resolveProjectForAppointment,
} from '@/src/lib/appointments/access'
import { isEventType } from '@/src/lib/calendar/event-types'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

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

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('project_appointments')
      .select('id, tenant_id, project_id, assigned_user_id, title, start_time, end_time, location, description, status, event_type')
      .eq('id', id)
      .maybeSingle()

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

    const nextAssignedUserId = body.assignedUserId === undefined
      ? (existing.assigned_user_id ? String(existing.assigned_user_id) : null)
      : body.assignedUserId
        ? String(body.assignedUserId)
        : null

    if (body.eventType !== undefined && !isEventType(body.eventType)) {
      return NextResponse.json({ success: false, error: "Type d'événement invalide" }, { status: 400 })
    }

    if (body.projectId) {
      const project = await resolveProjectForAppointment({
        projectId: String(body.projectId),
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
    const conflict = await findAppointmentConflict({
      tenantId: tenantContext.tenantId,
      assignedUserId: nextAssignedUserId,
      start: nextStart,
      end: nextEnd,
      excludeAppointmentId: id,
    })

    const updatePayload = {
      ...(body.title !== undefined ? { title: String(body.title || '') } : {}),
      ...(body.start !== undefined ? { start_time: nextStart } : {}),
      ...(body.end !== undefined ? { end_time: nextEnd } : {}),
      ...(body.location !== undefined ? { location: body.location ? String(body.location) : null } : {}),
      ...(body.description !== undefined ? { description: body.description ? String(body.description) : null } : {}),
      ...(body.status !== undefined ? { status: String(body.status || '') } : {}),
      ...(body.eventType !== undefined ? { event_type: body.eventType } : {}),
      ...(body.assignedUserId !== undefined
        ? {
            assigned_user_id: nextAssignedUserId,
            is_unassigned: !nextAssignedUserId,
          }
        : {}),
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('project_appointments')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)
      .select('id, title, start_time, end_time, location, description, status, event_type, assigned_user_id, is_unassigned')
      .single()

    if (updateError) {
      console.error('[APPOINTMENTS PATCH] Erreur mise à jour:', updateError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    await logAppointmentActivity({
      projectId: existing.project_id ? String(existing.project_id) : null,
      action: 'APPOINTMENT_UPDATED',
      description: 'Rendez-vous mis à jour',
    })

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
      .select('id, tenant_id, project_id, assigned_user_id')
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[APPOINTMENTS DELETE]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

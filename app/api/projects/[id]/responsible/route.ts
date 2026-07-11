import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import {
  authorizeProjectAccess,
  listAssignableProjectResponsibles,
  listProjectResponsiblesByTenant,
  projectResponsibilityColumnExists,
} from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { PermissionError, requirePermission } from '@/src/lib/team/access'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function createResponsibilityActivity(params: {
  projectId: string
  actorName: string
  previousResponsibleName: string | null
  nextResponsibleName: string | null
}) {
  const { projectId, actorName, previousResponsibleName, nextResponsibleName } = params

  const action = !previousResponsibleName && nextResponsibleName
    ? 'PROJECT_RESPONSIBLE_ASSIGNED'
    : previousResponsibleName && nextResponsibleName
      ? 'PROJECT_RESPONSIBLE_REASSIGNED'
      : 'PROJECT_RESPONSIBLE_REMOVED'

  const description = !previousResponsibleName && nextResponsibleName
    ? `Responsable commercial affecté : ${nextResponsibleName} par ${actorName}`
    : previousResponsibleName && nextResponsibleName
      ? `Responsable commercial réaffecté : ${previousResponsibleName} → ${nextResponsibleName} par ${actorName}`
      : `Responsable commercial retiré : ${previousResponsibleName || 'Non affecté'} par ${actorName}`

  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[PROJECT RESPONSIBLE ACTIVITY]', error.message)
  }
}

function getActorName(firstName?: string | null, lastName?: string | null, email?: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || email || 'Utilisateur inconnu'
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supportsResponsibleUser = await projectResponsibilityColumnExists()
    if (!supportsResponsibleUser) {
      return NextResponse.json(
        { success: false, error: 'La colonne responsible_user_id n’est pas encore disponible.' },
        { status: 503 },
      )
    }

    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!body || !('responsibleUserId' in body)) {
      return NextResponse.json({ success: false, error: 'Payload invalide.' }, { status: 400 })
    }

    const rawResponsibleUserId = body.responsibleUserId
    const responsibleUserId =
      typeof rawResponsibleUserId === 'string' && rawResponsibleUserId.trim()
        ? rawResponsibleUserId.trim()
        : null

    if (responsibleUserId && !UUID_REGEX.test(responsibleUserId)) {
      return NextResponse.json({ success: false, error: 'responsibleUserId invalide.' }, { status: 400 })
    }

    const authResult = await authorizeProjectAccess({
      projectId: id,
      requiredPermission: 'projects.assign',
      select: 'id, responsible_user_id, responsible_assigned_at, responsible_assigned_by',
    })

    if (!authResult || !authResult.tenantContext) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    const currentResponsibleUserId =
      typeof authResult.project.responsible_user_id === 'string' ? authResult.project.responsible_user_id : null

    if (currentResponsibleUserId && currentResponsibleUserId !== responsibleUserId) {
      requirePermission(authResult.tenantContext, 'projects.reassign')
    }

    const responsibilityMap = await listProjectResponsiblesByTenant(authResult.tenantContext.tenantId)
    const currentResponsibleUser = currentResponsibleUserId
      ? responsibilityMap.get(currentResponsibleUserId) || null
      : null

    let responsibleUser = null
    if (responsibleUserId) {
      const assignableResponsibles = await listAssignableProjectResponsibles(authResult.tenantContext.tenantId)
      responsibleUser = assignableResponsibles.find((member) => member.userId === responsibleUserId) || null
      if (!responsibleUser) {
        return NextResponse.json(
          { success: false, error: 'Le collaborateur sélectionné n’appartient pas à votre équipe active.' },
          { status: 403 },
        )
      }
    }

    if (currentResponsibleUserId === responsibleUserId) {
      return NextResponse.json({
        success: true,
        projectId: authResult.projectId,
        responsibleUserId,
        responsibleAssignedAt: authResult.project.responsible_assigned_at || null,
        responsibleAssignedBy: authResult.project.responsible_assigned_by || null,
        responsibleUser: responsibleUser || currentResponsibleUser,
      })
    }

    const assignedAt = new Date().toISOString()
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from(TABLES.projects)
      .update({
        responsible_user_id: responsibleUserId,
        responsible_assigned_at: assignedAt,
        responsible_assigned_by: authResult.tenantContext.userId,
      })
      .eq('id', authResult.projectId)
      .select('id, responsible_user_id, responsible_assigned_at, responsible_assigned_by')
      .single()

    if (updateError) {
      throw updateError
    }

    try {
      await createResponsibilityActivity({
        projectId: authResult.projectId,
        actorName: getActorName(
          authResult.session.firstName,
          authResult.session.lastName,
          authResult.session.email,
        ),
        previousResponsibleName: currentResponsibleUser?.displayName || null,
        nextResponsibleName: responsibleUser?.displayName || null,
      })
    } catch (activityError) {
      console.error('[PROJECT RESPONSIBLE PATCH][ACTIVITY]', activityError instanceof Error ? activityError.message : String(activityError))
    }

    return NextResponse.json({
      success: true,
      projectId: authResult.projectId,
      responsibleUserId: updatedProject.responsible_user_id,
      responsibleAssignedAt: updatedProject.responsible_assigned_at,
      responsibleAssignedBy: updatedProject.responsible_assigned_by,
      responsibleUser,
    })
  } catch (error) {
    const permissionError = error as PermissionError
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status })
    }
    console.error('[PROJECT RESPONSIBLE PATCH]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

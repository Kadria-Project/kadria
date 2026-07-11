import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import {
  listAssignableProjectResponsibles,
  listProjectResponsiblesByTenant,
  projectResponsibilityColumnExists,
} from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { requirePermission, type PermissionError } from '@/src/lib/team/access'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

async function loadProjectForTenant(projectId: string, tenantId: string, artisanId: string) {
  const direct = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, tenant_id, artisan_id, responsible_user_id')
    .eq('id', projectId)
    .maybeSingle()

  if (direct.error) throw direct.error
  if (direct.data) {
    if (direct.data.tenant_id && String(direct.data.tenant_id) !== tenantId) return null
    if (!direct.data.tenant_id && direct.data.artisan_id !== artisanId) return null
    return direct.data
  }

  const legacy = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, tenant_id, artisan_id, responsible_user_id')
    .eq('record_id', projectId)
    .maybeSingle()

  if (legacy.error) throw legacy.error
  if (!legacy.data) return null
  if (legacy.data.tenant_id && String(legacy.data.tenant_id) !== tenantId) return null
  if (!legacy.data.tenant_id && legacy.data.artisan_id !== artisanId) return null
  return legacy.data
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    const tenantContext = await getCurrentTenantContext()
    const securedTenantContext = requirePermission(tenantContext, 'projects.assign')
    const supportsResponsibleUser = await projectResponsibilityColumnExists()
    if (!supportsResponsibleUser) {
      return NextResponse.json(
        { success: false, error: 'La colonne responsible_user_id n est pas encore disponible.' },
        { status: 503 },
      )
    }

    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!body || !('responsibleUserId' in body)) {
      return NextResponse.json({ success: false, error: 'Payload invalide.' }, { status: 400 })
    }

    const responsibleUserId =
      typeof body.responsibleUserId === 'string' && body.responsibleUserId.trim()
        ? body.responsibleUserId.trim()
        : null

    const project = await loadProjectForTenant(id, securedTenantContext.tenantId, session.artisanId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    const isReassignment = Boolean(project.responsible_user_id) && project.responsible_user_id !== responsibleUserId
    if (isReassignment) {
      requirePermission(tenantContext, 'projects.reassign')
    }

    let responsibleUser = null
    if (responsibleUserId) {
      const assignableResponsibles = await listAssignableProjectResponsibles(securedTenantContext.tenantId)
      responsibleUser = assignableResponsibles.find((member) => member.userId === responsibleUserId) || null
      if (!responsibleUser) {
        return NextResponse.json(
          { success: false, error: 'Le collaborateur selectionne n appartient pas a votre equipe active.' },
          { status: 403 },
        )
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.projects)
      .update({
        responsible_user_id: responsibleUserId,
        responsible_assigned_at: new Date().toISOString(),
        responsible_assigned_by: securedTenantContext.userId,
      })
      .eq('id', project.id)

    if (updateError) {
      throw updateError
    }

    if (!responsibleUser && responsibleUserId) {
      const responsibilityMap = await listProjectResponsiblesByTenant(securedTenantContext.tenantId)
      responsibleUser = responsibilityMap.get(responsibleUserId) || null
    }

    return NextResponse.json({
      success: true,
      responsibleUserId,
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

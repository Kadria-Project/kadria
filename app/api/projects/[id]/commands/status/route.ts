import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import {
  parseProjectStatusCommandInput,
  projectCommandError,
  type ProjectCommandResult,
} from '@/src/lib/projects/commands/project-command-contract'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { PermissionError } from '@/src/lib/team/access'

export const dynamic = 'force-dynamic'

function requestId() {
  return crypto.randomUUID().slice(0, 8)
}

function errorResponse(result: ProjectCommandResult, status: number) {
  return NextResponse.json(result, { status })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = requestId()
  try {
    const { id: projectId } = await context.params
    const input = parseProjectStatusCommandInput(await request.json().catch(() => null))
    const access = await authorizeProjectAccess({
      projectId,
      select: 'id',
      requiredPermission: 'projects.update',
      allowAppointmentAccess: true,
    })
    if (!access) return errorResponse(projectCommandError('NOT_FOUND', 'Projet introuvable.', id), 404)

    const { error } = await supabaseAdmin
      .from(TABLES.projects)
      .update({ status: input.status, contacted: true })
      .eq('id', access.projectId)
    if (error) throw error

    const { error: activityError } = await supabaseAdmin.from(TABLES.activity).insert({
      project_id: access.projectId,
      action: 'STATUS_UPDATED',
      description: `Statut modifiÃ© : ${input.status}`,
      created_at: new Date().toISOString(),
    })
    if (activityError) console.error(`[PROJECT_STATUS_COMMAND] requestId=${id} stage=activity code=${activityError.code || 'UNKNOWN'} message="${activityError.message}"`)

    return NextResponse.json({
      ok: true,
      data: { status: input.status },
      refresh: ['brief', 'facts', 'commercial', 'engagement'],
    } satisfies ProjectCommandResult<{ status: string }>)
  } catch (error) {
    const permissionError = error as PermissionError
    if (permissionError?.status) {
      return errorResponse(projectCommandError(permissionError.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', permissionError.message, id), permissionError.status)
    }
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    const validation = message.endsWith('invalide.') || message.endsWith('requis.') || message.endsWith('trop long.')
    console.error(`[PROJECT_STATUS_COMMAND] requestId=${id} stage=${validation ? 'validation' : 'mutation'} code=${validation ? 'INVALID_INPUT' : 'SERVER_ERROR'} message="${message.slice(0, 300)}"`)
    return errorResponse(projectCommandError(validation ? 'INVALID_INPUT' : 'SERVER_ERROR', validation ? message : 'Impossible de mettre Ã  jour le statut.', id), validation ? 400 : 500)
  }
}

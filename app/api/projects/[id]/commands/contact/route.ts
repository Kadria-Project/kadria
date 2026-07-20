import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import {
  parseProjectContactCommandInput,
  projectCommandError,
  type ProjectCommandResult,
} from '@/src/lib/projects/commands/project-command-contract'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { toSupabaseProjectUpdate } from '@/src/lib/supabase/mapping'
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
    const input = parseProjectContactCommandInput(await request.json().catch(() => null))
    const access = await authorizeProjectAccess({
      projectId,
      select: 'id',
      requiredPermission: 'projects.update',
      allowAppointmentAccess: true,
    })
    if (!access) return errorResponse(projectCommandError('NOT_FOUND', 'Projet introuvable.', id), 404)

    const fields = toSupabaseProjectUpdate({
      'Client First Name': input.clientFirstName,
      'Client Name': input.clientName,
      'Client Phone': input.clientPhone,
      'Client Email': input.clientEmail,
      'Site Address': input.siteAddress,
      ...(input.city !== undefined ? { City: input.city } : {}),
      ...(input.postalCode !== undefined ? { 'Postal Code': input.postalCode } : {}),
      ...(input.latitude !== undefined ? { Latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { Longitude: input.longitude } : {}),
    })
    const { error } = await supabaseAdmin.from(TABLES.projects).update(fields).eq('id', access.projectId)
    if (error) throw error

    return NextResponse.json({ ok: true, refresh: ['brief'] } satisfies ProjectCommandResult)
  } catch (error) {
    const permissionError = error as PermissionError
    if (permissionError?.status) {
      return errorResponse(projectCommandError(permissionError.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', permissionError.message, id), permissionError.status)
    }
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    const validation = message.endsWith('invalide.') || message.endsWith('trop long.')
    console.error(`[PROJECT_CONTACT_COMMAND] requestId=${id} stage=${validation ? 'validation' : 'mutation'} code=${validation ? 'INVALID_INPUT' : 'SERVER_ERROR'} message="${message.slice(0, 300)}"`)
    return errorResponse(projectCommandError(validation ? 'INVALID_INPUT' : 'SERVER_ERROR', validation ? message : 'Impossible de mettre Ã  jour les coordonnÃ©es.', id), validation ? 400 : 500)
  }
}

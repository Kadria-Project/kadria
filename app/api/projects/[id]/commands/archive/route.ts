import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { PermissionError } from '@/src/lib/team/access'

export const dynamic = 'force-dynamic'

export async function PATCH(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  try {
    const { id: projectId } = await context.params
    const access = await authorizeProjectAccess({ projectId, select: 'id', requiredPermission: 'projects.update', allowAppointmentAccess: true })
    if (!access) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Projet introuvable.', requestId } }, { status: 404 })
    const { error } = await supabaseAdmin.from(TABLES.projects).update({ lead_status: 'archived' }).eq('id', access.projectId)
    if (error) throw error
    const { error: activityError } = await supabaseAdmin.from(TABLES.activity).insert({ project_id: access.projectId, action: 'PROJECT_ARCHIVED', description: 'Dossier archive', created_at: new Date().toISOString() })
    if (activityError) console.error(`[PROJECT_ARCHIVE_COMMAND] requestId=${requestId} stage=activity code=${activityError.code || 'UNKNOWN'} message="${activityError.message.slice(0, 300)}"`)
    return NextResponse.json({ ok: true, data: { archived: true }, refresh: ['brief', 'facts', 'commercial', 'engagement'] })
  } catch (error) {
    const permissionError = error as PermissionError
    if (permissionError?.status) return NextResponse.json({ ok: false, error: { code: permissionError.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: permissionError.message, requestId } }, { status: permissionError.status })
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error(`[PROJECT_ARCHIVE_COMMAND] requestId=${requestId} stage=mutation code=SERVER_ERROR message="${message.slice(0, 300)}"`)
    return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Impossible d’archiver le dossier.', requestId } }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as
      | {
          recommendationId?: string
          actionType?: string
          title?: string
          entityType?: string
          entityId?: string
          actionRoute?: string
        }
      | null

    if (!body?.actionType || !body?.title) {
      return NextResponse.json({ success: false, error: 'Payload invalide' }, { status: 400 })
    }

    let projectId: string | null = null
    if (body.entityType === 'project' && body.entityId) {
      const authResult = await authorizeProjectAccess({
        projectId: body.entityId,
        select: 'id',
        allowAppointmentAccess: true,
      })

      if (!authResult) {
        return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
      }

      projectId = authResult.projectId
    }

    const { error } = await supabaseAdmin.from(TABLES.activity).insert({
      project_id: projectId,
      action: 'OPERATIONS_CENTER_ACTION_EXECUTED',
      description: `${body.title} (${body.actionType})`,
    })

    if (error) {
      console.error('[OPERATIONS_CENTER_ACTION_LOG]', error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[OPERATIONS_CENTER_ACTION_LOG]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

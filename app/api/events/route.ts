import { NextRequest, NextResponse } from 'next/server'
import { getEvents, createEvent } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })

    const events = await getEvents(session.artisanId)
    return NextResponse.json({ success: true, events })
  } catch (error) {
    console.error('[EVENTS GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })

    const body = await request.json()
    const projectId = body.projectId || body.project_id

    if (projectId) {
      const { data: project, error } = await supabaseAdmin
        .from('Projects')
        .select('id, artisan_id')
        .eq('id', projectId)
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!project) return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
      if (project.artisan_id !== session.artisanId) {
        return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
      }
    }

    delete body.artisanId
    delete body.artisan_id
    delete body['Artisan ID']

    const result = await createEvent({ ...body, artisanId: session.artisanId })
    return NextResponse.json({ success: true, event: result })
  } catch (error) {
    console.error('[EVENTS POST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

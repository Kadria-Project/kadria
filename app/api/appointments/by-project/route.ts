import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { TABLES } from '@/src/lib/airtable'

function tableMissing(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message || ''
  return /relation .* does not exist/i.test(message) || (error as { code?: string } | null)?.code === '42P01'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId requis' }, { status: 400 })
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('id, artisan_id')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) {
      console.error('[APPOINTMENTS BY PROJECT] Erreur lecture projet:', projectError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    if (project.artisan_id !== session.artisanId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const { data: appointment, error } = await supabaseAdmin
      .from('project_appointments')
      .select('id, start_time, end_time, location, status, created_at')
      .eq('project_id', projectId)
      .eq('artisan_id', session.artisanId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      if (tableMissing(error)) {
        return NextResponse.json({ success: true, appointment: null })
      }
      console.error('[APPOINTMENTS BY PROJECT] Erreur lecture appointment:', error.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    if (!appointment) {
      return NextResponse.json({ success: true, appointment: null })
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        start: appointment.start_time,
        end: appointment.end_time,
        location: appointment.location,
        status: appointment.status,
      },
    })
  } catch (error) {
    console.error('[APPOINTMENTS BY PROJECT]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

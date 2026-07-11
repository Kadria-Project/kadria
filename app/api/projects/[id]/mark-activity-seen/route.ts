import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { PermissionError } from '@/src/lib/team/access'

// Marque les nouveautés client d'un projet comme vues.

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = String((error as { message?: unknown }).message || '')
  const code = String((error as { code?: unknown }).code || '')
  return code === '42703' || /column .* does not exist/i.test(message)
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authResult = await authorizeProjectAccess({
      projectId: id,
      allowAppointmentAccess: true,
      select: 'id',
    })

    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from(TABLES.projects)
      .update({ client_activity_last_seen_at: new Date().toISOString() })
      .eq('id', authResult.projectId)

    if (error) {
      if (isMissingColumnError(error)) {
        return NextResponse.json({ success: true, applied: false })
      }
      console.error('[MARK-ACTIVITY-SEEN] Update error:', error.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({ success: true, applied: true })
  } catch (e) {
    const permissionError = e as PermissionError
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status })
    }

    console.error('[MARK-ACTIVITY-SEEN] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

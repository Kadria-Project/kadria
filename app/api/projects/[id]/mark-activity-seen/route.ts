import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'

// Marque les nouveautés client d'un projet comme "vues" (colonne Activité du
// suivi commercial). Appelée une seule fois à l'ouverture de la fiche projet
// (app/dashboard-v2/projet/[id]/page.tsx). Route authentifiée uniquement,
// scoping strict par artisan_id — jamais de token public ici, et jamais
// d'écriture sur un projet qui n'appartient pas à l'artisan de la session.
//
// Tolérant à l'absence de la colonne client_activity_last_seen_at (migration
// 20260712_project_client_activity_seen.sql pas encore appliquée) : ne fait
// jamais échouer la fiche projet, retourne juste ok: false en silence.

async function getAuthorizedProject(id: string, artisanId: string) {
  const direct = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, artisan_id')
    .eq('id', id)
    .limit(1)
    .maybeSingle()

  if (direct.error) throw direct.error
  if (direct.data) {
    return direct.data.artisan_id === artisanId ? direct.data : 'forbidden'
  }

  const legacy = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, artisan_id')
    .eq('record_id', id)
    .limit(1)
    .maybeSingle()

  if (legacy.error) throw legacy.error
  if (!legacy.data) return null
  return legacy.data.artisan_id === artisanId ? legacy.data : 'forbidden'
}

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
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const project = await getAuthorizedProject(id, session.artisanId)

    if (project === 'forbidden') {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }
    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from(TABLES.projects)
      .update({ client_activity_last_seen_at: new Date().toISOString() })
      .eq('id', project.id)

    if (error) {
      if (isMissingColumnError(error)) {
        // Migration pas encore appliquée dans cet environnement : pas
        // bloquant, la colonne Activité retombera juste sur "tout non lu".
        return NextResponse.json({ success: true, applied: false })
      }
      console.error('[MARK-ACTIVITY-SEEN] Update error:', error.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({ success: true, applied: true })
  } catch (e) {
    console.error('[MARK-ACTIVITY-SEEN] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

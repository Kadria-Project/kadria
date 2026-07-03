import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { createClientEvent, getArtisanTimelineEvents } from '@/src/lib/client-events'
import { supabaseAdmin } from '@/src/lib/supabase/server'

// Réponse artisan visible dans le portail client (lot messagerie V1). Route
// authentifiée uniquement — jamais de token public ici. artisan_id vient
// toujours de la session serveur, jamais du corps de la requête.

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

export async function GET(
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

    const events = await getArtisanTimelineEvents(String(project.id))

    return NextResponse.json({ success: true, events })
  } catch (e) {
    console.error('[CLIENT-REPLIES GET] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Requête invalide' }, { status: 400 })
    }

    const b = (body || {}) as Record<string, unknown>
    const message = typeof b.message === 'string' ? b.message.trim().slice(0, 2000) : ''

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message requis.' }, { status: 400 })
    }

    const { ok, event } = await createClientEvent({
      projectId: String(project.id),
      artisanId: session.artisanId,
      eventType: 'artisan_reply',
      visibility: 'client',
      source: 'artisan',
      title: "Réponse de l'artisan",
      message,
      createdBy: session.artisanId,
    })

    if (!ok || !event) {
      return NextResponse.json(
        { success: false, error: "Impossible d'enregistrer la réponse. Réessayez." },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, event })
  } catch (e) {
    console.error('[CLIENT-REPLIES POST] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

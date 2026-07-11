import { NextRequest, NextResponse } from 'next/server'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { createClientEvent, getArtisanTimelineEvents } from '@/src/lib/client-events'
import { PermissionError } from '@/src/lib/team/access'

// Réponse artisan visible dans le portail client. Route authentifiée uniquement.

export async function GET(
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

    const events = await getArtisanTimelineEvents(authResult.projectId)

    return NextResponse.json({ success: true, events })
  } catch (e) {
    const permissionError = e as PermissionError
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status })
    }

    console.error('[CLIENT-REPLIES GET] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authResult = await authorizeProjectAccess({
      projectId: id,
      requiredPermission: 'projects.update',
      allowAppointmentAccess: true,
      select: 'id',
    })

    if (!authResult) {
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
      projectId: authResult.projectId,
      artisanId: authResult.session.artisanId,
      eventType: 'artisan_reply',
      visibility: 'client',
      source: 'artisan',
      title: "Réponse de l'artisan",
      message,
      createdBy: authResult.session.artisanId,
    })

    if (!ok || !event) {
      return NextResponse.json(
        { success: false, error: "Impossible d'enregistrer la réponse. Réessayez." },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, event })
  } catch (e) {
    const permissionError = e as PermissionError
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status })
    }

    console.error('[CLIENT-REPLIES POST] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

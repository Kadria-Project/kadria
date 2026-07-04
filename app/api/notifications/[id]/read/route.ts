import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { markNotificationRead } from '@/src/lib/notifications'

// Marque une notification comme lue. artisan_id vient toujours de la
// session, jamais du front — impossible de marquer/lire une notification
// d'un autre artisan (scoping strict dans markNotificationRead).

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
    if (!id) {
      return NextResponse.json({ success: false, error: 'Identifiant manquant' }, { status: 400 })
    }

    const result = await markNotificationRead(id, session.artisanId)
    if (!result.ok) {
      return NextResponse.json({ success: false, error: 'Notification introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[NOTIFICATIONS READ] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

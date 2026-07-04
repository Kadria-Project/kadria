import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { listArtisanNotifications } from '@/src/lib/notifications'

// Centre de notifications artisan V1 : route authentifiée uniquement,
// artisan_id dérivé exclusivement de la session (jamais accepté depuis le
// front), même convention que toutes les autres routes dashboard.

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get('limit'))
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const cursor = searchParams.get('cursor')

    const { notifications, unreadCount } = await listArtisanNotifications(session.artisanId, {
      limit,
      unreadOnly,
      cursor,
    })

    return NextResponse.json({ success: true, notifications, unreadCount })
  } catch (e) {
    console.error('[NOTIFICATIONS GET] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { markAllNotificationsRead } from '@/src/lib/notifications'

// Marque toutes les notifications de l'artisan connecté comme lues.
// artisan_id dérivé exclusivement de la session serveur.

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const result = await markAllNotificationsRead(session.artisanId)
    if (!result.ok) {
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[NOTIFICATIONS READ-ALL] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

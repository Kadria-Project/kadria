import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { recordUnknownTrade } from '@/src/lib/unknown-trades'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const tradeName = typeof body.tradeName === 'string' ? body.tradeName : ''
    if (!tradeName.trim()) {
      return NextResponse.json({ success: false, error: 'tradeName est requis' }, { status: 400 })
    }
    const specialties = Array.isArray(body.specialties)
      ? body.specialties.filter((s: unknown): s is string => typeof s === 'string')
      : undefined

    const { ok, tableMissing } = await recordUnknownTrade(session.artisanId, tradeName, specialties)

    if (tableMissing) {
      return NextResponse.json({ success: false, error: 'La table unknown_trade_reports n\'existe pas encore en base. Exécutez la migration Supabase.' }, { status: 503 })
    }
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[UNKNOWN TRADE POST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

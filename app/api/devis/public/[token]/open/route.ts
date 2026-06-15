import { NextRequest, NextResponse } from 'next/server'
import { airtableBase, TABLES, getDevisByToken } from '@/src/lib/airtable'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length !== 36) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    const devis = await getDevisByToken(token)
    if (!devis) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const newCount = devis.opensCount + 1

    await airtableBase(TABLES.devis).update(devis.id, {
      'Opens_count': newCount,
      'Last_opened_date': now,
      'First_opened_at': devis.opensCount === 0 ? now : (devis.firstOpenedAt || now),
    })

    return NextResponse.json({
      success: true,
      opens_count: newCount,
      last_opened_date: now,
    })
  } catch (error) {
    console.error('[DEVIS PUBLIC OPEN]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

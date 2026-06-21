import { NextRequest, NextResponse } from 'next/server'
import { getDevisByToken, updateDevis } from '@/src/lib/airtable'

const MAX_REQUESTS_PER_IP = 5
const requestCounts = new Map<string, number>()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length !== 36) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    const count = (requestCounts.get(ip) || 0) + 1
    requestCounts.set(ip, count)
    if (count > MAX_REQUESTS_PER_IP) {
      return NextResponse.json({ error: 'Trop de requêtes, veuillez réessayer plus tard' }, { status: 429 })
    }

    const devis = await getDevisByToken(token)
    if (!devis) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    if (devis.accepted) {
      return NextResponse.json({ error: 'Devis déjà accepté' }, { status: 400 })
    }

    const now = new Date().toISOString()

    await updateDevis(devis.id, {
      accepted: true,
      acceptedAt: now,
      acceptedIp: ip,
      statut: 'Accepté',
    })

    return NextResponse.json({ success: true, accepted_at: now })
  } catch (error) {
    console.error('[DEVIS PUBLIC ACCEPT]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

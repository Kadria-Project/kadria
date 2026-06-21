import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getMonthlyUsageSummary } from '@/src/lib/usage/quotas'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const result = await getMonthlyUsageSummary(session.artisanId)
    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'Impossible de charger l’utilisation mensuelle' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, usage: result.data })
  } catch (error) {
    console.error('[USAGE MONTHLY]', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

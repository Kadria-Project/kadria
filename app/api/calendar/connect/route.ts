import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { CALENDAR_PROVIDER_V1 } from '@/src/lib/calendar-sync'

export async function POST(_request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
  }

  return NextResponse.json({
    success: false,
    error: 'Bientot disponible',
    provider: CALENDAR_PROVIDER_V1,
  }, { status: 501 })
}

import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { normalizePlan } from '@/src/lib/plans'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    plan: normalizePlan(session.plan),
  })
}

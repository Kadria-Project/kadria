import { NextResponse } from 'next/server'
import { getTeamOverview } from '@/src/lib/team/service'

export async function GET() {
  try {
    const team = await getTeamOverview()
    return NextResponse.json({ success: true, ...team })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TEAM_ERROR'
    console.warn('[TEAM][API] /api/team failed', { code: message })
    if (message === 'TENANT_CONTEXT_REQUIRED' || message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Acces non autorise.' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

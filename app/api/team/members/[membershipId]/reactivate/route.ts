import { NextResponse } from 'next/server'
import { setTeamMemberStatus } from '@/src/lib/team/service'

type Params = { params: Promise<{ membershipId: string }> }

export async function POST(_request: Request, context: Params) {
  try {
    const { membershipId } = await context.params
    const member = await setTeamMemberStatus(membershipId, 'active')
    return NextResponse.json({ success: true, member })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TEAM_MEMBER_REACTIVATE_FAILED'
    const status = message === 'FORBIDDEN' ? 403 : message === 'MEMBER_NOT_FOUND' ? 404 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

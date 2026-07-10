import { NextRequest, NextResponse } from 'next/server'
import { updateTeamMember } from '@/src/lib/team/service'

type Params = { params: Promise<{ membershipId: string }> }

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { membershipId } = await context.params
    const body = await request.json()
    const member = await updateTeamMember(membershipId, {
      role: typeof body.role === 'string' ? body.role : undefined,
      jobTitle: typeof body.jobTitle === 'string' ? body.jobTitle : null,
    })
    return NextResponse.json({ success: true, member })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TEAM_MEMBER_UPDATE_FAILED'
    const status = message === 'FORBIDDEN' ? 403 : message === 'MEMBER_NOT_FOUND' ? 404 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

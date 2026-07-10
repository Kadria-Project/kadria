import { NextResponse } from 'next/server'
import { revokeInvitation } from '@/src/lib/team/service'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Params) {
  try {
    const { id } = await context.params
    const invitation = await revokeInvitation(id)
    return NextResponse.json({ success: true, invitation })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVITATION_REVOKE_FAILED'
    const status = message === 'FORBIDDEN' ? 403 : message === 'INVITATION_NOT_FOUND' ? 404 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

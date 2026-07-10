import { NextResponse } from 'next/server'
import { sendInvitationMagicLink } from '@/src/lib/team/service'

type Params = { params: Promise<{ token: string }> }

export async function POST(_request: Request, context: Params) {
  try {
    const { token } = await context.params
    const result = await sendInvitationMagicLink(token)
    return NextResponse.json({ success: true, email: result.email })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVITATION_MAGIC_LINK_FAILED'
    const status =
      message === 'INVITATION_NOT_FOUND' ? 404 :
      message === 'INVITATION_NOT_AVAILABLE' ? 409 :
      500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

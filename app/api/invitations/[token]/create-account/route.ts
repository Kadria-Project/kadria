import { NextRequest, NextResponse } from 'next/server'
import { createInvitedAccount, sendInvitationMagicLink } from '@/src/lib/team/service'

type Params = { params: Promise<{ token: string }> }

export async function POST(request: NextRequest, context: Params) {
  try {
    const body = await request.json()
    const { token } = await context.params
    const creation = await createInvitedAccount({
      token,
      email: String(body.email || ''),
      firstName: typeof body.firstName === 'string' ? body.firstName : null,
      lastName: typeof body.lastName === 'string' ? body.lastName : null,
    })
    const link = await sendInvitationMagicLink(token)
    return NextResponse.json({ success: true, alreadyExists: creation.alreadyExists, email: link.email })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVITATION_CREATE_ACCOUNT_FAILED'
    const status =
      message === 'INVITATION_NOT_FOUND' ? 404 :
      message === 'INVITATION_NOT_AVAILABLE' ? 409 :
      message === 'INVITATION_EMAIL_MISMATCH' ? 403 :
      500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

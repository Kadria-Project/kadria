import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { acceptInvitation } from '@/src/lib/team/service'

type Params = { params: Promise<{ token: string }> }

export async function POST(_request: Request, context: Params) {
  const session = await getSession()
  if (!session?.id || !session.email) {
    return NextResponse.json({ success: false, error: 'Connexion requise.' }, { status: 401 })
  }

  try {
    const { token } = await context.params
    const result = await acceptInvitation(token, session.id, session.email)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVITATION_ACCEPT_FAILED'
    const status =
      message === 'INVITATION_NOT_FOUND' ? 404 :
      message === 'INVITATION_EMAIL_MISMATCH' ? 403 :
      message === 'INVITATION_EXPIRED' ? 410 :
      message === 'INVITATION_NOT_PENDING' ? 409 :
      message === 'SEAT_LIMIT_REACHED' ? 409 :
      500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

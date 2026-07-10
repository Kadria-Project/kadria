import { NextRequest, NextResponse } from 'next/server'
import { createTeamInvitation } from '@/src/lib/team/service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await createTeamInvitation({
      email: String(body.email || ''),
      firstName: typeof body.firstName === 'string' ? body.firstName : null,
      lastName: typeof body.lastName === 'string' ? body.lastName : null,
      role: String(body.role || 'member'),
      jobTitle: typeof body.jobTitle === 'string' ? body.jobTitle : null,
      message: typeof body.message === 'string' ? body.message : null,
    })

    return NextResponse.json({
      success: true,
      invitation: result.invitation,
      emailSent: result.emailSent,
      invitationUrl: result.invitationUrl,
      warning: result.emailSent ? null : "L'invitation a ete creee, mais l'email n'a pas pu etre envoye. Vous pouvez reessayer.",
      errorDetail: result.emailSent ? null : result.error,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVITATION_CREATE_FAILED'
    const status =
      message === 'FORBIDDEN' ? 403 :
      message === 'INVALID_ROLE' ? 400 :
      message === 'SEAT_LIMIT_REACHED' ? 409 :
      message === 'ALREADY_MEMBER' ? 409 :
      message === 'DUPLICATE_PENDING_INVITATION' ? 409 :
      500

    return NextResponse.json({ success: false, error: message }, { status })
  }
}

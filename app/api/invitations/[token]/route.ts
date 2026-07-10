import { NextResponse } from 'next/server'
import { getInvitationByToken } from '@/src/lib/team/service'

type Params = { params: Promise<{ token: string }> }

export async function GET(_request: Request, context: Params) {
  try {
    const { token } = await context.params
    const state = await getInvitationByToken(token)
    if (!state?.tenant || !state.invitation) {
      return NextResponse.json({ success: false, error: 'Invitation introuvable.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      tenant: {
        name: state.tenant.name,
        slug: state.tenant.slug,
      },
      invitation: {
        email: state.invitation.email,
        firstName: state.invitation.firstName,
        lastName: state.invitation.lastName,
        role: state.invitation.role,
        jobTitle: state.invitation.jobTitle,
        expiresAt: state.invitation.expiresAt,
        status: state.expired && state.invitation.status === 'pending' ? 'expired' : state.invitation.status,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVITATION_LOOKUP_FAILED'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

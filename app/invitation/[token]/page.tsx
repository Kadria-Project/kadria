import { getSession } from '@/src/lib/auth-utils'
import { getInvitationByToken } from '@/src/lib/team/service'
import InvitationClient from '@/app/invitation/[token]/InvitationClient'

type Params = { params: Promise<{ token: string }> }

export default async function InvitationPage({ params }: Params) {
  const { token } = await params
  const [session, invitationState] = await Promise.all([
    getSession(),
    getInvitationByToken(token),
  ])

  const preview = invitationState?.invitation && invitationState.tenant
    ? {
        tenantName: invitationState.tenant.name,
        tenantSlug: invitationState.tenant.slug,
        email: invitationState.invitation.email,
        firstName: invitationState.invitation.firstName,
        lastName: invitationState.invitation.lastName,
        role: invitationState.invitation.role,
        jobTitle: invitationState.invitation.jobTitle,
        expiresAt: invitationState.invitation.expiresAt,
        status: invitationState.expired && invitationState.invitation.status === 'pending'
          ? 'expired' as const
          : invitationState.invitation.status,
      }
    : null

  return (
    <InvitationClient
      token={token}
      preview={preview}
      session={session ? { email: session.email, firstName: session.firstName, lastName: session.lastName } : null}
    />
  )
}

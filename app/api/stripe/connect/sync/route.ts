import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getArtisanConfig } from '@/src/lib/airtable'
import { StripeNotConfiguredError } from '@/src/lib/stripe'
import { syncStripeConnectStatus } from '@/src/lib/stripe-connect'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { PermissionError, requirePermission } from '@/src/lib/team/access'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    try {
      requirePermission(await getCurrentTenantContext(), 'billing.manage')
    } catch (permissionError) {
      if (permissionError instanceof PermissionError) {
        return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status })
      }
      throw permissionError
    }

    const config = await getArtisanConfig(session.artisanId)
    const result = await syncStripeConnectStatus({
      artisanId: session.artisanId,
      config,
    })

    return NextResponse.json({
      success: true,
      stripeAccountId: result.accountId,
      stripeConnectStatus: result.status,
    })
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: "Stripe Connect n'est pas encore configure cote serveur." },
        { status: 503 },
      )
    }

    console.error('[STRIPE CONNECT SYNC]', error)
    return NextResponse.json(
      { success: false, error: "Impossible d'actualiser le statut Stripe." },
      { status: 500 },
    )
  }
}

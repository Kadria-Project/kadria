import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getArtisanConfig, updateArtisanConfig } from '@/src/lib/airtable'
import { StripeNotConfiguredError, getStripeClient } from '@/src/lib/stripe'
import {
  getOrCreateStripeConnectAccount,
  getStripeConnectRefreshUrl,
  getStripeConnectReturnUrl,
  getStripeConnectStatus,
} from '@/src/lib/stripe-connect'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    const config = await getArtisanConfig(session.artisanId)
    const { account } = await getOrCreateStripeConnectAccount({
      artisanId: session.artisanId,
      config,
      email: session.email,
    })

    const stripe = getStripeClient()
    const status = getStripeConnectStatus(account)

    await updateArtisanConfig(session.artisanId, {
      stripe_account_id: account.id,
      stripe_connect_status: status === 'not_connected' ? 'pending' : status,
    })

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: getStripeConnectRefreshUrl(),
      return_url: getStripeConnectReturnUrl(),
      type: 'account_onboarding',
    })

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      status: status === 'not_connected' ? 'pending' : status,
    })
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: "Stripe Connect n'est pas encore configure cote serveur." },
        { status: 503 },
      )
    }

    console.error('[STRIPE CONNECT ONBOARD]', error)
    return NextResponse.json(
      { success: false, error: "Impossible d'initialiser la connexion Stripe." },
      { status: 500 },
    )
  }
}

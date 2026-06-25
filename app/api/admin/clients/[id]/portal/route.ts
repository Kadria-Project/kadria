import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { getStripeClient, StripeNotConfiguredError } from '@/src/lib/stripe'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params

  try {
    const client = await getUserById(id)
    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    if (!client.stripeCustomerId) {
      return NextResponse.json({ error: 'Aucun client Stripe associé' }, { status: 400 })
    }

    const stripe = getStripeClient()

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: client.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/clients/${id}`,
    })

    return NextResponse.json({ success: true, url: portalSession.url })
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 })
    }

    console.error('[ADMIN STRIPE PORTAL]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import {
  getStripeClient,
  getPriceToPlanMap,
  isAllowedPriceId,
  resolvePriceId,
  StripeNotConfiguredError,
} from '@/src/lib/stripe'
import type { PlanKey } from '@/src/lib/plans'

interface CheckoutBody {
  priceId?: string
  plan?: PlanKey
  interval?: 'monthly' | 'yearly'
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as CheckoutBody | null
    if (!body) {
      return NextResponse.json({ success: false, error: 'Requête invalide' }, { status: 400 })
    }

    let priceId = body.priceId

    if (!priceId && body.plan && body.interval) {
      priceId = resolvePriceId(body.plan, body.interval) || undefined
    }

    if (!priceId || !isAllowedPriceId(priceId)) {
      return NextResponse.json({ success: false, error: 'Offre invalide' }, { status: 400 })
    }

    const mapping = getPriceToPlanMap()[priceId]
    const artisanId = session.artisanId

    const stripe = getStripeClient()

    const { data: userRow } = await supabaseAdmin
      .from('Users')
      .select('stripe_customer_id')
      .eq('artisan_id', artisanId)
      .limit(1)
      .maybeSingle()

    let customerId = userRow?.stripe_customer_id as string | null | undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.email,
        metadata: { artisan_id: artisanId },
      })
      customerId = customer.id

      await supabaseAdmin
        .from('Users')
        .update({ stripe_customer_id: customerId })
        .eq('artisan_id', artisanId)
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        artisan_id: artisanId,
        user_id: session.id ?? '',
        plan: mapping.plan,
        interval: mapping.interval,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard-v2?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tarifs?checkout=cancel`,
    })

    return NextResponse.json({ success: true, url: checkoutSession.url })
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json({ success: false, error: 'Stripe non configuré' }, { status: 503 })
    }

    console.error('[STRIPE CHECKOUT]', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

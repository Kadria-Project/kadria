import { NextResponse } from 'next/server'
import { getSession, verifyCheckoutIntentToken } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import {
  getStripeClient,
  getPriceToPlanMap,
  isAllowedPriceId,
  resolvePriceId,
  StripeNotConfiguredError,
  STRIPE_TRIAL_DAYS,
} from '@/src/lib/stripe'
import type { PlanKey } from '@/src/lib/plans'

interface CheckoutBody {
  priceId?: string
  plan?: PlanKey
  interval?: 'monthly' | 'yearly'
  checkoutToken?: string
}

export async function POST(request: Request) {
  try {
    const session = await getSession()

    const body = (await request.json().catch(() => null)) as CheckoutBody | null
    if (!body) {
      return NextResponse.json({ success: false, error: 'Requête invalide' }, { status: 400 })
    }

    const checkoutIntent = !session && body.checkoutToken
      ? await verifyCheckoutIntentToken(body.checkoutToken)
      : null

    if (!session && !checkoutIntent) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    let priceId = body.priceId

    if (!priceId && body.plan && body.interval) {
      priceId = resolvePriceId(body.plan, body.interval) || undefined
    }

    if (!priceId || !isAllowedPriceId(priceId)) {
      return NextResponse.json({ success: false, error: 'Offre invalide' }, { status: 400 })
    }

    const mapping = getPriceToPlanMap()[priceId]
    const artisanId = session?.artisanId || checkoutIntent?.artisanId || ''

    const stripe = getStripeClient()

    const { data: userRow } = await supabaseAdmin
      .from('Users')
      .select('id, email, stripe_customer_id, statut, billing_status')
      .eq('artisan_id', artisanId)
      .limit(1)
      .maybeSingle()

    if (!userRow) {
      return NextResponse.json({ success: false, error: 'Compte introuvable' }, { status: 404 })
    }

    const rawStatut = String(userRow.statut || '').trim().toLowerCase()
    const rawBillingStatus = String(userRow.billing_status || '').trim().toLowerCase()

    if (!session && rawStatut !== 'pending_payment' && rawBillingStatus !== 'pending_payment') {
      return NextResponse.json({ success: false, error: 'Compte non autorisé pour ce checkout' }, { status: 403 })
    }

    let customerId = userRow?.stripe_customer_id as string | null | undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session?.email || checkoutIntent?.email || String(userRow.email || ''),
        metadata: { artisan_id: artisanId, artisanId },
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
        artisanId,
        user_id: String(session?.id || userRow.id || ''),
        email: session?.email || checkoutIntent?.email || String(userRow.email || ''),
        plan: mapping.plan,
        interval: mapping.interval,
      },
      payment_method_collection: 'always',
      subscription_data: {
        trial_period_days: STRIPE_TRIAL_DAYS,
        trial_settings: {
          end_behavior: { missing_payment_method: 'cancel' },
        },
        metadata: {
          artisan_id: artisanId,
          artisanId,
          user_id: String(session?.id || userRow.id || ''),
          email: session?.email || checkoutIntent?.email || String(userRow.email || ''),
          plan: mapping.plan,
          interval: mapping.interval,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/register?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/register?checkout=cancel`,
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

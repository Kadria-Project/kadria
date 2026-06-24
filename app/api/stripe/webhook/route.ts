import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getStripeClient, getPriceToPlanMap, StripeNotConfiguredError } from '@/src/lib/stripe'

function toIso(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null
  return new Date(unixSeconds * 1000).toISOString()
}

async function updateUsersRow(
  match: { artisanId?: string | null; customerId?: string | null },
  patch: Record<string, unknown>,
) {
  const finalPatch = { ...patch, billing_updated_at: new Date().toISOString() }

  if (match.artisanId) {
    const { error } = await supabaseAdmin
      .from('Users')
      .update(finalPatch)
      .eq('artisan_id', match.artisanId)
    if (error) throw error
    return
  }

  if (match.customerId) {
    const { error } = await supabaseAdmin
      .from('Users')
      .update(finalPatch)
      .eq('stripe_customer_id', match.customerId)
    if (error) throw error
    return
  }

  throw new Error('No match key (artisanId/customerId) to update Users row')
}

function subscriptionToPatch(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id
  const mapping = priceId ? getPriceToPlanMap()[priceId] : undefined

  const patch: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    billing_status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
  if (currentPeriodEnd) {
    patch.current_period_end = toIso(currentPeriodEnd)
  }

  if (subscription.trial_end) {
    patch.trial_end = toIso(subscription.trial_end)
  }

  if (priceId) {
    patch.stripe_price_id = priceId
  }

  if (mapping) {
    patch.plan = mapping.plan
    patch.billing_interval = mapping.interval
  }

  return patch
}

export async function POST(request: Request) {
  let stripe: ReturnType<typeof getStripeClient>

  try {
    stripe = getStripeClient()
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 400 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error('[STRIPE WEBHOOK] signature verification failed', error)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session
        const customerId =
          typeof checkoutSession.customer === 'string'
            ? checkoutSession.customer
            : checkoutSession.customer?.id
        const subscriptionId =
          typeof checkoutSession.subscription === 'string'
            ? checkoutSession.subscription
            : checkoutSession.subscription?.id
        const artisanId = checkoutSession.metadata?.artisan_id

        const patch: Record<string, unknown> = {}
        if (customerId) patch.stripe_customer_id = customerId

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          Object.assign(patch, subscriptionToPatch(subscription))
        }

        await updateUsersRow({ artisanId, customerId }, patch)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
        const artisanId = subscription.metadata?.artisan_id

        await updateUsersRow({ artisanId, customerId }, subscriptionToPatch(subscription))
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
        const artisanId = subscription.metadata?.artisan_id

        await updateUsersRow(
          { artisanId, customerId },
          {
            plan: 'essentiel',
            billing_status: 'canceled',
            stripe_subscription_id: null,
            stripe_price_id: null,
          },
        )
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        const artisanId = invoice.metadata?.artisan_id

        const patch: Record<string, unknown> = { billing_status: 'active' }

        const priceRef = invoice.lines?.data?.[0]?.pricing?.price_details?.price
        const lineItemPriceId = typeof priceRef === 'string' ? priceRef : priceRef?.id
        const mapping = lineItemPriceId ? getPriceToPlanMap()[lineItemPriceId] : undefined
        if (mapping) {
          patch.plan = mapping.plan
          patch.billing_interval = mapping.interval
        }

        await updateUsersRow({ artisanId, customerId }, patch)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        const artisanId = invoice.metadata?.artisan_id

        await updateUsersRow({ artisanId, customerId }, { billing_status: 'past_due' })
        break
      }

      default:
        break
    }
  } catch (error) {
    console.error('[STRIPE WEBHOOK]', event.type, error)
  }

  return NextResponse.json({ received: true })
}

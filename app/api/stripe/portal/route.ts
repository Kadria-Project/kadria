import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getStripeClient, StripeNotConfiguredError } from '@/src/lib/stripe'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { data: userRow } = await supabaseAdmin
      .from('Users')
      .select('stripe_customer_id')
      .eq('artisan_id', session.artisanId)
      .limit(1)
      .maybeSingle()

    const customerId = userRow?.stripe_customer_id as string | null | undefined

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Aucun abonnement Stripe actif' },
        { status: 400 },
      )
    }

    const stripe = getStripeClient()

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard-v2?billing=return`,
    })

    return NextResponse.json({ success: true, url: portalSession.url })
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json({ success: false, error: 'Stripe non configuré' }, { status: 503 })
    }

    console.error('[STRIPE PORTAL]', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

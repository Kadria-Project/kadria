import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { TABLES, getArtisanConfig } from '@/src/lib/airtable'
import { StripeNotConfiguredError, getStripeClient } from '@/src/lib/stripe'
import { supabaseAdmin } from '@/src/lib/supabase/server'

async function createActivityLog(projectId: string, action: string, description: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[DEPOSIT WEBHOOK ACTIVITY]', JSON.stringify(error, null, 2))
  }
}

async function findProjectById(projectId: string) {
  const direct = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('id', projectId)
    .limit(1)
    .maybeSingle()

  if (direct.error) {
    throw direct.error
  }

  if (direct.data) return direct.data

  const legacy = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('record_id', projectId)
    .limit(1)
    .maybeSingle()

  if (legacy.error) {
    throw legacy.error
  }

  return legacy.data
}

async function hasDepositPaidActivity(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLES.activity)
    .select('id')
    .eq('project_id', projectId)
    .eq('action', 'ACOMPTE_PAID')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[DEPOSIT WEBHOOK] activity lookup failed', JSON.stringify(error, null, 2))
    return false
  }

  return Boolean(data?.id)
}

export async function POST(request: Request) {
  let stripe: ReturnType<typeof getStripeClient>

  try {
    stripe = getStripeClient()
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json({ error: 'Stripe non configure' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  const webhookSecret = process.env.STRIPE_DEPOSIT_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook acompte non configure' }, { status: 400 })
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
    console.error('[DEPOSIT WEBHOOK] signature verification failed', error)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true, ignored: true })
    }

    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}
    const isDepositEvent =
      metadata.type === 'deposit' &&
      metadata.deposit_provider === 'stripe_connect' &&
      Boolean(metadata.project_id) &&
      Boolean(metadata.artisan_id)

    if (!isDepositEvent) {
      return NextResponse.json({ received: true, ignored: true })
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true, ignored: true })
    }

    const projectId = String(metadata.project_id || '').trim()
    const artisanId = String(metadata.artisan_id || '').trim()
    if (!projectId || !artisanId) {
      return NextResponse.json({ received: true, ignored: true })
    }

    const project = await findProjectById(projectId)
    if (!project) {
      console.error('[DEPOSIT WEBHOOK] project not found', { projectId, artisanId })
      return NextResponse.json({ received: true, ignored: true })
    }

    if (String(project.artisan_id || '') !== artisanId) {
      console.error('[DEPOSIT WEBHOOK] artisan mismatch', { projectId, artisanId, projectArtisanId: project.artisan_id })
      return NextResponse.json({ received: true, ignored: true })
    }

    const artisanConfig = await getArtisanConfig(artisanId)
    if (!artisanConfig?.stripeAccountId) {
      console.error('[DEPOSIT WEBHOOK] missing stripe account for artisan', { artisanId, projectId })
      return NextResponse.json({ received: true, ignored: true })
    }

    const eventAccount = typeof event.account === 'string' ? event.account : null
    if (eventAccount && eventAccount !== artisanConfig.stripeAccountId) {
      console.error('[DEPOSIT WEBHOOK] connected account mismatch', {
        projectId,
        artisanId,
        eventAccount,
        storedAccountId: artisanConfig.stripeAccountId,
      })
      return NextResponse.json({ received: true, ignored: true })
    }

    if (String(project.deposit_status || '') === 'paid') {
      return NextResponse.json({ received: true, ignored: true, idempotent: true })
    }

    const amountTotalEuros = typeof session.amount_total === 'number'
      ? Math.round(session.amount_total) / 100
      : null
    const metadataAmount = Number(metadata.deposit_amount || '')
    const expectedAmount = typeof project.deposit_amount === 'number'
      ? project.deposit_amount
      : Number(project.deposit_amount)
    const normalizedExpectedAmount = Number.isFinite(expectedAmount) ? expectedAmount : null
    const normalizedMetadataAmount = Number.isFinite(metadataAmount) ? metadataAmount : null

    const confirmedAmount = amountTotalEuros && amountTotalEuros > 0
      ? amountTotalEuros
      : normalizedExpectedAmount

    if (!confirmedAmount || confirmedAmount <= 0) {
      console.error('[DEPOSIT WEBHOOK] invalid paid amount', {
        projectId,
        artisanId,
        amountTotal: session.amount_total,
        expectedAmount: normalizedExpectedAmount,
        metadataAmount: normalizedMetadataAmount,
      })
      return NextResponse.json({ received: true, ignored: true })
    }

    if (normalizedMetadataAmount && Math.abs(normalizedMetadataAmount - confirmedAmount) > 0.01) {
      console.error('[DEPOSIT WEBHOOK] metadata amount mismatch', {
        projectId,
        artisanId,
        confirmedAmount,
        metadataAmount: normalizedMetadataAmount,
      })
    }

    const paidAt = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from(TABLES.projects)
      .update({
        deposit_status: 'paid',
        deposit_paid_at: paidAt,
        deposit_amount: confirmedAmount,
      })
      .eq('id', String(project.id))
      .eq('artisan_id', artisanId)

    if (updateError) {
      throw updateError
    }

    const alreadyLogged = await hasDepositPaidActivity(String(project.id))
    if (!alreadyLogged) {
      await createActivityLog(
        String(project.id),
        'ACOMPTE_PAID',
        `Acompte paye : ${confirmedAmount.toFixed(2)} EUR`,
      )
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[DEPOSIT WEBHOOK]', event.type, error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

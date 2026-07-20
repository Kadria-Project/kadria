import { NextResponse } from 'next/server'
import { TABLES, getArtisanConfig } from '@/src/lib/airtable'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { getBaseUrl } from '@/src/lib/base-url'
import { computeRecommendedDeposit, normalizeStripeConnectStatus } from '@/src/lib/deposit'
import { normalizeProjectStatus } from '@/src/lib/project-status'
import { StripeNotConfiguredError, getStripeClient } from '@/src/lib/stripe'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { PermissionError } from '@/src/lib/team/access'

async function createActivityLog(projectId: string, action: string, description: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[PROJECT DEPOSIT ACTIVITY]', JSON.stringify(error, null, 2))
  }
}

function buildProjectLabel(project: Record<string, unknown>) {
  const projectNumber = String(project.project_number || '').trim()
  const clientName = String(project.client_name || '').trim()
  const trade = String(project.trade || '').trim()

  return projectNumber || clientName || trade || String(project.id || 'projet')
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authResult = await authorizeProjectAccess({
      projectId: id,
      requiredPermission: 'projects.update',
      allowAppointmentAccess: true,
      select: 'id, status, devis_amount, project_number, trade',
    })

    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    const project = authResult.project
    const artisanConfig = await getArtisanConfig(authResult.session.artisanId)

    if (!artisanConfig?.depositEnabled) {
      return NextResponse.json({ success: false, error: 'Activez les acomptes dans vos paramètres.' }, { status: 400 })
    }

    const stripeStatus = normalizeStripeConnectStatus(artisanConfig.stripeConnectStatus)
    if (!artisanConfig.stripeAccountId) {
      return NextResponse.json({ success: false, error: "Connectez Stripe avant de générer un lien d'acompte." }, { status: 400 })
    }

    if (stripeStatus === 'pending' || stripeStatus === 'restricted') {
      return NextResponse.json({ success: false, error: "Terminez la configuration Stripe avant de générer un lien d'acompte." }, { status: 400 })
    }

    if (stripeStatus !== 'active') {
      return NextResponse.json({ success: false, error: "Connectez Stripe avant de générer un lien d'acompte." }, { status: 400 })
    }

    const devisAmountRaw = typeof project.devis_amount === 'number' ? project.devis_amount : Number(project.devis_amount)
    const devisAmount = Number.isFinite(devisAmountRaw) ? devisAmountRaw : null

    if (devisAmount === null || devisAmount <= 0) {
      return NextResponse.json({ success: false, error: "Ajoutez un montant de devis pour calculer l'acompte." }, { status: 400 })
    }

    const computedDeposit = computeRecommendedDeposit({
      depositEnabled: artisanConfig.depositEnabled,
      depositType: artisanConfig.depositType,
      depositValue: artisanConfig.depositValue,
    }, devisAmount)

    if (!computedDeposit || !Number.isFinite(computedDeposit.amount) || computedDeposit.amount <= 0) {
      return NextResponse.json({ success: false, error: "Impossible de générer le lien d'acompte pour le moment." }, { status: 400 })
    }

    const amountInCents = Math.round(computedDeposit.amount * 100)
    if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
      return NextResponse.json({ success: false, error: "Impossible de générer le lien d'acompte pour le moment." }, { status: 400 })
    }

    const stripe = getStripeClient()
    const baseUrl = getBaseUrl()
    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        success_url: `${baseUrl}/dashboard-v2/projet/${encodeURIComponent(String(id))}?deposit=success`,
        cancel_url: `${baseUrl}/dashboard-v2/projet/${encodeURIComponent(String(id))}?deposit=cancelled`,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: amountInCents,
              product_data: {
                name: 'Acompte devis Kadria',
                description: `Acompte pour le projet ${buildProjectLabel(project)}`,
              },
            },
          },
        ],
        metadata: {
          type: 'deposit',
          environment: 'kadria',
          artisan_id: authResult.session.artisanId,
          project_id: authResult.projectId,
          deposit_amount: computedDeposit.amount.toFixed(2),
          deposit_provider: 'stripe_connect',
        },
      },
      {
        stripeAccount: artisanConfig.stripeAccountId,
      },
    )

    if (!checkoutSession.url) {
      return NextResponse.json({ success: false, error: "Impossible de générer le lien d'acompte pour le moment." }, { status: 500 })
    }

    const now = new Date().toISOString()
    const currentStatus = normalizeProjectStatus(String(project.status || ''))
    const nextStatus = currentStatus === 'Perdu' ? 'Perdu' : 'Acompte demandé'
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from(TABLES.projects)
      .update({
        status: nextStatus,
        deposit_status: 'requested',
        deposit_amount: computedDeposit.amount,
        deposit_requested_at: now,
        deposit_payment_url: checkoutSession.url,
        deposit_provider: 'stripe_connect',
      })
      .eq('id', authResult.projectId)
      .select('id, deposit_status, deposit_amount, deposit_requested_at, deposit_payment_url, deposit_provider')
      .single()

    if (updateError) {
      throw updateError
    }

    await createActivityLog(
      authResult.projectId,
      'ACOMPTE_PAYMENT_LINK_CREATED',
      `Lien d'acompte créé pour ${computedDeposit.amount.toFixed(2)} EUR`,
    )

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
      depositAmount: updatedProject.deposit_amount,
      depositStatus: updatedProject.deposit_status,
      depositRequestedAt: updatedProject.deposit_requested_at,
      depositPaymentUrl: updatedProject.deposit_payment_url,
      depositProvider: updatedProject.deposit_provider,
    })
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json({ success: false, error: 'Stripe non configuré côté serveur.' }, { status: 503 })
    }

    const permissionError = error as PermissionError
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status })
    }

    console.error('[PROJECT DEPOSIT CHECKOUT]', error)
    return NextResponse.json(
      { success: false, error: "Impossible de générer le lien d'acompte pour le moment." },
      { status: 500 },
    )
  }
}

import 'server-only'
import type Stripe from 'stripe'
import { updateArtisanConfig } from '@/src/lib/airtable'
import { getBaseUrl } from '@/src/lib/base-url'
import { getStripeClient } from '@/src/lib/stripe'
import type { StripeConnectStatus } from '@/src/lib/deposit'

interface StripeConnectConfigLike {
  stripeAccountId?: string
  websiteUrl?: string
}

function getRequirementsIssueCount(account: Stripe.Account) {
  const requirements = account.requirements
  if (!requirements) return 0

  return (
    (requirements.currently_due?.length || 0) +
    (requirements.past_due?.length || 0) +
    (requirements.pending_verification?.length || 0) +
    (requirements.errors?.length || 0)
  )
}

export function getStripeConnectStatus(account: Stripe.Account | null | undefined): StripeConnectStatus {
  if (!account) return 'not_connected'

  if (account.charges_enabled && account.payouts_enabled) {
    return 'active'
  }

  if (!account.details_submitted) {
    return 'pending'
  }

  const requirementsIssueCount = getRequirementsIssueCount(account)
  const disabledReason = account.requirements?.disabled_reason

  if (requirementsIssueCount > 0 || disabledReason) {
    return 'restricted'
  }

  return 'pending'
}

export function getStripeConnectReturnUrl() {
  return `${getBaseUrl()}/parametres?section=catalogue&stripe_connect=return`
}

export function getStripeConnectRefreshUrl() {
  return `${getBaseUrl()}/parametres?section=catalogue&stripe_connect=refresh`
}

export async function getExistingStripeConnectAccount(accountId: string) {
  const stripe = getStripeClient()
  return stripe.accounts.retrieve(accountId)
}

export async function getOrCreateStripeConnectAccount(input: {
  artisanId: string
  config: StripeConnectConfigLike | null
  email?: string | null
}) {
  const stripe = getStripeClient()
  const existingAccountId = input.config?.stripeAccountId?.trim()

  if (existingAccountId) {
    const account = await stripe.accounts.retrieve(existingAccountId)
    return { account, created: false }
  }

  const account = await stripe.accounts.create({
    type: 'express',
    email: input.email || undefined,
    business_profile: input.config?.websiteUrl
      ? {
          url: input.config.websiteUrl,
        }
      : undefined,
    metadata: {
      artisan_id: input.artisanId,
      artisanId: input.artisanId,
    },
  })

  await updateArtisanConfig(input.artisanId, {
    stripe_account_id: account.id,
    stripe_connect_status: 'pending',
  })

  return { account, created: true }
}

export async function syncStripeConnectStatus(input: {
  artisanId: string
  config: StripeConnectConfigLike | null
}) {
  const accountId = input.config?.stripeAccountId?.trim()

  if (!accountId) {
    await updateArtisanConfig(input.artisanId, {
      stripe_connect_status: 'not_connected',
      stripe_account_id: null,
    })

    return {
      accountId: null,
      status: 'not_connected' as StripeConnectStatus,
    }
  }

  const account = await getExistingStripeConnectAccount(accountId)
  const status = getStripeConnectStatus(account)

  await updateArtisanConfig(input.artisanId, {
    stripe_account_id: account.id,
    stripe_connect_status: status,
  })

  return {
    accountId: account.id,
    status,
  }
}

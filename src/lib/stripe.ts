import 'server-only'
import Stripe from 'stripe'
import type { PlanKey } from '@/src/lib/plans'

let client: Stripe | null = null

export class StripeNotConfiguredError extends Error {
  constructor() {
    super('Stripe non configuré')
    this.name = 'StripeNotConfiguredError'
  }
}

/**
 * Lazily instantiate the server-side Stripe client. Never called at module
 * load time / build time — only inside request handlers — so a missing
 * STRIPE_SECRET_KEY never breaks `next build`.
 */
export function getStripeClient(): Stripe {
  if (client) {
    return client
  }

  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new StripeNotConfiguredError()
  }

  client = new Stripe(secretKey)

  return client
}

export interface PriceMapping {
  plan: PlanKey
  interval: 'monthly' | 'yearly'
}

/**
 * Builds the price_id -> {plan, interval} map lazily from env vars, so it's
 * never computed at import time during static analysis / build.
 */
export function getPriceToPlanMap(): Record<string, PriceMapping> {
  const entries: Array<[string | undefined, PriceMapping]> = [
    [process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY, { plan: 'essentiel', interval: 'monthly' }],
    [process.env.STRIPE_PRICE_ESSENTIEL_YEARLY, { plan: 'essentiel', interval: 'yearly' }],
    [process.env.STRIPE_PRICE_PERFORMANCE_MONTHLY, { plan: 'performance', interval: 'monthly' }],
    [process.env.STRIPE_PRICE_PERFORMANCE_YEARLY, { plan: 'performance', interval: 'yearly' }],
    [process.env.STRIPE_PRICE_AGENCE_MONTHLY, { plan: 'entreprise', interval: 'monthly' }],
  ]

  const map: Record<string, PriceMapping> = {}

  for (const [priceId, mapping] of entries) {
    if (priceId) {
      map[priceId] = mapping
    }
  }

  return map
}

export function isAllowedPriceId(priceId: string): boolean {
  return Object.prototype.hasOwnProperty.call(getPriceToPlanMap(), priceId)
}

/**
 * Resolve a price id from a {plan, interval} pair using the same env-var
 * backed map. Returns null if no matching price id is configured.
 */
export function resolvePriceId(plan: PlanKey, interval: 'monthly' | 'yearly'): string | null {
  const map = getPriceToPlanMap()

  for (const [priceId, mapping] of Object.entries(map)) {
    if (mapping.plan === plan && mapping.interval === interval) {
      return priceId
    }
  }

  return null
}

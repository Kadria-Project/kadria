export type DepositType = 'percentage' | 'fixed'
export type StripeConnectStatus = 'not_connected' | 'pending' | 'active' | 'restricted'
export type DepositStatus = 'not_requested' | 'recommended' | 'requested' | 'paid' | 'cancelled'

export interface DepositConfigLike {
  depositEnabled?: boolean
  depositType?: string | null
  depositValue?: number | null
}

export interface DepositComputationResult {
  amount: number
  basisLabel: string
}

export function normalizeDepositType(value: string | null | undefined): DepositType {
  return value === 'fixed' ? 'fixed' : 'percentage'
}

export function normalizeStripeConnectStatus(value: string | null | undefined): StripeConnectStatus {
  if (value === 'pending' || value === 'active' || value === 'restricted') return value
  return 'not_connected'
}

export function normalizeDepositStatus(value: string | null | undefined): DepositStatus {
  if (value === 'recommended' || value === 'requested' || value === 'paid' || value === 'cancelled') return value
  return 'not_requested'
}

export function computeRecommendedDeposit(
  config: DepositConfigLike | null | undefined,
  devisAmount: number | null | undefined,
): DepositComputationResult | null {
  if (!config?.depositEnabled) return null
  if (devisAmount === null || devisAmount === undefined || !Number.isFinite(devisAmount) || devisAmount <= 0) return null
  if (config.depositValue === null || config.depositValue === undefined || !Number.isFinite(config.depositValue)) return null

  const depositType = normalizeDepositType(config.depositType)
  const rawAmount = depositType === 'fixed'
    ? Number(config.depositValue)
    : (Number(devisAmount) * Number(config.depositValue)) / 100

  const amount = Math.round(rawAmount * 100) / 100
  if (!Number.isFinite(amount) || amount < 0) return null

  return {
    amount,
    basisLabel: depositType === 'fixed'
      ? 'Montant fixe'
      : `${Number(config.depositValue)} % de ${formatEuro(devisAmount)}`,
  }
}

// Statut public acompte pour affichage client (portail), distinct du
// DepositStatus interne ci-dessus (qui reflète le cycle de vie
// recommended/requested/paid côté artisan). Ici on normalise la valeur brute
// stockée en base (deposit_status) — potentiellement issue de Stripe ou du
// webhook acompte — vers 4 états génériques d'affichage. Le webhook
// (app/api/stripe/connect/deposit-webhook/route.ts) écrit littéralement
// 'paid' au succès ; les autres valeurs listées ci-dessous sont acceptées de
// façon défensive (ex. futurs statuts Stripe / providers) sans jamais être
// la seule valeur réellement produite aujourd'hui.
export type PublicDepositStatus = 'paid' | 'pending' | 'failed' | 'unavailable'

const PAID_DEPOSIT_VALUES = new Set(['paid', 'succeeded', 'success', 'completed', 'complete', 'settled', 'captured'])
const PENDING_DEPOSIT_VALUES = new Set(['pending', 'processing', 'requires_action', 'awaiting_payment'])
const FAILED_DEPOSIT_VALUES = new Set(['failed', 'canceled', 'cancelled', 'expired'])

export function normalizePublicDepositStatus(value: string | null | undefined): PublicDepositStatus {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return 'unavailable'
  if (PAID_DEPOSIT_VALUES.has(normalized)) return 'paid'
  if (PENDING_DEPOSIT_VALUES.has(normalized)) return 'pending'
  if (FAILED_DEPOSIT_VALUES.has(normalized)) return 'failed'
  return 'unavailable'
}

export function formatEuro(value: number | null | undefined) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

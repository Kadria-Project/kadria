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

export function formatEuro(value: number | null | undefined) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

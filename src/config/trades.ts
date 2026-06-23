import { TRADE_TAXONOMIES } from '@/src/config/trade-taxonomy'

export interface TradeOption {
  value: string
  label: string
}

// Liste courte d'affichage, dérivée de la taxonomie métier enrichie
// (src/config/trade-taxonomy.ts) pour éviter deux sources de vérité.
export const ARTISAN_TRADES: TradeOption[] = TRADE_TAXONOMIES.map(t => ({ value: t.value, label: t.label }))

const ARTISAN_TRADE_VALUES = new Set(ARTISAN_TRADES.map(t => t.value))

/**
 * Normalise n'importe quelle valeur brute issue de Supabase (jsonb natif,
 * string JSON legacy, string CSV legacy, null/undefined) en string[].
 * Ne lève jamais d'exception, même sur des données historiques malformées.
 */
export function normalizeTrades(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      }
    } catch {
      // Pas du JSON : string legacy simple ou CSV
    }
    return value.split(',').map(v => v.trim()).filter(Boolean)
  }

  return []
}

export function getTradeLabel(value: string): string {
  return ARTISAN_TRADES.find(t => t.value === value)?.label || value
}

export function isKnownTrade(value: string): boolean {
  return ARTISAN_TRADE_VALUES.has(value)
}

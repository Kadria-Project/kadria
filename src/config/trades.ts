export interface TradeOption {
  value: string
  label: string
}

export const ARTISAN_TRADES: TradeOption[] = [
  { value: 'plombier', label: 'Plombier' },
  { value: 'chauffagiste', label: 'Chauffagiste' },
  { value: 'electricien', label: 'Électricien' },
  { value: 'paysagiste', label: 'Paysagiste' },
  { value: 'terrassier', label: 'Terrassier' },
  { value: 'menuisier', label: 'Menuisier' },
  { value: 'macon', label: 'Maçon' },
  { value: 'peintre', label: 'Peintre' },
  { value: 'plaquiste', label: 'Plaquiste' },
  { value: 'couvreur', label: 'Couvreur' },
  { value: 'serrurier', label: 'Serrurier' },
  { value: 'carreleur', label: 'Carreleur' },
  { value: 'pisciniste', label: 'Pisciniste' },
  { value: 'climatisation', label: 'Climatisation' },
  { value: 'domotique', label: 'Domotique' },
  { value: 'multiservices', label: 'Multiservices / homme toutes mains' },
  { value: 'autre', label: 'Autre' },
]

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

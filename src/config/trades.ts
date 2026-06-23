export interface TradeOption {
  value: string
  label: string
}

export const TRADES: TradeOption[] = [
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

export const TRADE_LABEL_BY_VALUE: Record<string, string> = TRADES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<string, string>
)

'use client'

import { Euro, FolderPlus, PiggyBank, Percent } from 'lucide-react'
import KPICard, { type KPICardContent } from './KPICard'
import type { KPIId, KPIResult } from '@/src/lib/performance/performance-types'

const KPI_CONTENT: Record<KPIId, KPICardContent> = {
  revenue: { id: 'revenue', title: "Chiffre d'affaires", icon: Euro, ariaLabel: "Chiffre d'affaires sur la période sélectionnée" },
  createdProjects: { id: 'createdProjects', title: 'Dossiers créés', icon: FolderPlus, ariaLabel: 'Nombre de dossiers créés sur la période sélectionnée' },
  conversionRate: { id: 'conversionRate', title: 'Taux de transformation', icon: Percent, ariaLabel: 'Taux de transformation sur la période sélectionnée' },
  averageBasket: { id: 'averageBasket', title: 'Panier moyen', icon: PiggyBank, ariaLabel: 'Panier moyen sur la période sélectionnée' },
}

// Ordered display sequence for the grid — extend this array (and add the
// matching entry above) to introduce a future KPI without touching KPICard.
const KPI_ORDER: KPIId[] = ['revenue', 'createdProjects', 'conversionRate', 'averageBasket']

export default function PerformanceKPIs({
  kpis,
  loading,
  error,
  onRetry,
}: {
  kpis: KPIResult[] | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const byId = new Map((kpis || []).map((kpi) => [kpi.id, kpi]))

  return (
    <div
      role="list"
      aria-label="Indicateurs clés de performance"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
    >
      {KPI_ORDER.map((id) => (
        <div key={id} role="listitem">
          <KPICard content={KPI_CONTENT[id]} result={byId.get(id)} loading={loading} error={error} onRetry={onRetry} />
        </div>
      ))}
    </div>
  )
}

'use client'

import type {
  CommercialLoadItem,
  FieldLoadItem,
  OperationsCenterResult,
  RecommendationItem,
  RecommendationPriority,
} from '@/src/lib/recommendations'

const PRIORITY_META: Record<RecommendationPriority, { icon: string; label: string; badge: string }> = {
  critical: { icon: '🔥', label: 'Critique', badge: 'border-red-500/30 bg-red-500/10 text-red-200' },
  high: { icon: '⚠', label: 'Haute', badge: 'border-orange-500/30 bg-orange-500/10 text-orange-100' },
  normal: { icon: 'ℹ', label: 'Normale', badge: 'border-blue-500/30 bg-blue-500/10 text-blue-100' },
  low: { icon: '•', label: 'Faible', badge: 'border-zinc-700 bg-zinc-900 text-zinc-300' },
}

const HEALTH_META = {
  Excellent: 'text-emerald-300',
  Bon: 'text-green-300',
  'À améliorer': 'text-amber-300',
  Critique: 'text-red-300',
} as const

function formatCurrency(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} M€`
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} k€`
  return `${Math.round(value)} €`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Maintenant'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function toMinutesLabel(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (hours <= 0) return `${minutes} min`
  if (minutes <= 0) return `${hours} h`
  return `${hours} h ${minutes}`
}

function SectionCard({
  title,
  subtitle,
  children,
  compact = false,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="mb-4">
        <p className="text-base font-bold text-[var(--text-1)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--text-2)]">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function RecommendationRow({ item }: { item: RecommendationItem }) {
  const meta = PRIORITY_META[item.priority]
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base">{meta.icon}</span>
            <p className="text-sm font-semibold text-[var(--text-1)]">{item.title}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
              {meta.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-2)]">{item.description}</p>
          <p className="mt-2 text-xs text-[var(--text-3)]">{item.reason}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs text-[var(--text-3)]">{formatDate(item.createdAt)}</span>
          <a
            href={item.action.href}
            className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1.5 text-xs font-semibold text-green-300 transition-colors hover:bg-green-500/[0.16]"
          >
            {item.action.label}
          </a>
        </div>
      </div>
    </div>
  )
}

function SmallList({
  title,
  items,
}: {
  title: string
  items: RecommendationItem[]
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <p className="text-sm font-semibold text-[var(--text-1)]">{title}</p>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">Aucune action prioritaire pour cette rubrique.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-1)]">{item.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-3)]">{item.reason}</p>
                </div>
                <a href={item.action.href} className="shrink-0 text-xs font-semibold text-green-300 hover:underline">
                  Ouvrir
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CommercialLoadTable({ items }: { items: CommercialLoadItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {items.slice(0, 6).map((item) => (
        <div key={item.userId} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">{item.name}</p>
              <p className="text-xs text-[var(--text-3)]">{item.role}</p>
            </div>
            <span className="rounded-full border border-green-500/30 bg-green-500/[0.08] px-2 py-1 text-xs font-semibold text-green-300">
              Score {item.commercialScore}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-[var(--text-3)]">Dossiers</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{item.projectCount}</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">Prospects</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{item.prospectsCount}</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">Devis</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{item.quotesCount}</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">Gagnés</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{item.wonCount}</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">Perdus</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{item.lostCount}</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">CA estimé</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{formatCurrency(item.estimatedRevenue)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function FieldLoadTable({ items }: { items: FieldLoadItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {items.slice(0, 6).map((item) => (
        <div key={item.userId} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">{item.name}</p>
              <p className="text-xs text-[var(--text-3)]">{item.role}</p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                item.availability === 'busy'
                  ? 'bg-red-500/10 text-red-200'
                  : item.availability === 'soon'
                    ? 'bg-orange-500/10 text-orange-200'
                    : 'bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {item.availability === 'busy' ? 'Occupé' : item.availability === 'soon' ? 'Bientôt occupé' : 'Disponible'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[var(--text-3)]">Interventions</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{item.appointmentCount}</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">Temps planifié</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{toMinutesLabel(item.plannedMinutes)}</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">Temps libre</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{toMinutesLabel(item.freeMinutes)}</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">Conflits</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{item.conflicts}</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">Km estimés</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{item.estimatedKm.toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">Déplacements incohérents</p>
              <p className="mt-1 font-semibold text-[var(--text-1)]">{item.incoherentTravelCount}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OperationsCenterSection({
  data,
  compact = false,
}: {
  data: OperationsCenterResult
  compact?: boolean
}) {
  const healthClassName = HEALTH_META[data.health.label] || 'text-[var(--text-1)]'

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <SectionCard
        title="Centre d'actions"
        subtitle="Les actions a traiter maintenant, calculees a partir de vos statuts, delais, conflits et opportunites."
        compact={compact}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            {data.todayFocus.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--text-3)]">
                Rien de critique aujourd'hui. Votre cockpit est a jour.
              </div>
            ) : (
              data.todayFocus.map((item) => <RecommendationRow key={item.id} item={item} />)
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <p className="text-sm font-semibold text-[var(--text-1)]">Sante de l'entreprise</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className={`text-3xl font-bold ${healthClassName}`}>{data.health.score}/100</p>
                  <p className="mt-1 text-sm text-[var(--text-2)]">{data.health.label}</p>
                </div>
                <span className="rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold text-green-300">
                  {data.recommendations.length} signaux suivis
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {data.health.breakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl bg-[var(--bg-hover)] px-3 py-2 text-sm">
                    <span className="text-[var(--text-2)]">{item.label}</span>
                    <span
                      className={
                        item.status === 'critical'
                          ? 'font-semibold text-red-200'
                          : item.status === 'warning'
                            ? 'font-semibold text-amber-200'
                            : 'font-semibold text-emerald-200'
                      }
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <SmallList title="Ce qu'il faut faire aujourd'hui" items={data.todayFocus.slice(0, 5)} />
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SmallList title="Opportunités" items={data.opportunities} />
        <SmallList title="Risques" items={data.risks} />
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <p className="text-sm font-semibold text-[var(--text-1)]">Mur des actions</p>
          <div className="mt-3 space-y-3">
            {[
              { label: 'Relances', items: data.groupedActions.relances },
              { label: 'Planifications', items: data.groupedActions.planifications },
              { label: 'Affectations', items: data.groupedActions.affectations },
              { label: 'Avis', items: data.groupedActions.avis },
              { label: 'Configuration', items: data.groupedActions.configuration },
            ].map((group) => (
              <div key={group.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--text-1)]">{group.label}</p>
                  <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs text-[var(--text-2)]">
                    {group.items.length}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {group.items.slice(0, 2).map((item) => (
                    <a key={item.id} href={item.action.href} className="block text-xs text-[var(--text-2)] hover:text-[var(--text-1)]">
                      {item.title}
                    </a>
                  ))}
                  {group.items.length === 0 && <p className="text-xs text-[var(--text-3)]">Aucune action.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionCard
        title="Charge commerciale"
        subtitle="Vue par responsable commercial : dossiers, devis, gagne/perdu et potentiel."
        compact={compact}
      >
        <CommercialLoadTable items={data.commercialLoad} />
      </SectionCard>

      <SectionCard
        title="Charge terrain"
        subtitle="Vue par collaborateur : interventions du jour, temps planifie, disponibilite et incoherences."
        compact={compact}
      >
        <FieldLoadTable items={data.fieldLoad} />
      </SectionCard>
    </div>
  )
}

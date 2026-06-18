'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Euro,
  Send,
  Trophy,
  Target,
  ShoppingBag,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  AnimatedKpiValue,
  TrendIndicator,
  Sparkline,
  StatusBadge,
  ScorePill,
  FilterPill,
  BADGE_STYLES,
  KANBAN_COLUMNS,
  METIER_OPTIONS,
  BUDGET_OPTIONS,
  SCORE_OPTIONS,
  PERIODE_OPTIONS,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
  KPI_PERIOD_OPTIONS,
  DEFAULT_FILTERS,
  filterProjects,
  calcDelta,
  formatCurrency,
  formatAmount,
  timeAgo,
  type FilterState,
  type KpiPeriod,
  type Project,
} from '@/src/components/ArtisanDashboard';
import { DemoToast } from '@/src/components/DemoToast';
import {
  ARTISAN,
  KPI_CURRENT,
  KPI_PREVIOUS,
  SPARKLINE_DATA,
  PIPELINE_DATA,
  EVENTS,
  DEMO_PROJECTS,
} from '@/lib/demo-data';

const DEMO_PROJECT_ROUTE = '/demo-dashboard/projet/demo-p1';

function navButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: '10px',
    border: `1px solid ${active ? '#22c55e' : '#3f3f46'}`,
    background: active ? '#22c55e' : '#18181b',
    color: active ? '#09090b' : 'white',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  };
}

export default function DemoDashboardPage() {
  const router = useRouter();

  const [kpiPeriod, setKpiPeriod] = useState<KpiPeriod>('30d');
  const [activeView, setActiveView] = useState<'commercial' | 'calendar'>('commercial');
  const [openPanel, setOpenPanel] = useState<'pipeline' | 'chantiers' | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [demoToast, setDemoToast] = useState(false);

  const showToast = () => setDemoToast(true);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
  };

  const projects = DEMO_PROJECTS as unknown as Project[];

  const filteredProjects = useMemo(() => filterProjects(projects, filters), [projects, filters]);

  const sparklineData = useMemo(
    () => SPARKLINE_DATA.map((value, i) => ({ label: `J${i + 1}`, value })),
    [],
  );

  const kpiCards: {
    label: string;
    value: number;
    delta: number;
    icon: typeof Euro;
    borderColor: string;
    format: (v: number) => string;
    alert?: boolean;
  }[] = [
    {
      label: 'CA potentiel',
      value: KPI_CURRENT.ca_potentiel,
      delta: calcDelta(KPI_CURRENT.ca_potentiel, KPI_PREVIOUS.ca_potentiel),
      icon: Euro,
      borderColor: '#22c55e',
      format: formatCurrency,
    },
    {
      label: 'Devis envoyés',
      value: KPI_CURRENT.devis_envoyes,
      delta: calcDelta(KPI_CURRENT.devis_envoyes, KPI_PREVIOUS.devis_envoyes),
      icon: Send,
      borderColor: '#2563eb',
      format: formatCurrency,
    },
    {
      label: 'Chantiers gagnés',
      value: KPI_CURRENT.chantiers_gagnes,
      delta: calcDelta(KPI_CURRENT.chantiers_gagnes, KPI_PREVIOUS.chantiers_gagnes),
      icon: Trophy,
      borderColor: '#15803d',
      format: formatCurrency,
    },
    {
      label: 'Taux de conversion',
      value: KPI_CURRENT.taux_conversion,
      delta: KPI_CURRENT.taux_conversion - KPI_PREVIOUS.taux_conversion,
      icon: Target,
      borderColor: '#7c3aed',
      format: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      label: 'Panier moyen',
      value: KPI_CURRENT.panier_moyen,
      delta: calcDelta(KPI_CURRENT.panier_moyen, KPI_PREVIOUS.panier_moyen),
      icon: ShoppingBag,
      borderColor: '#d97706',
      format: formatCurrency,
    },
    {
      label: 'À relancer',
      value: KPI_CURRENT.a_relancer,
      delta: KPI_CURRENT.a_relancer - KPI_PREVIOUS.a_relancer,
      icon: Clock,
      borderColor: '#d97706',
      format: (v: number) => `${Math.round(v)} dossier(s)`,
      alert: KPI_CURRENT.a_relancer > 0,
    },
  ];

  const togglePanel = (panel: 'pipeline' | 'chantiers') => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  const chantiersGagnes = projects.filter((p) => p.status === 'Gagné');

  return (
    <div style={{ minHeight: '100vh', background: '#09090b' }}>
      {/* Bandeau mode démo */}
      <div
        style={{
          background: 'rgba(34,197,94,0.08)',
          borderBottom: '1px solid rgba(34,197,94,0.3)',
          padding: '10px 24px',
          textAlign: 'center',
        }}
      >
        <span style={{ color: '#e4e4e7', fontSize: '13px' }}>
          👀 Mode démonstration — Données fictives · Toutes les fonctionnalités sont disponibles en lecture
        </span>
        <a
          href="/register"
          style={{
            background: '#22c55e',
            color: '#09090b',
            borderRadius: '8px',
            padding: '6px 16px',
            fontSize: '13px',
            fontWeight: 600,
            marginLeft: '16px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Créer mon compte gratuit →
        </a>
      </div>

      <div style={{ padding: '24px 32px 40px' }}>
        {/* Header */}
        <div
          style={{
            padding: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#22c55e', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', margin: '0 0 6px' }}>
              Kadria Pro · {ARTISAN.nom}
            </p>

            <h1 style={{ color: 'white', fontSize: '32px', fontWeight: 700, margin: '0 0 6px' }}>
              Tableau de bord
            </h1>

            <p style={{ color: '#71717a', fontSize: '14px', margin: 0 }}>
              {ARTISAN.prenom} · {ARTISAN.metier} · {ARTISAN.ville}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveView('commercial')} style={navButtonStyle(activeView === 'commercial')}>
              📊 Suivi commercial
            </button>

            <button onClick={() => setActiveView('calendar')} style={navButtonStyle(activeView === 'calendar')}>
              📅 Calendrier
            </button>
          </div>
        </div>

        {/* Sélecteur période KPI */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <p className="text-sm text-zinc-400">Période analysée · Données de démonstration</p>

          <div className="flex flex-row items-center gap-2">
            {KPI_PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setKpiPeriod(opt.value)}
                className={
                  opt.value === kpiPeriod
                    ? 'rounded-full border px-4 py-1.5 text-sm font-semibold cursor-pointer'
                    : 'rounded-full border px-4 py-1.5 text-sm cursor-pointer transition-[border-color,color] duration-150 hover:border-green-500/30 hover:text-white'
                }
                style={
                  opt.value === kpiPeriod
                    ? { background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)', color: '#22c55e' }
                    : { background: '#18181b', borderColor: '#27272a', color: '#a1a1aa' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ padding: 0, marginBottom: '24px' }}>
          <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: '16px' }}>
            {kpiCards.map((card) => (
              <div
                key={card.label}
                className={`flex flex-col gap-2 rounded-2xl border px-[22px] py-5 min-h-[100px] ${card.alert ? 'bg-orange-600/[0.04] border-orange-600/30' : 'bg-zinc-900 border-zinc-800'}`}
                style={{ borderTopWidth: '2px', borderTopColor: card.borderColor }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[13px]">{card.label}</span>

                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-green-500">
                    <card.icon className="w-4 h-4" />
                  </div>
                </div>

                <span className="text-[28px] font-bold tracking-tight text-white">
                  <AnimatedKpiValue value={card.value} format={card.format} />
                </span>

                <TrendIndicator delta={card.delta} unit={card.label === 'Taux de conversion' ? ' pts' : '%'} />
              </div>
            ))}
          </div>
        </div>

        {/* Sparkline */}
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-bold text-white">Évolution du CA potentiel</p>
              <p className="text-sm text-zinc-400">Sur les 30 derniers jours</p>
            </div>

            <span className="rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1 text-sm text-green-500">
              {formatCurrency(KPI_CURRENT.ca_potentiel)} sur la période
            </span>
          </div>

          <div className="mt-3">
            <Sparkline data={sparklineData} height={80} />
          </div>
        </div>

        {activeView === 'calendar' ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="text-white font-semibold mb-4">📅 Calendrier — Juin 2026</h3>

            <div className="space-y-2">
              {EVENTS.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{
                        background:
                          event.color === 'green' ? 'rgba(34,197,94,0.15)'
                          : event.color === 'orange' ? 'rgba(217,119,6,0.15)'
                          : event.color === 'blue' ? 'rgba(37,99,235,0.15)'
                          : 'rgba(168,85,247,0.15)',
                        color:
                          event.color === 'green' ? '#4ade80'
                          : event.color === 'orange' ? '#fbbf24'
                          : event.color === 'blue' ? '#60a5fa'
                          : '#c084fc',
                      }}
                    >
                      {event.type}
                    </span>
                    <span className="text-sm text-white">{event.titre}</span>
                  </div>

                  <span className="text-xs text-zinc-400">
                    {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={showToast}
              className="mt-4 rounded-[10px] border border-green-500/30 bg-zinc-950 px-4 py-2 text-sm font-semibold text-green-500"
            >
              + Événement
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full" style={{ marginBottom: '24px' }}>
            {/* Opportunites prioritaires */}
            <div className="my-2 border-t border-zinc-800" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-white">Opportunites prioritaires</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Les dossiers a rappeler en premier selon completude, budget, urgence, delai, reactivite et distance.
                </p>
              </div>

              <span className="rounded-full border border-green-500/25 bg-green-500/[0.08] px-3 py-1 text-xs text-green-400">
                Score IA
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { id: 'demo-1', rang: 1, score: 92, badge: 'Priorite elevee', nom: 'Laurent Bertrand', metier: 'Remplacement chaudiere', ville: 'Lyon 3e', budget: '3 000 - 5 000 EUR' },
                { id: 'demo-2', rang: 2, score: 86, badge: 'Priorite elevee', nom: 'Sophie Mercier', metier: 'Renovation salle de bain', ville: 'Villeurbanne', budget: '8 000 - 12 000 EUR' },
                { id: 'demo-3', rang: 3, score: 78, badge: 'A suivre', nom: 'Marc Fontaine', metier: 'Depannage urgent', ville: 'Lyon 6e', budget: '500 - 1 000 EUR' },
                { id: 'demo-4', rang: 4, score: 67, badge: 'A suivre', nom: 'Claire Martin', metier: 'Peinture interieure', ville: 'Bron', budget: '2 000 - 4 000 EUR' },
                { id: 'demo-5', rang: 5, score: 44, badge: 'Faible potentiel', nom: 'Nicolas Faure', metier: 'Terrasse bois', ville: 'Ecully', budget: 'Budget a preciser' },
              ].map((opp, index) => (
                <button
                  key={opp.id}
                  onClick={() => router.push(DEMO_PROJECT_ROUTE)}
                  className={`rounded-2xl border p-5 flex flex-col gap-3 text-left transition-transform duration-200 hover:-translate-y-0.5 ${
                    index === 0
                      ? 'border-green-500/25 bg-green-500/[0.02]'
                      : 'border-zinc-800 bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="bg-green-500/20 text-green-400 text-xs rounded px-2 py-0.5 font-bold">
                      #{opp.rang}
                    </span>

                    <span className="text-green-400 font-bold text-sm">{opp.score}/100</span>
                  </div>

                  <div>
                    <p className="font-bold text-white truncate">{opp.nom}</p>
                    <p className="text-sm text-zinc-400 truncate">{opp.metier} - {opp.ville}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="rounded-full border border-green-500/25 bg-green-500/[0.08] px-2 py-0.5 text-xs font-semibold text-green-400">{opp.badge}</span>
                    <span className="text-zinc-400 text-xs">{opp.budget}</span>
                  </div>
                </button>
              ))}
            </div>


            {/* Toggles */}
            <div>
              <div className="relative my-2 border-t border-zinc-800">
                <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 px-4 text-xs uppercase tracking-[0.08em] text-zinc-400">
                  Analyses détaillées
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => togglePanel('pipeline')}
                  className={`flex h-20 items-center justify-between gap-3 rounded-2xl border-2 px-5 transition-colors duration-200 ${
                    openPanel === 'pipeline'
                      ? 'border-green-500 bg-green-500/[0.08] shadow-[0_0_0_1px_rgba(34,197,94,0.25)]'
                      : 'border-zinc-800 bg-zinc-900 hover:border-green-500/25 hover:bg-green-500/[0.04]'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="text-[15px] font-bold text-white">Pipeline commerciale</span>
                    <span className="text-xs text-zinc-400">5 étapes · {projects.length} dossiers</span>
                  </div>
                  <ChevronRight className={`h-[18px] w-[18px] shrink-0 text-zinc-400 transition-transform duration-200 ${openPanel === 'pipeline' ? 'rotate-90' : ''}`} />
                </button>

                <button
                  onClick={() => togglePanel('chantiers')}
                  className={`flex h-20 items-center justify-between gap-3 rounded-2xl border-2 px-5 transition-colors duration-200 ${
                    openPanel === 'chantiers'
                      ? 'border-green-500 bg-green-500/[0.08] shadow-[0_0_0_1px_rgba(34,197,94,0.25)]'
                      : 'border-zinc-800 bg-zinc-900 hover:border-green-500/25 hover:bg-green-500/[0.04]'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="text-[15px] font-bold text-white">Chantiers en cours</span>
                    <span className="text-xs text-zinc-400">Vue des dossiers gagnés</span>
                  </div>
                  <ChevronRight className={`h-[18px] w-[18px] shrink-0 text-zinc-400 transition-transform duration-200 ${openPanel === 'chantiers' ? 'rotate-90' : ''}`} />
                </button>
              </div>
            </div>

            {openPanel === 'pipeline' && (
              <div className="rounded-2xl border border-zinc-800 overflow-hidden p-6">
                <h3 className="text-white font-semibold mb-3">Pipeline</h3>

                {Object.entries(PIPELINE_DATA).map(([label, value]) => {
                  const style = BADGE_STYLES[label] || { bg: 'rgba(39,39,42,0.8)', color: '#e4e4e7' };
                  const total = Object.values(PIPELINE_DATA).reduce((a, b) => a + b, 0) || 1;
                  const pct = value > 0 ? Math.max(Math.round((value / total) * 100), 4) : 0;

                  return (
                    <div key={label} style={{ padding: '10px 14px', background: '#18181b', borderRadius: '8px', marginBottom: '4px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: style.color, fontSize: '13px' }}>{label}</span>
                        <span style={{ background: style.bg, color: style.color, borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: 700 }}>
                          {value}
                        </span>
                      </div>

                      <div style={{ height: '3px', background: '#27272a', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: style.color, borderRadius: '2px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {openPanel === 'chantiers' && (
              <div className="rounded-2xl border border-zinc-800 overflow-hidden p-6">
                <h3 className="text-white font-semibold mb-3">🏆 Chantiers en cours (statut Gagné)</h3>

                <div className="space-y-2">
                  {chantiersGagnes.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => router.push(DEMO_PROJECT_ROUTE)}
                      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 cursor-pointer hover:bg-zinc-900"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{p.clientFirstName} {p.clientName}</p>
                        <p className="text-xs text-zinc-400">{p.projectType} · {p.city}</p>
                      </div>
                      <span className="text-xs text-zinc-400">{p.budget}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filtres + liste */}
            <div className="space-y-4 w-full">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative min-w-[260px] flex-1">
                  <input
                    className="w-full rounded-[10px] border border-zinc-800 bg-zinc-900 py-2.5 pl-3 pr-3 text-sm text-white outline-none focus:border-green-500"
                    placeholder="Nom, projet, ville, référence..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      updateFilter('search', e.target.value);
                    }}
                  />
                </div>

                <select
                  className="rounded-[10px] border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  value={filters.statut}
                  onChange={(e) => updateFilter('statut', e.target.value)}
                >
                  <option value="">Tous les statuts</option>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                <select
                  className="rounded-[10px] border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  value={filters.metier}
                  onChange={(e) => updateFilter('metier', e.target.value)}
                >
                  <option value="">Tous les métiers</option>
                  {METIER_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select
                  className="rounded-[10px] border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  value={filters.budget}
                  onChange={(e) => updateFilter('budget', e.target.value)}
                >
                  <option value="">Tous les budgets</option>
                  {BUDGET_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>

                <select
                  className="rounded-[10px] border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  value={filters.score}
                  onChange={(e) => updateFilter('score', e.target.value)}
                >
                  <option value="">Tous les scores</option>
                  {SCORE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <select
                  className="rounded-[10px] border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  value={filters.periode}
                  onChange={(e) => updateFilter('periode', e.target.value)}
                >
                  <option value="">Toutes les dates</option>
                  {PERIODE_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>

                <select
                  className="rounded-[10px] border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  value={filters.source}
                  onChange={(e) => updateFilter('source', e.target.value)}
                >
                  <option value="">Toutes les sources</option>
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-lg border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-400 transition-colors duration-150 hover:border-red-600 hover:text-red-600"
                  >
                    ✕ Réinitialiser
                  </button>
                )}
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {filters.search && (
                    <FilterPill label={`Recherche: ${filters.search}`} onRemove={() => { setSearchInput(''); updateFilter('search', ''); }} />
                  )}
                  {filters.statut && (
                    <FilterPill label={`Statut: ${filters.statut}`} onRemove={() => updateFilter('statut', '')} />
                  )}
                  {filters.metier && (
                    <FilterPill label={`Métier: ${filters.metier}`} onRemove={() => updateFilter('metier', '')} />
                  )}
                  {filters.budget && (
                    <FilterPill
                      label={`Budget: ${BUDGET_OPTIONS.find((b) => b.value === filters.budget)?.label ?? filters.budget}`}
                      onRemove={() => updateFilter('budget', '')}
                    />
                  )}
                  {filters.score && (
                    <FilterPill
                      label={`Score: ${SCORE_OPTIONS.find((s) => s.value === filters.score)?.label ?? filters.score}`}
                      onRemove={() => updateFilter('score', '')}
                    />
                  )}
                  {filters.periode && (
                    <FilterPill
                      label={`Période: ${PERIODE_OPTIONS.find((p) => p.value === filters.periode)?.label ?? filters.periode}`}
                      onRemove={() => updateFilter('periode', '')}
                    />
                  )}
                  {filters.source && (
                    <FilterPill
                      label={`Source: ${SOURCE_OPTIONS.find((s) => s.value === filters.source)?.label ?? filters.source}`}
                      onRemove={() => updateFilter('source', '')}
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-zinc-400">
                  {hasActiveFilters
                    ? `${filteredProjects.length} dossier(s) sur ${projects.length} total`
                    : `${filteredProjects.length} dossier(s) trouvé(s)`}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`rounded-lg px-4 py-2 text-sm transition-colors duration-150 ${
                      viewMode === 'list'
                        ? 'bg-green-500 font-semibold text-zinc-950'
                        : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    📋 Liste
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('kanban')}
                    className={`rounded-lg px-4 py-2 text-sm transition-colors duration-150 ${
                      viewMode === 'kanban'
                        ? 'bg-green-500 font-semibold text-zinc-950'
                        : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    🗂️ Kanban
                  </button>

                  <button
                    type="button"
                    onClick={showToast}
                    className="flex items-center gap-2 rounded-[10px] border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors duration-150 hover:border-green-500/30"
                  >
                    Exporter
                  </button>
                </div>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-16 text-center">
                  <p className="font-bold text-white">Aucun dossier trouvé</p>
                  <p className="text-zinc-400 mt-1">Essayez d&apos;élargir vos critères de recherche</p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-[10px] bg-green-500 px-6 py-3 text-sm font-semibold text-zinc-950"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : viewMode === 'kanban' ? (
                <DemoKanbanBoard projects={filteredProjects} onCardClick={() => router.push(DEMO_PROJECT_ROUTE)} onStatusChange={showToast} />
              ) : (
                <DemoProjectList projects={filteredProjects} onCardClick={() => router.push(DEMO_PROJECT_ROUTE)} />
              )}
            </div>
          </div>
        )}
      </div>

      <DemoToast show={demoToast} onClose={() => setDemoToast(false)} />
    </div>
  );
}

function DemoProjectList({ projects, onCardClick }: { projects: Project[]; onCardClick: () => void }) {
  return (
    <div>
      <div
        className="hidden md:grid grid-cols-12 gap-4 bg-zinc-900 rounded-t-xl text-zinc-500 uppercase tracking-widest"
        style={{ fontSize: '11px', padding: '10px 16px' }}
      >
        <span className="col-span-1">Réf</span>
        <span className="col-span-1">Reçu</span>
        <span className="col-span-2">Client</span>
        <span className="col-span-2">Projet</span>
        <span className="col-span-2">Ville</span>
        <span className="col-span-1">Budget</span>
        <span className="col-span-1">Score</span>
        <span className="col-span-1">Statut</span>
        <span className="col-span-1"></span>
      </div>

      {projects.map((p) => (
        <div
          key={p.id}
          className="border-b border-zinc-800/50 bg-zinc-900 hover:bg-[#1f1f23] transition-colors duration-100 px-4 py-3 md:p-0 cursor-pointer"
          onClick={onCardClick}
        >
          <div className="hidden md:grid grid-cols-12 gap-4 items-center" style={{ fontSize: '13px', padding: '12px 16px' }}>
            <span className="col-span-1 text-zinc-500 font-mono">{String(p.id).slice(0, 6)}</span>

            <span className="col-span-1 text-zinc-400">
              {p.createdAt ? timeAgo(p.createdAt) : '—'}
            </span>

            <span className="col-span-2 flex items-center gap-2 font-medium text-white truncate">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-200">
                {`${p.clientFirstName?.[0] || ''}${p.clientName?.[0] || ''}`.toUpperCase() || '?'}
              </span>
              {p.clientFirstName} {p.clientName}
            </span>

            <span className="col-span-2 text-zinc-400" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.trade || '—'}
            </span>

            <span className="col-span-2 text-zinc-400 truncate">{p.city || '—'}</span>

            <span className="col-span-1 text-zinc-400">{p.budget || '—'}</span>

            <span className="col-span-1">
              <ScorePill score={p.completenessScore || 0} />
            </span>

            <span className="col-span-1">
              <StatusBadge status={p.status} />
            </span>

            <span className="col-span-1 text-right">
              <ChevronRight className="w-4 h-4 text-zinc-400 inline" />
            </span>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-200">
              {`${p.clientFirstName?.[0] || ''}${p.clientName?.[0] || ''}`.toUpperCase() || '?'}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-white">{p.clientFirstName} {p.clientName}</span>
                <StatusBadge status={p.status} />
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                <span>{String(p.id).slice(0, 6)}</span>
                {p.trade && <span>· {p.trade}</span>}
                {p.city && <span>· {p.city}</span>}
                {p.budget && <span>· {p.budget}</span>}
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoKanbanBoard({
  projects,
  onCardClick,
  onStatusChange,
}: {
  projects: Project[];
  onCardClick: () => void;
  onStatusChange: () => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full pb-2">
        {KANBAN_COLUMNS.map((col) => {
          const colProjects = projects.filter((p) => p.status === col.status);
          const total = colProjects.reduce((sum, p) => sum + (p.devisAmount || 0), 0);
          const isGagne = col.status === 'Gagné';
          const headerColor = isGagne ? '#f59e0b' : col.color;

          return (
            <div
              key={col.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onStatusChange();
              }}
              style={{ borderTop: `3px solid ${col.color}` }}
              className="flex min-w-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <span className="text-sm font-bold text-white">
                  {isGagne && '🏆 '}
                  {col.label}
                </span>

                <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: `${headerColor}26`, color: headerColor }}>
                  {colProjects.length}
                </span>
              </div>

              <div className="flex max-h-[calc(100vh-300px)] flex-col gap-3 overflow-y-auto p-3">
                {colProjects.length === 0 ? (
                  <div className="py-8 text-center text-sm text-zinc-500">Aucun dossier</div>
                ) : (
                  colProjects.map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                      onClick={onCardClick}
                      className={`cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-500/30 ${isGagne ? 'bg-green-500/[0.03]' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-200">
                          {`${p.clientFirstName?.[0] || ''}${p.clientName?.[0] || ''}`.toUpperCase() || '?'}
                        </span>

                        <span className="truncate text-sm font-semibold text-white">
                          {p.clientFirstName} {p.clientName}
                        </span>

                        <StatusBadge status={p.status} />
                      </div>

                      <p className="mt-1.5 truncate text-xs text-zinc-400">{p.trade || p.projectType || 'Projet'}</p>

                      <p className="truncate text-xs text-zinc-400">
                        {p.city || '—'} · {p.budget || '—'}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: (p.completenessScore || 0) > 80 ? '#22c55e' : (p.completenessScore || 0) >= 60 ? '#f59e0b' : '#dc2626' }}>
                          Score: {p.completenessScore || 0}%
                        </span>

                        <span className="ml-auto text-xs text-zinc-500">{p.createdAt ? timeAgo(p.createdAt) : '—'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-zinc-800 px-2 py-2 text-center text-xs text-zinc-400">
                {colProjects.length} dossier{colProjects.length === 1 ? '' : 's'} · {formatAmount(total)} potentiel
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

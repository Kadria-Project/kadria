'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { getProjects } from '@/src/lib/api';
import AuthGuard from '@/src/components/AuthGuard';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Skeleton } from '@/src/components/ui/skeleton';
import {
  Search,
  FolderOpen,
  Send,
  Trophy,
  ChevronRight,
  LogOut,
  Euro,
  Target,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Calendar = dynamic(() => import('./Calendar'), { ssr: false });

const ProspectsLeafletMap = dynamic(
  () => import('@/src/components/ProspectsLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
        Chargement de la carte...
      </div>
    ),
  },
);

type GetProjectsOutputType = {
  projects: any[];
};

type Project = GetProjectsOutputType['projects'][0];

const STATUS_OPTIONS = [
  { value: 'Nouveau', label: 'Nouveau', cls: 'bg-zinc-800 text-zinc-200' },
  { value: 'À rappeler', label: 'À rappeler', cls: 'bg-amber-500/20 text-amber-400' },
  { value: 'Qualifié', label: 'Qualifié', cls: 'bg-green-500/20 text-green-400' },
  { value: 'En cours', label: 'En cours', cls: 'bg-purple-500/20 text-purple-400' },
  { value: 'Devis envoyé', label: 'Devis envoyé', cls: 'bg-blue-500/20 text-blue-400' },
  { value: 'Gagné', label: 'Gagné', cls: 'bg-green-600/20 text-green-300' },
  { value: 'Perdu', label: 'Perdu', cls: 'bg-red-500/20 text-red-400' },
];

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  'Nouveau':      { bg: 'rgba(39,39,42,0.8)',    color: '#e4e4e7' },
  'À rappeler':   { bg: 'rgba(120,53,15,0.5)',   color: '#fbbf24' },
  'Qualifié':     { bg: 'rgba(20,83,45,0.5)',    color: '#4ade80' },
  'Devis envoyé': { bg: 'rgba(30,58,95,0.5)',    color: '#60a5fa' },
  'En cours':     { bg: 'rgba(88,28,135,0.5)',   color: '#c084fc' },
  'Gagné':        { bg: 'rgba(20,83,45,0.7)',    color: '#86efac' },
  'Perdu':        { bg: 'rgba(69,10,10,0.5)',    color: '#f87171' },
};

export default function ArtisanDashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}

function fmt(n?: number): string {
  return Math.round(n ?? 0).toLocaleString('fr-FR') + ' €';
}

function parseBudgetValue(budget?: string): number {
  if (!budget) return 0;

  const matches = String(budget).match(/[\d\s]+/g);

  if (!matches) return 0;

  const numbers = matches
    .map((m) => parseInt(m.replace(/\s/g, ''), 10))
    .filter((n) => !Number.isNaN(n));

  return numbers.length ? Math.max(...numbers) : 0;
}

function budgetScore(budget?: string): number {
  const value = parseBudgetValue(budget);

  if (value > 20000) return 160;
  if (value > 10000) return 120;
  if (value > 5000) return 80;
  if (value > 3000) return 50;
  if (value > 1000) return 30;

  return 10;
}

function opportunityScore(project: Project): number {
  return (project.completenessScore || 0) * 2 + budgetScore(project.budget);
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays}j`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)}sem`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const cardStyle: React.CSSProperties = {
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '14px',
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

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

function Dashboard() {
  const router = useRouter();

  const user = {
    email: 'demo@kadria.local',
    name: 'Artisan Demo',
    role: 'User',
  };

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [quickFilter, setQuickFilter] = useState<'today' | 'overdue' | null>(null);
  const [activeView, setActiveView] = useState<'commercial' | 'calendar'>('commercial');

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const loadData = useCallback(async () => {
    try {
      const projRes = await getProjects({});

      setAllProjects(projRes.projects || []);
    } catch (error) {
      console.error('LOAD_DASHBOARD_ERROR', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const debouncedSearch = useDebouncedCallback((val: string) => {
    setQuickFilter(null);
    setSearch(val);
  }, 400);

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const now = today.getTime();

  const totalBudget = allProjects.reduce(
    (sum, p) => sum + parseBudgetValue(p.budget),
    0,
  );

  const devisEnvoyeAmount = allProjects
    .filter((p) => p.status === 'Devis envoyé')
    .reduce((sum, p) => sum + parseBudgetValue(p.budget), 0);

  const gagneProjects = allProjects.filter((p) => p.status === 'Gagné');

  const gagneAmount = gagneProjects.reduce(
    (sum, p) => sum + parseBudgetValue(p.budget),
    0,
  );

  const tauxTransformation = allProjects.length
    ? Math.round((gagneProjects.length / allProjects.length) * 100)
    : 0;

  const panierMoyen = allProjects.length
    ? totalBudget / allProjects.length
    : 0;

  const todayCallbacks = allProjects.filter((project) => {
    if (!project.callbackDate) return false;

    const callbackKey = String(project.callbackDate).slice(0, 10);

    return callbackKey === todayKey;
  });

  const overdueCallbacks = allProjects.filter((project) => {
    if (!project.callbackDate) return false;
    if (project.status === 'Gagné' || project.status === 'Perdu') return false;

    const callbackTime = new Date(project.callbackDate).getTime();

    return !Number.isNaN(callbackTime) && callbackTime < now;
  });

  const dossiersARelancer = overdueCallbacks.length;

  const kpis = [
    { label: 'CA potentiel', value: fmt(totalBudget), icon: Euro },
    { label: 'Devis envoyés', value: fmt(devisEnvoyeAmount), icon: Send },
    { label: 'Chantiers gagnés', value: fmt(gagneAmount), icon: Trophy },
    { label: 'Taux de transformation', value: `${tauxTransformation} %`, icon: Target },
    { label: 'Panier moyen', value: fmt(panierMoyen), icon: ShoppingCart },
    { label: 'Dossiers à relancer', value: String(dossiersARelancer), icon: AlertCircle },
  ];

  const pipelineSteps = [
    { label: 'Nouveau', value: allProjects.filter((p) => p.status === 'Nouveau').length },
    { label: 'À rappeler', value: allProjects.filter((p) => p.status === 'À rappeler').length },
    { label: 'Qualifié', value: allProjects.filter((p) => p.status === 'Qualifié').length },
    { label: 'Devis envoyé', value: allProjects.filter((p) => p.status === 'Devis envoyé').length },
    { label: 'Gagné', value: allProjects.filter((p) => p.status === 'Gagné').length },
  ];

  const topOpportunities = [...allProjects]
    .filter((project) => project.status !== 'Perdu')
    .sort((a, b) => opportunityScore(b) - opportunityScore(a))
    .slice(0, 3);

  const trades = Array.from(
    new Set(allProjects.map((p) => p.trade).filter(Boolean)),
  ) as string[];

  const filteredProjects = allProjects.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (tradeFilter && p.trade !== tradeFilter) return false;

    if (search) {
      const searchable = [
        p.projectNumber,
        p.clientName,
        p.clientFirstName,
        p.clientEmail,
        p.clientPhone,
        p.city,
        p.trade,
        p.projectType,
        p.budget,
        p.aiSummary,
      ]
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(search.toLowerCase())) return false;
    }

    return true;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    return db - da;
  });

  const displayedProjects =
    quickFilter === 'today'
      ? todayCallbacks
      : quickFilter === 'overdue'
        ? overdueCallbacks
        : sortedProjects;

  const resetFilters = () => {
    setStatusFilter('');
    setTradeFilter('');
    setSearch('');
    setSearchInput('');
    setQuickFilter(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', padding: '24px 32px 40px' }}>
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
        <div>
          <p style={{ color: '#22c55e', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', margin: '0 0 6px' }}>
            Kadria Pro
          </p>

          <h1 style={{ color: 'white', fontSize: '32px', fontWeight: 700, margin: '0 0 6px' }}>
            Tableau de bord
          </h1>

          <p style={{ color: '#71717a', fontSize: '14px', margin: 0, textTransform: 'capitalize' }}>
            {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setActiveView('commercial')} style={navButtonStyle(activeView === 'commercial')}>
            📊 Suivi commercial
          </button>

          <button onClick={() => setActiveView('calendar')} style={navButtonStyle(activeView === 'calendar')}>
            📅 Calendrier
          </button>

          <button
            onClick={logout}
            title="Déconnexion"
            className="bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg"
            style={{ padding: '9px 12px', cursor: 'pointer' }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding: 0, marginBottom: '24px' }}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '16px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '16px' }}>
            {kpis.map((k) => {
              const isAlert = k.label === 'Dossiers à relancer' && dossiersARelancer > 0;

              const borderTopColor =
                k.label === 'CA potentiel' ? '#22c55e'
                : k.label === 'Devis envoyés' ? '#60a5fa'
                : k.label === 'Chantiers gagnés' ? '#86efac'
                : k.label === 'Taux de transformation' ? '#a78bfa'
                : k.label === 'Panier moyen' ? '#fbbf24'
                : k.label === 'Dossiers à relancer' ? (dossiersARelancer > 0 ? '#f87171' : '#27272a')
                : '#27272a';

              return (
                <div
                  key={k.label}
                  style={{
                    ...cardStyle,
                    borderRadius: '14px',
                    borderTop: `2px solid ${borderTopColor}`,
                    padding: '20px 22px',
                    minHeight: '100px',
                    ...(isAlert ? { borderColor: 'rgba(239,68,68,0.3)', borderTopColor } : {}),
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#71717a', fontSize: '13px' }}>{k.label}</span>

                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: '#27272a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#22c55e',
                      }}
                    >
                      <k.icon className="w-4 h-4" />
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      letterSpacing: '-0.5px',
                      color: isAlert ? '#f87171' : 'white',
                    }}
                  >
                    {k.value}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alertes */}
      {!loading && (overdueCallbacks.length > 0 || todayCallbacks.length > 0) && (
        <div style={{ padding: 0, marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {overdueCallbacks.length > 0 && (
            <div
              style={{
                flex: 1,
                minWidth: '280px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p style={{ color: '#f87171', fontWeight: 600, fontSize: '14px', margin: '0 0 2px' }}>
                  ⚠️ Relances en retard
                </p>
                <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>
                  {overdueCallbacks.length} prospect(s) n'ont pas été rappelés
                </p>
              </div>

              <button
                onClick={() => {
                  setQuickFilter('overdue');
                  setStatusFilter('');
                  setTradeFilter('');
                  setSearch('');
                  setSearchInput('');
                }}
                style={{
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Voir les retards →
              </button>
            </div>
          )}

          {todayCallbacks.length > 0 && (
            <div
              style={{
                flex: 1,
                minWidth: '280px',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '14px', margin: '0 0 2px' }}>
                  📅 Relances du jour
                </p>
                <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>
                  {todayCallbacks.length} relance(s) programmée(s) aujourd'hui
                </p>
              </div>

              <button
                onClick={() => {
                  setQuickFilter('today');
                  setStatusFilter('');
                  setTradeFilter('');
                  setSearch('');
                  setSearchInput('');
                }}
                style={{
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Voir les relances →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vue active */}
      {activeView === 'calendar' ? (
        <div style={{ padding: '0 32px' }}>
          <Calendar artisanId="" />
        </div>
      ) : (
        <div style={{ padding: 0, marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }} className="!grid-cols-1 lg:!grid-cols-[1fr_380px]">
            {/* Colonne principale */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />

                  <Input
                    className="pl-9"
                    placeholder="Rechercher un client, un projet…"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setQuickFilter(null);
                      debouncedSearch(e.target.value);
                    }}
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setQuickFilter(null);
                    setStatusFilter(v === 'all' ? '' : v);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>

                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={tradeFilter}
                  onValueChange={(v) => {
                    setQuickFilter(null);
                    setTradeFilter(v === 'all' ? '' : v);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Tous les métiers" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">Tous les métiers</SelectItem>

                    {trades.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="ghost" onClick={resetFilters}>
                  Réinitialiser
                </Button>
              </div>

              {quickFilter && (
                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <p className="text-sm text-zinc-400">
                    Filtre actif :{' '}
                    <span className="text-white font-medium">
                      {quickFilter === 'today' ? 'Relances du jour' : 'Relances en retard'}
                    </span>
                  </p>

                  <Button variant="ghost" size="sm" onClick={() => setQuickFilter(null)}>
                    Afficher tous les dossiers
                  </Button>
                </div>
              )}

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl bg-zinc-800" />
                  ))}
                </div>
              ) : displayedProjects.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-16 text-center">
                  <FolderOpen className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                  <p className="text-zinc-400">Aucun dossier trouvé</p>
                </div>
              ) : (
                <ProjectList projects={displayedProjects} router={router} />
              )}
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-4">
              {!loading && topOpportunities.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3">🏆 Top opportunités</h3>

                  <div className="flex flex-col gap-3">
                    {topOpportunities.map((project, index) => (
                      <button
                        key={project.id}
                        onClick={() => router.push(`/dashboard-v2/projet/${project.id}`)}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 text-left hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="bg-green-500/20 text-green-400 text-xs rounded px-2 py-0.5 font-bold">
                            #{index + 1}
                          </span>

                          <span style={{ fontSize: '14px', fontWeight: 700 }} className="text-green-400">
                            {opportunityScore(project)}
                          </span>
                        </div>

                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600 }} className="text-white truncate">
                            {project.clientFirstName} {project.clientName}
                          </p>

                          <p style={{ fontSize: '12px' }} className="text-zinc-400 truncate">
                            {project.trade || 'Projet'} · {project.city || 'Ville non renseignée'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge status={project.status} />

                          <span className="text-zinc-400 text-xs">
                            {project.budget || 'Budget non renseigné'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!loading && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Pipeline</h3>

                  <div>
                    {pipelineSteps.map((step) => {
                      const style = BADGE_STYLES[step.label] || { bg: 'rgba(39,39,42,0.8)', color: '#e4e4e7' };
                      const total = allProjects.length || 1;
                      const pct = step.value > 0 ? Math.max(Math.round((step.value / total) * 100), 4) : 0;

                      return (
                        <div
                          key={step.label}
                          style={{
                            padding: '10px 14px',
                            background: '#18181b',
                            borderRadius: '8px',
                            marginBottom: '4px',
                            fontSize: '13px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: style.color, fontSize: '13px' }}>{step.label}</span>

                            <span
                              style={{
                                background: style.bg,
                                color: style.color,
                                borderRadius: '20px',
                                padding: '2px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                              }}
                            >
                              {step.value}
                            </span>
                          </div>

                          <div
                            style={{
                              height: '3px',
                              background: '#27272a',
                              borderRadius: '2px',
                              marginTop: '6px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: style.color,
                                borderRadius: '2px',
                                transition: 'width 0.5s ease',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!loading && (
                <div>
                  <h3 className="text-white font-semibold mb-3">📍 Chantiers</h3>

                  <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #27272a' }}>
                    <ProspectsLeafletMap
                      projects={sortedProjects.slice(0, 8)}
                      onSelectProject={(projectId) => router.push(`/dashboard-v2/projet/${projectId}`)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectList({
  projects,
  router,
}: {
  projects: Project[];
  router: ReturnType<typeof useRouter>;
}) {
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
          onClick={() => router.push(`/dashboard-v2/projet/${p.id}`)}
        >
          <div className="hidden md:grid grid-cols-12 gap-4 items-center" style={{ fontSize: '13px', padding: '12px 16px' }}>
            <span className="col-span-1 text-zinc-500 font-mono">
              {String(p.id).slice(0, 6)}
            </span>

            <span className="col-span-1 text-zinc-400">
              {p.createdAt ? timeAgo(p.createdAt) : '—'}
            </span>

            <span className="col-span-2 flex items-center gap-2 font-medium text-white truncate">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-200">
                {`${p.clientFirstName?.[0] || ''}${p.clientName?.[0] || ''}`.toUpperCase() || '?'}
              </span>
              {p.clientFirstName} {p.clientName}
            </span>

            <span
              className="col-span-2 text-zinc-400"
              style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {p.trade || '—'}
            </span>

            <span className="col-span-2 text-zinc-400 truncate">
              {p.city || '—'}
            </span>

            <span className="col-span-1 text-zinc-400">
              {p.budget || '—'}
            </span>

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
                <span className="font-medium text-sm text-white">
                  {p.clientFirstName} {p.clientName}
                </span>

                <StatusBadge status={p.status} />
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                <span>{String(p.id).slice(0, 6)}</span>

                {p.createdAt && (
                  <span>· {format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: fr })}</span>
                )}

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

function StatusBadge({ status }: { status?: string }) {
  const style = BADGE_STYLES[status || ''] || { bg: 'rgba(39,39,42,0.8)', color: '#e4e4e7' };

  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        borderRadius: '20px',
        padding: '2px 10px',
        fontSize: '11px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {status || 'Inconnu'}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171';

  return (
    <span className="text-xs font-bold" style={{ color }}>
      {score}%
    </span>
  );
}

export { STATUS_OPTIONS, StatusBadge, ScorePill };

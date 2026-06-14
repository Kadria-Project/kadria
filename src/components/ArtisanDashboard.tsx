'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { getProjects, updateProject } from '@/src/lib/api';
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
  ChevronDown,
  BarChart3,
  MapPin,
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

function parseBudget(budgetStr: string): number {
  if (!budgetStr) return 0
  // Extrait les nombres du string budget
  const numbers = budgetStr.match(/\d+[\s\d]*/g)
  if (!numbers) return 0
  // Prend la valeur max de la fourchette
  const values = numbers.map(n => parseInt(n.replace(/\s/g, ''), 10))
    .filter(n => !isNaN(n) && n > 0)
  return values.length > 0 ? Math.max(...values) : 0
}

const formatAmount = (n: number) =>
  n >= 1000
    ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k €`
    : `${n} €`

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

const KANBAN_COLUMNS: { status: string; label: string; color: string }[] = [
  { status: 'Nouveau', label: 'Nouveau', color: '#3f3f46' },
  { status: 'À rappeler', label: 'À rappeler', color: '#d97706' },
  { status: 'Qualifié', label: 'Qualifié', color: '#16a34a' },
  { status: 'Devis envoyé', label: 'Devis envoyé', color: '#2563eb' },
  { status: 'Gagné', label: 'Gagné', color: '#15803d' },
];

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
  const [overdueEvents, setOverdueEvents] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(() => {
    if (typeof window === 'undefined') return 'list';
    const saved = localStorage.getItem('kadria_view_mode');
    return saved === 'list' || saved === 'kanban' ? saved : 'list';
  });

  const setView = (mode: 'list' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem('kadria_view_mode', mode);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setAllProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));

    try {
      await updateProject(id, { status: newStatus });
    } catch (error) {
      console.error('UPDATE_PROJECT_STATUS_ERROR', error);
    }
  };

  const [openPanel, setOpenPanel] = useState<'pipeline' | 'chantiers' | null>(null);
  useEffect(() => {
    const restore = () => {
      const saved = localStorage.getItem('kadria_dashboard_panels');
      if (saved === 'pipeline' || saved === 'chantiers') setOpenPanel(saved);
    };
    restore();
  }, []);

  const togglePanel = (panel: 'pipeline' | 'chantiers') => {
    setOpenPanel((prev) => {
      const next = prev === panel ? null : panel;
      localStorage.setItem('kadria_dashboard_panels', next ?? '');
      return next;
    });
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const loadData = useCallback(async () => {
    try {
      const projRes = await getProjects({});

      setAllProjects(projRes.projects || []);

      const eventsRes = await fetch('/api/events');
      const eventsData = await eventsRes.json();

      if (eventsData.success) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const overdue = eventsData.events.filter((e: any) => {
          if (e.status === 'Fait') return false; // Exclut les événements validés
          const eventDate = new Date(e.date);
          return eventDate < now && !e.date?.startsWith(todayStr);
        });

        const today = eventsData.events.filter((e: any) => {
          if (e.status === 'Fait') return false;
          return e.date?.startsWith(todayStr);
        });

        setOverdueEvents(overdue);
        setTodayEvents(today);
      }
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

  // CA potentiel = somme des devisAmount si rempli, sinon budget parsé
  const caTotal = allProjects
    .filter((p) => p.status !== 'Perdu')
    .reduce((sum, p) => sum + (p.devisAmount || parseBudget(p.budget || '')), 0);

  // Devis envoyés = somme des devisAmount des projets "Devis envoyé"
  const devisTotal = allProjects
    .filter((p) => p.status === 'Devis envoyé')
    .reduce((sum, p) => sum + (p.devisAmount || parseBudget(p.budget || '')), 0);

  const gagneProjects = allProjects.filter((p) => p.status === 'Gagné');

  // Chantiers gagnés = somme des devisAmount des projets "Gagné"
  const gagneTotal = gagneProjects
    .reduce((sum, p) => sum + (p.devisAmount || parseBudget(p.budget || '')), 0);

  const tauxTransformation = allProjects.length
    ? Math.round((gagneProjects.length / allProjects.length) * 100)
    : 0;

  // Panier moyen = CA total / nombre projets actifs
  const activeProjects = allProjects.filter(
    (p) => p.status !== 'Perdu' && p.status !== 'Gagné',
  );

  const panierMoyen = activeProjects.length > 0
    ? Math.round(caTotal / activeProjects.length)
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

  const overdueCount = overdueEvents.length;
  const todayCount = todayEvents.length;

  const dossiersARelancer = overdueCount;

  const kpis = [
    { label: 'CA potentiel', value: formatAmount(caTotal), icon: Euro },
    { label: 'Devis envoyés', value: formatAmount(devisTotal), icon: Send },
    { label: 'Chantiers gagnés', value: formatAmount(gagneTotal), icon: Trophy },
    { label: 'Taux de transformation', value: `${tauxTransformation} %`, icon: Target },
    { label: 'Panier moyen', value: formatAmount(panierMoyen), icon: ShoppingCart },
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
    .filter((project) => project.status !== 'Gagné' && project.status !== 'Perdu')
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
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-start',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <button onClick={() => setActiveView('commercial')} style={{ ...navButtonStyle(activeView === 'commercial'), ...(isMobile ? { flex: 1 } : {}) }}>
            📊 Suivi commercial
          </button>

          <button onClick={() => setActiveView('calendar')} style={{ ...navButtonStyle(activeView === 'calendar'), ...(isMobile ? { flex: 1 } : {}) }}>
            📅 Calendrier
          </button>

          <button
            onClick={() => router.push('/onboarding')}
            style={{
              background: '#18181b',
              border: '1px solid #3f3f46',
              color: '#a1a1aa',
              borderRadius: '8px',
              padding: '9px 14px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              ...(isMobile ? { flex: 1 } : {}),
            }}
          >
            ⚙️ Mon profil
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
          <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: '16px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: '16px' }}>
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
      {!loading && (overdueCount > 0 || todayCount > 0) && (
        <div style={{ padding: 0, marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {overdueCount > 0 && (
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
                  {overdueCount} relance(s) en retard
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

          {todayCount > 0 && (
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
                  {todayCount} relance(s) programmée(s) aujourd'hui
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
        <div className="flex flex-col gap-6 w-full" style={{ marginBottom: '24px' }}>
          {/* ZONE 1 — Top 3 opportunités */}
          {!loading && topOpportunities.length > 0 && (
            <>
              <div className="my-2 border-t border-zinc-800" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-white">Top opportunités Kadria</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Classées par score IA — budget, urgence, complétude du dossier et délai de réponse
                  </p>
                </div>

                <span className="rounded-full border border-green-500/25 bg-green-500/[0.08] px-3 py-1 text-xs text-green-400">
                  🤖 Score IA
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topOpportunities.map((project, index) => (
                  <button
                    key={project.id}
                    onClick={() => router.push(`/dashboard-v2/projet/${project.id}`)}
                    className={`rounded-2xl border p-5 flex flex-col gap-3 text-left transition-transform duration-200 hover:-translate-y-0.5 ${
                      index === 0
                        ? 'border-green-500/25 bg-green-500/[0.02]'
                        : 'border-zinc-800 bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-green-500/20 text-green-400 text-xs rounded px-2 py-0.5 font-bold">
                        #{index + 1}
                      </span>

                      <span className="text-green-400 font-bold text-sm">
                        {opportunityScore(project)}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-white truncate">
                        {project.clientFirstName} {project.clientName}
                      </p>

                      <p className="text-sm text-zinc-400 truncate">
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
            </>
          )}

          {/* ZONE 2 — Toggles */}
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
                <div className="flex items-center gap-3">
                  <BarChart3
                    className={`h-[22px] w-[22px] shrink-0 ${openPanel === 'pipeline' ? 'text-green-400' : 'text-zinc-400'}`}
                  />

                  <div className="flex flex-col text-left">
                    <span className="text-[15px] font-bold text-white">Pipeline commerciale</span>
                    <span className="text-xs text-zinc-400">
                      {pipelineSteps.length} étapes · {allProjects.length} dossiers
                    </span>
                  </div>
                </div>

                <ChevronDown
                  className={`h-[18px] w-[18px] shrink-0 text-zinc-400 transition-transform duration-200 ${
                    openPanel === 'pipeline' ? 'rotate-180' : 'animate-bounce'
                  }`}
                />
              </button>

              <button
                onClick={() => togglePanel('chantiers')}
                className={`flex h-20 items-center justify-between gap-3 rounded-2xl border-2 px-5 transition-colors duration-200 ${
                  openPanel === 'chantiers'
                    ? 'border-green-500 bg-green-500/[0.08] shadow-[0_0_0_1px_rgba(34,197,94,0.25)]'
                    : 'border-zinc-800 bg-zinc-900 hover:border-green-500/25 hover:bg-green-500/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin
                    className={`h-[22px] w-[22px] shrink-0 ${openPanel === 'chantiers' ? 'text-green-400' : 'text-zinc-400'}`}
                  />

                  <div className="flex flex-col text-left">
                    <span className="text-[15px] font-bold text-white">Chantiers géolocalisés</span>
                    <span className="text-xs text-zinc-400">
                      Vue géographique · {sortedProjects.slice(0, 8).length} points
                    </span>
                  </div>
                </div>

                <ChevronDown
                  className={`h-[18px] w-[18px] shrink-0 text-zinc-400 transition-transform duration-200 ${
                    openPanel === 'chantiers' ? 'rotate-180' : 'animate-bounce'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ZONE 3 — Panneau accordéon */}
          <div
            className="rounded-2xl border border-zinc-800 overflow-hidden transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none"
            style={{
              maxHeight: openPanel === 'pipeline' ? '600px' : '0px',
              opacity: openPanel === 'pipeline' ? 1 : 0,
            }}
          >
            {openPanel === 'pipeline' && !loading && (
              <div className="p-6">
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
          </div>

          <div
            className="rounded-2xl border border-zinc-800 overflow-hidden transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none"
            style={{
              maxHeight: openPanel === 'chantiers' ? '600px' : '0px',
              opacity: openPanel === 'chantiers' ? 1 : 0,
            }}
          >
            {openPanel === 'chantiers' && !loading && (
              <div className="p-6">
                <h3 className="text-white font-semibold mb-3">📍 Chantiers</h3>

                <div style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #27272a' }}>
                  <ProspectsLeafletMap
                    projects={sortedProjects.slice(0, 8)}
                    onSelectProject={(projectId) => router.push(`/dashboard-v2/projet/${projectId}`)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ZONE 4 — Liste projets, pleine largeur */}
          <div className="space-y-4 w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('list')}
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
                onClick={() => setView('kanban')}
                className={`rounded-lg px-4 py-2 text-sm transition-colors duration-150 ${
                  viewMode === 'kanban'
                    ? 'bg-green-500 font-semibold text-zinc-950'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                🗂️ Kanban
              </button>
            </div>

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
            ) : viewMode === 'kanban' ? (
              <KanbanBoard projects={displayedProjects} router={router} onStatusChange={handleStatusChange} />
            ) : (
              <ProjectList projects={displayedProjects} router={router} />
            )}
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

function KanbanBoard({
  projects,
  router,
  onStatusChange,
}: {
  projects: Project[];
  router: ReturnType<typeof useRouter>;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  return (
    <div>
      <div className="flex flex-row gap-4 overflow-x-auto pb-2 [scroll-snap-type:x_mandatory] md:[scroll-snap-type:none]">
        {KANBAN_COLUMNS.map((col) => {
          const colProjects = projects.filter((p) => p.status === col.status);
          const total = colProjects.reduce((sum, p) => sum + (p.devisAmount || parseBudget(p.budget || '')), 0);
          const isGagne = col.status === 'Gagné';
          const headerColor = isGagne ? '#f59e0b' : col.color;
          const isOver = overColumn === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(col.status);
              }}
              onDragLeave={() => setOverColumn((prev) => (prev === col.status ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) onStatusChange(dragId, col.status);
                setDragId(null);
                setOverColumn(null);
              }}
              style={{ borderTop: `3px solid ${col.color}` }}
              className={`flex min-w-[260px] max-w-[300px] flex-shrink-0 flex-col rounded-2xl border bg-zinc-900 transition-colors duration-200 [scroll-snap-align:start] ${
                isOver ? 'border-green-500 bg-green-500/[0.04]' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <span className="text-sm font-bold text-white">
                  {isGagne && '🏆 '}
                  {col.label}
                </span>

                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ background: `${headerColor}26`, color: headerColor }}
                >
                  {colProjects.length}
                </span>
              </div>

              <div className="flex max-h-[calc(100vh-300px)] flex-col gap-3 overflow-y-auto p-3">
                {colProjects.length === 0 ? (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    <FolderOpen className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
                    Aucun dossier
                  </div>
                ) : (
                  colProjects.map((p) => (
                    <KanbanCard
                      key={p.id}
                      project={p}
                      router={router}
                      isDragging={dragId === p.id}
                      isGagne={isGagne}
                      onDragStart={() => setDragId(p.id)}
                      onDragEnd={() => setDragId(null)}
                    />
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

      <p className="mt-2 text-center text-xs text-zinc-500 md:hidden">← Faites défiler →</p>
    </div>
  );
}

function KanbanCard({
  project,
  router,
  isDragging,
  isGagne,
  onDragStart,
  onDragEnd,
}: {
  project: Project;
  router: ReturnType<typeof useRouter>;
  isDragging: boolean;
  isGagne: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const score = project.completenessScore || 0;
  const scoreColor = score > 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#dc2626';
  const initials = `${project.clientFirstName?.[0] || ''}${project.clientName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={() => router.push(`/dashboard-v2/projet/${project.id}`)}
      className={`cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-500/30 ${
        isGagne ? 'bg-green-500/[0.03]' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-200">
          {initials}
        </span>

        <span className="truncate text-sm font-semibold text-white">
          {project.clientFirstName} {project.clientName}
        </span>

        <StatusBadge status={project.status} />
      </div>

      <p className="mt-1.5 truncate text-xs text-zinc-400">{project.trade || project.projectType || 'Projet'}</p>

      <p className="truncate text-xs text-zinc-400">
        {project.city || '—'} · {project.budget || '—'}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: scoreColor }}>
          Score: {score}%
        </span>

        <span className="ml-auto text-xs text-zinc-500">{project.createdAt ? timeAgo(project.createdAt) : '—'}</span>
      </div>
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

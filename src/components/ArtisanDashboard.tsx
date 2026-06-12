'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { getProjects } from '@/src/lib/api';
import AuthGuard from '@/src/components/AuthGuard';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
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
import { KadriaLogoImg } from '@/src/components/KadriaLogo';
import { useDebouncedCallback } from 'use-debounce';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ProspectsLeafletMap = dynamic(
  () => import('@/src/components/ProspectsLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
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

  const logout = () => {
    router.push('/');
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1488px] items-center justify-between px-6">
          <div className="flex items-center gap-5">
            <KadriaLogoImg pro />
            <span className="hidden md:block h-6 w-px bg-zinc-800" />
            <span className="hidden md:block text-sm text-zinc-400">
              Dossiers
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400 hidden sm:block">
              {user.email}
            </span>

            <Button variant="ghost" size="icon" onClick={logout} title="Déconnexion">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1488px] px-6 py-10 space-y-8">
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-500">Kadria Pro</p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white md:text-5xl">
            Tableau de bord
          </h1>

          <p className="max-w-2xl text-base leading-7 text-zinc-400">
            Vos opportunités commerciales, vos relances et votre pipeline en un coup d'œil.
          </p>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-800 p-2">
                    <k.icon className="w-4 h-4 text-green-500" />
                  </div>

                  <span className="text-sm text-zinc-400 font-medium">
                    {k.label}
                  </span>
                </div>

                <span className="text-2xl font-bold text-white tracking-tight">
                  {k.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!loading && overdueCallbacks.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-zinc-900 p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Relances en retard
                  </h2>

                  <p className="text-sm text-zinc-400">
                    {overdueCallbacks.length} prospect(s) n'ont pas été rappelés.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setQuickFilter('overdue');
                    setStatusFilter('');
                    setTradeFilter('');
                    setSearch('');
                    setSearchInput('');
                  }}
                >
                  Voir les retards
                </Button>
              </div>
            </div>
          )}

          {!loading && todayCallbacks.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-zinc-900 p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Relances du jour
                  </h2>

                  <p className="text-sm text-zinc-400">
                    {todayCallbacks.length} relance(s) programmée(s) aujourd’hui.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setQuickFilter('today');
                    setStatusFilter('');
                    setTradeFilter('');
                    setSearch('');
                    setSearchInput('');
                  }}
                >
                  Voir les relances
                </Button>
              </div>
            </div>
          )}
        </div>

        {!loading && topOpportunities.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Top opportunités
                </h2>

                <p className="text-sm text-zinc-400">
                  Les dossiers avec le meilleur potentiel commercial.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topOpportunities.map((project, index) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/dashboard-v2/projet/${project.id}`)}
                  className="text-left rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-400">
                      Opportunité #{index + 1}
                    </span>

                    <span className="text-xs font-semibold text-green-500">
                      Score {opportunityScore(project)}
                    </span>
                  </div>

                  <p className="font-semibold text-white truncate">
                    {project.clientFirstName} {project.clientName}
                  </p>

                  <p className="text-sm text-zinc-400 truncate">
                    {project.trade || 'Projet'} · {project.city || 'Ville non renseignée'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={project.status} />

                    <Badge variant="secondary" className="text-[10px]">
                      {project.budget || 'Budget non renseigné'}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Pipeline commercial
                </h2>

                <p className="text-sm text-zinc-400">
                  Vue synthétique de l’avancement des dossiers.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              {pipelineSteps.map((step, index) => (
                <div key={step.label} className="relative flex items-center justify-between md:justify-start gap-4">
                  <div>
                    <p className="text-xs text-zinc-400 uppercase tracking-wide">
                      {step.label}
                    </p>

                    <p className="text-2xl font-bold text-white mt-1">
                      {step.value}
                    </p>
                  </div>

                  {index < pipelineSteps.length - 1 && (
                    <span className="hidden md:block text-zinc-600">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <ProspectsMap projects={sortedProjects} router={router} />
        )}

        <section className="space-y-4">
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
        </section>
      </main>
    </div>
  );
}

function ProspectsMap({
  projects,
  router,
}: {
  projects: Project[];
  router: ReturnType<typeof useRouter>;
}) {
  const mappedProjects = projects.slice(0, 8);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-green-500" />

            <h2 className="text-lg font-semibold text-white">
              Chantiers autour de vous
            </h2>
          </div>

          <p className="mt-2 text-sm text-zinc-400">
            Vue géographique simplifiée des prospects qualifiés.
          </p>
        </div>

        <Badge variant="secondary">
          {mappedProjects.length} point(s)
        </Badge>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,0.95fr)]">
        <div className="h-full min-h-[420px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <ProspectsLeafletMap
            projects={mappedProjects}
            onSelectProject={(projectId) => router.push(`/dashboard-v2/projet/${projectId}`)}
          />
        </div>

        <div className="space-y-2">
          {mappedProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/dashboard-v2/projet/${project.id}`)}
              className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800"
            >
              <div className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">📍</span>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {project.clientFirstName} {project.clientName}
                  </p>

                  <p className="text-xs text-zinc-400 truncate">
                    {project.trade || 'Projet'} · {project.city || 'Ville inconnue'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
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
    <div className="space-y-2">
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs text-zinc-400 uppercase tracking-wide font-medium border-b border-zinc-800">
        <span className="col-span-1">Réf</span>
        <span className="col-span-1">Date</span>
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
          className="rounded-xl border-b border-zinc-800/50 bg-zinc-900 px-4 py-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
          onClick={() => router.push(`/dashboard-v2/projet/${p.id}`)}
        >
          <div className="hidden md:grid grid-cols-12 gap-4 items-center text-sm">
            <span className="col-span-1 text-zinc-500 font-mono text-xs">
              {String(p.id).slice(0, 6)}
            </span>

            <span className="col-span-1 text-zinc-400 text-xs">
              {p.createdAt
                ? format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: fr })
                : '—'}
            </span>

            <span className="col-span-2 flex items-center gap-2 font-medium text-white truncate">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-300">
                {`${p.clientFirstName?.[0] || ''}${p.clientName?.[0] || ''}`.toUpperCase() || '?'}
              </span>
              {p.clientFirstName} {p.clientName}
            </span>

            <span className="col-span-2 text-zinc-400 truncate">
              {p.trade || '—'}
            </span>

            <span className="col-span-2 text-zinc-400 truncate">
              {p.city || '—'}
            </span>

            <span className="col-span-1 text-xs text-zinc-400">
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-300">
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
  const opt = STATUS_OPTIONS.find((o) => o.value === status);

  return (
    <Badge
      variant="secondary"
      className={`text-[10px] ${opt?.cls || 'bg-zinc-800 text-zinc-200'}`}
    >
      {status || 'Inconnu'}
    </Badge>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <span className={`text-xs ${score >= 80 ? 'font-semibold text-green-400' : 'text-zinc-400'}`}>
      {score}%
    </span>
  );
}

export { STATUS_OPTIONS, StatusBadge, ScorePill };

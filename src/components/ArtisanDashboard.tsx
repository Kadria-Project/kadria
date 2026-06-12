'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { getProjects, getStats } from '@/src/lib/api';
import AuthGuard from '@/src/components/AuthGuard';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
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
  Clock,
  Send,
  Trophy,
  ChevronRight,
  LogOut,
  Euro,
  Target,
  AlertCircle,
  ShoppingCart,
  Shield,
  MapPin,
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

type GetStatsOutputType = any;

type Project = GetProjectsOutputType['projects'][0];

const STATUS_OPTIONS = [
  { value: 'Nouveau', label: 'Nouveau', cls: 'status-new' },
  { value: 'À rappeler', label: 'À rappeler', cls: 'status-callback' },
  { value: 'Qualifié', label: 'Qualifié', cls: 'status-qualified' },
  { value: 'En cours', label: 'En cours', cls: 'bg-accent text-accent-foreground' },
  { value: 'Devis envoyé', label: 'Devis envoyé', cls: 'status-quote' },
  { value: 'Gagné', label: 'Gagné', cls: 'status-won' },
  { value: 'Perdu', label: 'Perdu', cls: 'status-lost' },
];

export default function ArtisanDashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}

function fmt(n?: number): string {
  return (n ?? 0).toLocaleString('fr-FR') + ' €';
}

function budgetPriority(budget?: string): number {
  const value = String(budget || '').toLowerCase();

  if (value.includes('plus de 20')) return 6;
  if (value.includes('10 000') && value.includes('20 000')) return 5;
  if (value.includes('5 000') && value.includes('10 000')) return 4;
  if (value.includes('3 000') && value.includes('5 000')) return 3;
  if (value.includes('1 000') && value.includes('3 000')) return 2;
  if (value.includes('moins de 1')) return 1;

  return 0;
}

function commercialScore(project: Project): number {
  return budgetPriority(project.budget) * 50 + (project.completenessScore || 0);
}

function Dashboard() {
  const router = useRouter();

  const user = {
    email: 'demo@kadria.local',
    name: 'Artisan Demo',
    role: 'User',
  };

  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<GetStatsOutputType | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<'today' | 'overdue' | null>(null);

  const logout = () => {
    router.push('/');
  };

  const loadData = useCallback(async (s?: string) => {
    try {
      const [projRes, statsRes] = await Promise.all([
        getProjects({
          status: statusFilter || undefined,
          trade: tradeFilter || undefined,
          search: s || search || undefined,
        }),
        getStats(),
      ]);

      const sorted = [...projRes.projects].sort((a, b) => {
        const statusPriority = (p: Project) =>
          p.status === 'À rappeler' ? 3 :
          p.status === 'Nouveau' ? 2 :
          p.status === 'Qualifié' ? 1 :
          0;

        const priorityA =
          statusPriority(a) * 1000 +
          budgetPriority(a.budget) * 100 +
          (a.completenessScore || 0);

        const priorityB =
          statusPriority(b) * 1000 +
          budgetPriority(b.budget) * 100 +
          (b.completenessScore || 0);

        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }

        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return db - da;
      });

      setProjects(sorted);
      setStats(statsRes);
    } catch (error) {
      console.error('LOAD_DASHBOARD_ERROR', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tradeFilter, search]);

  useEffect(() => {
    loadData();
  }, [statusFilter, tradeFilter, loadData]);

  const debouncedSearch = useDebouncedCallback((val: string) => {
    setQuickFilter(null);
    loadData(val);
  }, 400);

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const todayCallbacks = projects.filter((project) => {
    if (!project.callbackDate) return false;

    const callbackKey = String(project.callbackDate).slice(0, 10);

    return callbackKey === todayKey;
  });

  const overdueCallbacks = projects.filter((project) => {
    if (!project.callbackDate) return false;
    if (project.status === 'Gagné' || project.status === 'Perdu') return false;

    const callbackKey = String(project.callbackDate).slice(0, 10);

    return callbackKey < todayKey;
  });

  const topOpportunities = [...projects]
    .filter((project) => project.status !== 'Perdu' && project.status !== 'Gagné')
    .sort((a, b) => commercialScore(b) - commercialScore(a))
    .slice(0, 3);

  const displayedProjects =
    quickFilter === 'today'
      ? todayCallbacks
      : quickFilter === 'overdue'
        ? overdueCallbacks
        : projects;

  const resetFilters = () => {
    setStatusFilter('');
    setTradeFilter('');
    setSearch('');
    setQuickFilter(null);
  };

  return (
    <div className="min-h-screen bg-background dashboard-shell">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0a0b0f]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1488px] items-center justify-between px-6">
          <div className="flex items-center gap-5">
            <KadriaLogoImg pro />
            <span className="hidden md:block h-6 w-px bg-border" />
            <span className="hidden md:block text-sm text-muted-foreground">
              Dossiers
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>

            {user.role === 'Admin' && (
              <Button variant="outline" size="sm" onClick={() => router.push('/admin')}>
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Admin
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={logout} title="Déconnexion">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1488px] px-6 py-10 space-y-8">
        <section className="space-y-4">
          <p className="text-xs text-primary font-semibold uppercase tracking-[0.18em]">Kadria Pro</p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Tableau de bord
          </h1>

          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Vos opportunités commerciales, vos relances et votre pipeline en un coup d'œil.
          </p>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : stats && (
          <FinancialKPIs stats={stats} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!loading && overdueCallbacks.length > 0 && (
            <Card className="p-5 overdue-card">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    Relances en retard
                  </h2>

                  <p className="text-sm text-muted-foreground">
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
                  }}
                >
                  Voir les retards
                </Button>
              </div>
            </Card>
          )}

          {!loading && todayCallbacks.length > 0 && (
            <Card className="p-5 reminder-card">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    Relances du jour
                  </h2>

                  <p className="text-sm text-muted-foreground">
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
                  }}
                >
                  Voir les relances
                </Button>
              </div>
            </Card>
          )}
        </div>

        {!loading && topOpportunities.length > 0 && (
          <Card className="p-5 card-premium">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Top opportunités
                </h2>

                <p className="text-sm text-muted-foreground">
                  Les dossiers avec le meilleur potentiel commercial.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topOpportunities.map((project, index) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/pro/projet/${project.id}`)}
                  className="top-opportunity text-left rounded-xl border border-border p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">
                      Opportunité #{index + 1}
                    </span>

                    <span className="text-xs font-semibold text-primary">
                      Score {commercialScore(project)}
                    </span>
                  </div>

                  <p className="font-semibold truncate">
                    {project.clientFirstName} {project.clientName}
                  </p>

                  <p className="text-sm text-muted-foreground truncate">
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
          </Card>
        )}

        {!loading && stats && (
          <CommercialFunnel stats={stats} />
        )}

        {!loading && displayedProjects.length > 0 && (
          <ProspectsMap projects={displayedProjects} router={router} />
        )}

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Rechercher un client, un projet…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
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

                {(stats?.byTrade || []).map((t: any) => (
                  <SelectItem key={t.trade} value={t.trade}>
                    {t.trade} ({t.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>

          {quickFilter && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Filtre actif :{' '}
                <span className="text-foreground font-medium">
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
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : displayedProjects.length === 0 ? (
            <Card className="p-16 text-center">
              <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun dossier trouvé</p>
            </Card>
          ) : (
            <ProjectList projects={displayedProjects} router={router} />
          )}
        </section>
      </main>
    </div>
  );
}

function FinancialKPIs({ stats }: { stats: GetStatsOutputType }) {
  const kpis = [
    { label: 'CA potentiel', value: fmt(stats.montantRecuCeMois), icon: Euro, accent: true },
    { label: 'Devis envoyés', value: fmt(stats.montantDevisEnvoyes), icon: Send, accent: false },
    { label: 'Chantiers gagnés', value: fmt(stats.montantGagnes), icon: Trophy, accent: true },
    { label: 'Taux de transformation', value: `${stats.tauxTransformation} %`, icon: Target, accent: false },
    { label: 'Panier moyen', value: fmt(stats.panierMoyen), icon: ShoppingCart, accent: false },
    { label: 'Dossiers à relancer', value: String(stats.dossiersARelancer), icon: AlertCircle, accent: stats.dossiersARelancer > 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {kpis.map((k) => (
        <Card key={k.label} className="p-5 flex flex-col gap-3 kpi-card">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.accent ? 'bg-primary/10' : 'bg-muted'}`}>
              <k.icon className={`w-4 h-4 ${k.accent ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>

            <span className="text-sm text-muted-foreground font-medium">
              {k.label}
            </span>
          </div>

          <span className="text-2xl font-bold tracking-tight">
            {k.value}
          </span>
        </Card>
      ))}
    </div>
  );
}

function CommercialFunnel({ stats }: { stats: GetStatsOutputType }) {
  const steps = [
    { label: 'Nouveau', value: stats.nouveau },
    { label: 'À rappeler', value: stats.aRappeler },
    { label: 'Qualifié', value: stats.qualifie },
    { label: 'Devis envoyé', value: stats.devisEnvoye },
    { label: 'Gagné', value: stats.gagne },
  ];

  const max = Math.max(...steps.map((s) => Number(s.value || 0)), 1);

  return (
    <Card className="p-6 card-premium">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            Pipeline commercial
          </h2>

          <p className="text-sm text-muted-foreground">
            Vue synthétique de l’avancement des dossiers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {steps.map((step, index) => {
          const width = Math.max((Number(step.value || 0) / max) * 100, 8);

          return (
            <div
              key={step.label}
              className="funnel-card relative rounded-xl p-5 min-h-[118px]"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {step.label}
              </p>

              <p className="text-3xl font-bold mt-2">
                {step.value ?? 0}
              </p>

              <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${width}%` }}
                />
              </div>

              {index < steps.length - 1 && (
                <span className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
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
    <Card className="p-6 card-premium">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-primary" />

            <h2 className="text-lg font-semibold">
              Chantiers autour de vous
            </h2>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Vue géographique simplifiée des prospects qualifiés.
          </p>
        </div>

        <Badge variant="secondary">
          {mappedProjects.length} point(s)
        </Badge>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,0.95fr)]">
        <div className="h-full min-h-[420px] overflow-hidden rounded-xl border border-white/10 bg-muted/40">
          <ProspectsLeafletMap
            projects={mappedProjects}
            onSelectProject={(projectId) => router.push(`/pro/projet/${projectId}`)}
          />
        </div>

        <div className="space-y-2">
          {mappedProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/pro/projet/${project.id}`)}
              className="w-full text-left rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.05]"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />

                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {project.clientFirstName} {project.clientName}
                  </p>

                  <p className="text-xs text-muted-foreground truncate">
                    {project.trade || 'Projet'} · {project.city || 'Ville inconnue'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Card>
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
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
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
        <Card
          key={p.id}
          className="px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => router.push(`/pro/projet/${p.id}`)}
        >
          <div className="hidden md:grid grid-cols-12 gap-4 items-center text-sm">
            <span className="col-span-1 text-muted-foreground font-mono text-xs">
              #{p.projectNumber}
            </span>

            <span className="col-span-1 text-muted-foreground text-xs">
              {p.createdAt
                ? format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: fr })
                : '—'}
            </span>

            <span className="col-span-2 font-medium truncate">
              {p.clientFirstName} {p.clientName}
            </span>

            <span className="col-span-2 text-muted-foreground truncate">
              {p.trade || '—'}
            </span>

            <span className="col-span-2 text-muted-foreground truncate">
              {p.city || '—'}
            </span>

            <span className="col-span-1 text-xs">
              {p.budget || '—'}
            </span>

            <span className="col-span-1">
              <ScorePill score={p.completenessScore || 0} />
            </span>

            <span className="col-span-1">
              <StatusBadge status={p.status} />
            </span>

            <span className="col-span-1 text-right">
              <ChevronRight className="w-4 h-4 text-muted-foreground inline" />
            </span>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {p.clientFirstName} {p.clientName}
                </span>

                <StatusBadge status={p.status} />
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>#{p.projectNumber}</span>

                {p.createdAt && (
                  <span>· {format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: fr })}</span>
                )}

                {p.trade && <span>· {p.trade}</span>}
                {p.city && <span>· {p.city}</span>}
                {p.budget && <span>· {p.budget}</span>}
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status);

  return (
    <Badge
      variant="secondary"
      className={`text-[10px] ${opt?.cls || 'bg-accent text-accent-foreground'}`}
    >
      {status || 'Inconnu'}
    </Badge>
  );
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 75
      ? 'text-primary'
      : score >= 50
        ? 'text-foreground'
        : 'text-muted-foreground';

  return (
    <span className={`text-xs font-semibold ${color}`}>
      {score}%
    </span>
  );
}

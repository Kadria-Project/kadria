'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'zite-auth-sdk';
import { getUsers, GetUsersOutputType } from 'zite-endpoints-sdk';
import { getProjects, GetProjectsOutputType } from 'zite-endpoints-sdk';
import { getStats, GetStatsOutputType } from 'zite-endpoints-sdk';
import { createUser } from 'zite-endpoints-sdk';
import AuthGuard from '@/components/AuthGuard';
import AdminGuard from '@/components/AdminGuard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { KadriaLogoImg } from '@/components/KadriaLogo';
import { LogOut, Plus, Users, Shield, Wrench, Mail, FolderOpen, ChevronRight, Search, BarChart3, Target, Euro, Trophy, TrendingUp, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useDebouncedCallback } from 'use-debounce';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type User = GetUsersOutputType['users'][0];
type Project = GetProjectsOutputType['projects'][0];

const STATUS_OPTIONS = [
  { value: 'Nouveau', label: 'Nouveau', cls: 'bg-primary/15 text-primary' },
  { value: 'À rappeler', label: 'À rappeler', cls: 'bg-orange-500/15 text-orange-500' },
  { value: 'Qualifié', label: 'Qualifié', cls: 'bg-emerald-500/15 text-emerald-500' },
  { value: 'En cours', label: 'En cours', cls: 'bg-accent text-accent-foreground' },
  { value: 'Devis envoyé', label: 'Devis envoyé', cls: 'bg-violet-500/15 text-violet-500' },
  { value: 'Gagné', label: 'Gagné', cls: 'bg-primary/15 text-primary' },
  { value: 'Perdu', label: 'Perdu', cls: 'bg-destructive/15 text-destructive' },
];

export default function AdminDashboardPage() {
  return <AuthGuard><AdminGuard><AdminContent /></AdminGuard></AuthGuard>;
}

function fmt(n: number): string { return n.toLocaleString('fr-FR') + ' €'; }

function AdminContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('projects');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card sticky top-0 z-10">
        <div className="container mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KadriaLogoImg pro />
            <Badge variant="secondary" className="text-[10px] bg-destructive/15 text-destructive">Admin</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/pro')}>Dashboard</Button>
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={() => logout()} title="Déconnexion">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Administration Kadria</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue globale de tous les artisans et projets</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="projects">Tous les projets</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="users">Professionnels</TabsTrigger>
          </TabsList>
          <TabsContent value="projects"><AdminProjectsTab /></TabsContent>
          <TabsContent value="stats"><AdminStatsTab /></TabsContent>
          <TabsContent value="users"><AdminUsersTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ── Projects Tab ── */
function AdminProjectsTab() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<GetStatsOutputType | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [artisanFilter, setArtisanFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async (s?: string) => {
    try {
      const [projRes, statsRes] = await Promise.all([
        getProjects({
          status: statusFilter || undefined,
          trade: tradeFilter || undefined,
          artisanId: artisanFilter || undefined,
          city: cityFilter || undefined,
          search: s || search || undefined,
          limit: 100,
        }),
        getStats({ artisanId: artisanFilter || undefined }),
      ]);
      setProjects(projRes.projects);
      setStats(statsRes);
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter, tradeFilter, artisanFilter, cityFilter, search]);

  useEffect(() => { load(); }, [statusFilter, tradeFilter, artisanFilter, cityFilter]);
  const debouncedSearch = useDebouncedCallback((val: string) => { load(val); }, 400);

  return (
    <div className="space-y-6 mt-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher…" value={search} onChange={e => { setSearch(e.target.value); debouncedSearch(e.target.value); }} />
        </div>
        <Select value={artisanFilter} onValueChange={v => setArtisanFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Tous les artisans" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les artisans</SelectItem>
            {(stats?.artisans || []).map(a => <SelectItem key={a.artisanId} value={a.artisanId}>{a.artisanId} ({a.count})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Tous statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tradeFilter} onValueChange={v => setTradeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Tous métiers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les métiers</SelectItem>
            {(stats?.byTrade || []).map(t => <SelectItem key={t.trade} value={t.trade}>{t.trade} ({t.count})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={v => setCityFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Toutes villes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {(stats?.byCity || []).slice(0, 15).map(c => <SelectItem key={c.city} value={c.city}>{c.city} ({c.count})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary counts */}
      {!loading && stats && (
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {[
            { l: 'Total', v: stats.total },
            { l: 'Nouveaux', v: stats.nouveau },
            { l: 'Qualifiés', v: stats.qualifie },
            { l: 'Devis', v: stats.devisEnvoye },
            { l: 'Gagnés', v: stats.gagne },
            { l: 'Perdus', v: stats.perdu },
            { l: 'Taux', v: `${stats.tauxTransformation}%` },
          ].map(s => (
            <div key={s.l} className="bg-muted/40 rounded-lg p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.l}</span>
              <p className="text-lg font-bold mt-0.5">{s.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun projet trouvé</p>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <span className="col-span-1">Réf</span>
            <span className="col-span-1">Date</span>
            <span className="col-span-2">Client</span>
            <span className="col-span-1">Artisan</span>
            <span className="col-span-2">Projet</span>
            <span className="col-span-1">Ville</span>
            <span className="col-span-1">Budget</span>
            <span className="col-span-1">Score</span>
            <span className="col-span-1">Statut</span>
            <span className="col-span-1"></span>
          </div>
          {projects.map(p => (
            <Card key={p.id} className="px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/pro/projet/${p.id}`)}>
              <div className="hidden md:grid grid-cols-12 gap-3 items-center text-sm">
                <span className="col-span-1 text-muted-foreground font-mono text-xs">#{p.projectNumber}</span>
                <span className="col-span-1 text-muted-foreground text-xs">{p.createdAt ? format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: fr }) : '—'}</span>
                <span className="col-span-2 font-medium truncate">{p.clientFirstName} {p.clientName}</span>
                <span className="col-span-1 font-mono text-xs text-muted-foreground truncate">{p.artisanId || '—'}</span>
                <span className="col-span-2 text-muted-foreground truncate">{p.trade || '—'}</span>
                <span className="col-span-1 text-muted-foreground truncate text-xs">{p.city || '—'}</span>
                <span className="col-span-1 text-xs">{p.budget || '—'}</span>
                <span className="col-span-1"><span className={`text-xs font-semibold ${(p.completenessScore || 0) >= 75 ? 'text-primary' : 'text-muted-foreground'}`}>{p.completenessScore || 0}%</span></span>
                <span className="col-span-1">
                  <Badge variant="secondary" className={`text-[10px] ${STATUS_OPTIONS.find(o => o.value === p.status)?.cls || ''}`}>{p.status || '—'}</Badge>
                </span>
                <span className="col-span-1 text-right"><ChevronRight className="w-4 h-4 text-muted-foreground inline" /></span>
              </div>
              <div className="md:hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{p.clientFirstName} {p.clientName}</span>
                  <Badge variant="secondary" className={`text-[10px] ${STATUS_OPTIONS.find(o => o.value === p.status)?.cls || ''}`}>{p.status || '—'}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{p.artisanId} · {p.trade} · {p.city} · {p.budget}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Stats Tab ── */
function AdminStatsTab() {
  const [stats, setStats] = useState<GetStatsOutputType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getStats({}).then(setStats).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="space-y-3 mt-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-8 mt-4">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Projets reçus ce mois', value: fmt(stats.montantRecuCeMois), icon: Euro, accent: true },
          { label: 'Leads qualifiés', value: String(stats.leadsQualifies), icon: Target, accent: true },
          { label: 'Devis envoyés', value: fmt(stats.montantDevisEnvoyes), icon: TrendingUp, accent: false },
          { label: 'Chantiers gagnés', value: fmt(stats.montantGagnes), icon: Trophy, accent: true },
          { label: 'Taux de transformation', value: `${stats.tauxTransformation}%`, icon: Target, accent: false },
          { label: 'Panier moyen', value: fmt(stats.panierMoyen), icon: Euro, accent: false },
        ].map(k => (
          <Card key={k.label} className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.accent ? 'bg-primary/10' : 'bg-muted'}`}>
                <k.icon className={`w-4 h-4 ${k.accent ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{k.label}</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">{k.value}</span>
          </Card>
        ))}
      </div>

      {/* By Trade */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Wrench className="w-4 h-4 text-muted-foreground" />Répartition par métier</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.byTrade.map(t => (
            <div key={t.trade} className="bg-muted/40 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm">{t.trade}</span>
              <span className="text-sm font-bold">{t.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* By City */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />Répartition géographique</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.byCity.slice(0, 12).map(c => (
            <div key={c.city} className="bg-muted/40 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm truncate">{c.city}</span>
              <span className="text-sm font-bold">{c.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Monthly */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-muted-foreground" />Évolution mensuelle</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {stats.byMonth.slice(-6).map(m => (
            <div key={m.month} className="bg-muted/40 rounded-lg p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase">{m.month}</span>
              <p className="text-lg font-bold mt-0.5">{m.count}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* By Artisan */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" />Projets par artisan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.artisans.map(a => (
            <div key={a.artisanId} className="bg-muted/40 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm font-mono truncate">{a.artisanId}</span>
              <span className="text-sm font-bold">{a.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── Users Tab ── */
function AdminUsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadUsers = async () => {
    try { const res = await getUsers({}); setUsers(res.users); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-3 flex-1 mr-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{loading ? '—' : users.length}</p></div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><Wrench className="w-4 h-4 text-muted-foreground" /></div>
            <div><p className="text-xs text-muted-foreground">Artisans</p><p className="text-xl font-bold">{loading ? '—' : users.filter(u => u.role === 'Artisan').length}</p></div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><Shield className="w-4 h-4 text-muted-foreground" /></div>
            <div><p className="text-xs text-muted-foreground">Admins</p><p className="text-xl font-bold">{loading ? '—' : users.filter(u => u.role === 'Admin').length}</p></div>
          </Card>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau professionnel</DialogTitle></DialogHeader>
            <CreateUserForm onSuccess={() => { setDialogOpen(false); loadUsers(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun utilisateur</p>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <span className="col-span-3">Email</span>
            <span className="col-span-2">Nom</span>
            <span className="col-span-3">Entreprise</span>
            <span className="col-span-2">Artisan ID</span>
            <span className="col-span-2">Rôle</span>
          </div>
          {users.map(u => (
            <Card key={u.id} className="px-4 py-3">
              <div className="hidden md:grid grid-cols-12 gap-4 items-center text-sm">
                <span className="col-span-3 truncate flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />{u.email}</span>
                <span className="col-span-2 truncate">{u.firstName} {u.lastName}</span>
                <span className="col-span-3 truncate text-muted-foreground">{u.company || '—'}</span>
                <span className="col-span-2 font-mono text-xs text-muted-foreground">{u.artisanId || '—'}</span>
                <span className="col-span-2">
                  <Badge variant="secondary" className={u.role === 'Admin' ? 'bg-destructive/15 text-destructive text-[10px]' : 'bg-primary/15 text-primary text-[10px]'}>
                    {u.role || 'Artisan'}
                  </Badge>
                </span>
              </div>
              <div className="md:hidden">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{u.email}</span>
                  <Badge variant="secondary" className={u.role === 'Admin' ? 'bg-destructive/15 text-destructive text-[10px]' : 'bg-primary/15 text-primary text-[10px]'}>
                    {u.role || 'Artisan'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{u.company || '—'} · {u.artisanId || '—'}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [artisanId, setArtisanId] = useState('');
  const [role, setRole] = useState<'Artisan' | 'Admin'>('Artisan');
  const [trade, setTrade] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !company || !artisanId) return;
    setSubmitting(true);
    try {
      await createUser({ email, firstName: firstName || undefined, lastName: lastName || undefined, company, role, artisanId, trade: trade || undefined });
      toast.success('Professionnel créé avec succès.');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la création');
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Prénom</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" /></div>
        <div><Label>Nom</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" /></div>
      </div>
      <div><Label>Email *</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@example.com" /></div>
      <div><Label>Entreprise *</Label><Input required value={company} onChange={e => setCompany(e.target.value)} placeholder="Dupont Plomberie" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Artisan ID *</Label><Input required value={artisanId} onChange={e => setArtisanId(e.target.value)} placeholder="dupont-plomberie" /></div>
        <div>
          <Label>Rôle</Label>
          <Select value={role} onValueChange={v => setRole(v as 'Artisan' | 'Admin')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Artisan">Artisan</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Métier principal</Label><Input value={trade} onChange={e => setTrade(e.target.value)} placeholder="Plomberie" /></div>
      <Button type="submit" className="w-full" disabled={submitting || !email || !company || !artisanId}>
        {submitting ? 'Création…' : 'Créer le professionnel'}
      </Button>
    </form>
  );
}

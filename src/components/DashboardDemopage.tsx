'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Search, ChevronRight,
  FolderOpen, BarChart3, Target
} from 'lucide-react';
import { KadriaLogoImg } from '@/components/KadriaLogo';
import DemoProjectDetail from '@/components/demo/DemoProjectDetail';
import type { DemoProject } from '@/components/demo/demoData';
import { DEMO_PROJECTS } from '@/components/demo/demoData';

const CALENDLY_URL = 'https://calendly.com';

const STATUS_CLS: Record<string, string> = {
  'Nouveau': 'bg-primary/10 text-primary border-primary/20',
  'En cours': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'Devis envoyé': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'Gagné': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Perdu': 'bg-destructive/10 text-destructive border-destructive/20',
};

/** Load demo projects saved from demo chat conversations in localStorage */
function loadLocalDemoProjects(): DemoProject[] {
  try {
    const raw = localStorage.getItem('kadria-demo-chat-projects');
    if (!raw) return [];
    return JSON.parse(raw) as DemoProject[];
  } catch { return []; }
}

export default function DashboardDemoPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DemoProject | null>(null);
  const [localProjects, setLocalProjects] = useState<DemoProject[]>([]);

  useEffect(() => {
    setLocalProjects(loadLocalDemoProjects());
  }, []);

  const allProjects = [...localProjects, ...DEMO_PROJECTS];

  const filtered = allProjects.filter(p =>
    !search ||
    p.clientName.toLowerCase().includes(search.toLowerCase()) ||
    p.trade.toLowerCase().includes(search.toLowerCase()) ||
    p.projet.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return <DemoProjectDetail project={selected} onBack={() => setSelected(null)} />;
  }

  const stats = {
    total: allProjects.length,
    nouveau: allProjects.filter(p => p.status === 'Nouveau').length,
    scoreAvg: allProjects.length > 0 ? Math.round(allProjects.reduce((a, p) => a + p.score, 0) / allProjects.length) : 0,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center gap-3">
            <KadriaLogoImg pro />
            <div className="w-px h-5 bg-border/40 mx-2" />
            <span className="text-sm text-muted-foreground">Dossiers</span>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      <div className="border-b border-primary/20 bg-primary/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Ceci est un dashboard de démonstration</p>
            <p className="text-xs text-muted-foreground mt-0.5">Voici le type de dossiers que vous recevriez automatiquement avec Kadria.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => router.push('/demo')} className="gap-1.5 text-xs">
              <ArrowLeft className="w-3 h-3" /> Tester l'assistant
            </Button>
            <Button size="sm" onClick={() => window.open(CALENDLY_URL, '_blank')} className="gap-1.5 text-xs">
              Réserver une démo <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground mt-1">Vos opportunités commerciales en un coup d'œil</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<FolderOpen className="w-4 h-4 text-primary" />} label="Dossiers" value={String(stats.total)} />
            <StatCard icon={<Target className="w-4 h-4 text-primary" />} label="Nouveaux" value={String(stats.nouveau)} />
            <StatCard icon={<BarChart3 className="w-4 h-4 text-primary" />} label="Score moyen" value={`${stats.scoreAvg}%`} />
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher un dossier…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Project List */}
          <div className="space-y-2">
            {filtered.map(p => (
              <Card
                key={p.id}
                className="px-4 py-3.5 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelected(p)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] font-medium ${STATUS_CLS[p.status] || ''}`}>
                        {p.status}
                      </Badge>
                      <span className="font-semibold text-sm">
                        {p.trade} — {p.clientFirstName} {p.clientName}
                      </span>
                      <span className="text-xs text-primary font-semibold">{p.score}%</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">Dossier #{p.ref}</span>
                      <span>·</span>
                      <span>{p.date.split(' à ')[0]}</span>
                      <span>·</span>
                      <span>{p.budget}</span>
                      <span>·</span>
                      <span>{p.city}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

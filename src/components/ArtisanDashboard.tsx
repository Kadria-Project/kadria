'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  SearchX,
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
  ShoppingBag,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Download,
  CheckCircle,
  XCircle,
  Lock,
} from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FeatureGate, PlanProvider } from '@/src/components/FeatureGate';
import { hasFeature, normalizePlan, type PlanKey } from '@/src/lib/plans';

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

export type Project = GetProjectsOutputType['projects'][0];

const STATUS_OPTIONS = [
  { value: 'Nouveau', label: 'Nouveau', cls: 'bg-zinc-800 text-zinc-200' },
  { value: 'À rappeler', label: 'À rappeler', cls: 'bg-amber-500/20 text-amber-400' },
  { value: 'Qualifié', label: 'Qualifié', cls: 'bg-green-500/20 text-green-400' },
  { value: 'En cours', label: 'En cours', cls: 'bg-purple-500/20 text-purple-400' },
  { value: 'Devis envoyé', label: 'Devis envoyé', cls: 'bg-blue-500/20 text-blue-400' },
  { value: 'Gagné', label: 'Gagné', cls: 'bg-green-600/20 text-green-300' },
  { value: 'Perdu', label: 'Perdu', cls: 'bg-red-500/20 text-red-400' },
];

export const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  'Nouveau':      { bg: 'rgba(39,39,42,0.8)',    color: '#e4e4e7' },
  'À rappeler':   { bg: 'rgba(120,53,15,0.5)',   color: '#fbbf24' },
  'Qualifié':     { bg: 'rgba(20,83,45,0.5)',    color: '#4ade80' },
  'Devis envoyé': { bg: 'rgba(30,58,95,0.5)',    color: '#60a5fa' },
  'En cours':     { bg: 'rgba(88,28,135,0.5)',   color: '#c084fc' },
  'Gagné':        { bg: 'rgba(20,83,45,0.7)',    color: '#86efac' },
  'Perdu':        { bg: 'rgba(69,10,10,0.5)',    color: '#f87171' },
};

export default function ArtisanDashboardPage({
  plan = 'essentiel',
}: {
  plan?: PlanKey | string;
}) {
  const normalizedPlan = normalizePlan(plan);

  return (
    <AuthGuard>
      <PlanProvider plan={normalizedPlan}>
        <Dashboard plan={normalizedPlan} />
      </PlanProvider>
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

export function opportunityScore(project: Project): number {
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

export const formatAmount = (n: number) =>
  n >= 1000
    ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k €`
    : `${n} €`

export function timeAgo(dateStr: string): string {
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

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? '').replace(/"/g, '""');

  return `"${str}"`;
}

function exportToCSV(projects: Project[], filename: string) {
  const headers = [
    'Référence',
    'Date reçu',
    'Nom client',
    'Téléphone',
    'Email',
    'Adresse',
    'Projet',
    'Métier',
    'Ville',
    'Budget',
    'Score IA',
    'Statut',
    'Source',
    'Montant devis',
    'Date clôture',
  ];

  const rows = projects.map((p) => [
    p.projectNumber,
    p.createdAt ? format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: fr }) : '',
    `${p.clientFirstName || ''} ${p.clientName || ''}`.trim(),
    p.clientPhone,
    p.clientEmail,
    p.siteAddress,
    p.projectType || p.trade,
    p.trade,
    p.city,
    p.budget,
    p.completenessScore != null ? `${p.completenessScore}%` : '',
    p.status,
    p.source,
    p.devisAmount || '',
    '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(';'))
    .join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export const KANBAN_COLUMNS: { status: string; label: string; color: string }[] = [
  { status: 'Nouveau', label: 'Nouveau', color: '#3f3f46' },
  { status: 'À rappeler', label: 'À rappeler', color: '#d97706' },
  { status: 'Qualifié', label: 'Qualifié', color: '#16a34a' },
  { status: 'Devis envoyé', label: 'Devis envoyé', color: '#2563eb' },
  { status: 'Gagné', label: 'Gagné', color: '#15803d' },
];

export const METIER_OPTIONS = [
  'Plomberie',
  'Électricité',
  'Menuiserie',
  'Couverture',
  'Peinture',
  'Maçonnerie',
  'Paysagisme',
  'Rénovation',
  'Autre',
];

const BUDGET_RANGES: Record<string, [number, number]> = {
  '0-1000': [0, 1000],
  '1000-3000': [1000, 3000],
  '3000-10000': [3000, 10000],
  '10000-50000': [10000, 50000],
  '50000+': [50000, Infinity],
};

export const BUDGET_OPTIONS = [
  { value: '0-1000', label: 'Moins de 1 000€' },
  { value: '1000-3000', label: '1 000 – 3 000€' },
  { value: '3000-10000', label: '3 000 – 10 000€' },
  { value: '10000-50000', label: '10 000 – 50 000€' },
  { value: '50000+', label: 'Plus de 50 000€' },
];

export const SCORE_OPTIONS = [
  { value: 'excellent', label: 'Excellent (>80%)', color: '#22c55e' },
  { value: 'bon', label: 'Bon (60-80%)', color: '#f59e0b' },
  { value: 'faible', label: 'Faible (<60%)', color: '#dc2626' },
];

export const PERIODE_OPTIONS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '3 derniers mois' },
  { value: 'year', label: 'Cette année' },
];

export const SOURCE_OPTIONS = [
  { value: 'chat', label: 'Via chat widget' },
  { value: 'voice', label: 'Via appel vocal' },
  { value: 'manual', label: 'Ajout manuel' },
];

export type FilterState = {
  search: string;
  statut: string;
  metier: string;
  budget: string;
  score: string;
  periode: string;
  source: string;
};

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  statut: '',
  metier: '',
  budget: '',
  score: '',
  periode: '',
  source: '',
};

export function filterProjects(projects: Project[], filters: FilterState): Project[] {
  return projects.filter((p) => {
    if (filters.search) {
      const term = filters.search.toLowerCase().trim();

      const searchable = [p.clientName, p.clientFirstName, p.projectType, p.trade, p.city, p.projectNumber]
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(term)) return false;
    }

    if (filters.statut && p.status !== filters.statut) return false;

    if (filters.metier) {
      const trade = (p.trade || '').toLowerCase();

      if (!trade.includes(filters.metier.toLowerCase())) return false;
    }

    if (filters.budget) {
      const range = BUDGET_RANGES[filters.budget];
      const value = parseBudget(p.budget || '');

      if (range && (value < range[0] || value > range[1])) return false;
    }

    if (filters.score) {
      const score = p.completenessScore || 0;

      if (filters.score === 'excellent' && !(score > 80)) return false;
      if (filters.score === 'bon' && !(score >= 60 && score <= 80)) return false;
      if (filters.score === 'faible' && !(score < 60)) return false;
    }

    if (filters.periode) {
      if (!p.createdAt) return false;

      const created = new Date(p.createdAt).getTime();

      if (Number.isNaN(created)) return false;

      const dayMs = 24 * 60 * 60 * 1000;
      const nowTime = Date.now();

      if (filters.periode === 'today') {
        const todayKey = new Date().toISOString().slice(0, 10);
        if (!p.createdAt.startsWith(todayKey)) return false;
      } else if (filters.periode === '7d') {
        if (nowTime - created > 7 * dayMs) return false;
      } else if (filters.periode === '30d') {
        if (nowTime - created > 30 * dayMs) return false;
      } else if (filters.periode === '90d') {
        if (nowTime - created > 90 * dayMs) return false;
      } else if (filters.periode === 'year') {
        if (new Date(created).getFullYear() !== new Date().getFullYear()) return false;
      }
    }

    if (filters.source) {
      const src = (p.source || '').toLowerCase();

      if (filters.source === 'chat' && !src.includes('chat')) return false;
      if (filters.source === 'voice' && !(src.includes('voice') || src.includes('vocal') || src.includes('call'))) return false;
      if (filters.source === 'manual' && !(src.includes('manual') || src.includes('manuel'))) return false;
    }

    return true;
  });
}

export type KpiPeriod = '7d' | '30d' | '90d' | '1y';

const KPI_PERIOD_DAYS: Record<KpiPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

export const KPI_PERIOD_OPTIONS: { value: KpiPeriod; label: string }[] = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: 'Ce mois' },
  { value: '90d', label: '3 mois' },
  { value: '1y', label: 'Cette année' },
];

export type KpiData = {
  totalDossiers: number;
  caPotentiel: number;
  caGagne: number;
  devisTotal: number;
  tauxConversion: number;
  panierMoyen: number;
  dossiersARelancer: number;
  scoreIAMoyen: number;
  devisEnvoyes: number;
};

function filterByPeriod(projects: Project[], start: Date, end: Date): Project[] {
  return projects.filter((p) => {
    if (!p.createdAt) return false;

    const d = new Date(p.createdAt);

    return !Number.isNaN(d.getTime()) && d >= start && d <= end;
  });
}

export function computeKpis(projects: Project[]): KpiData {
  const total = projects.length;

  const caPotentiel = projects
    .filter((p) => p.status !== 'Perdu')
    .reduce((sum, p) => sum + (p.devisAmount || parseBudget(p.budget || '')), 0);

  const gagne = projects.filter((p) => p.status === 'Gagné');
  const caGagne = gagne.reduce((sum, p) => sum + (p.devisAmount || parseBudget(p.budget || '')), 0);

  const devisEnvoyesProjects = projects.filter((p) => p.status === 'Devis envoyé');
  const devisTotal = devisEnvoyesProjects.reduce((sum, p) => sum + (p.devisAmount || parseBudget(p.budget || '')), 0);

  return {
    totalDossiers: total,
    caPotentiel,
    caGagne,
    devisTotal,
    tauxConversion: total ? (gagne.length / total) * 100 : 0,
    panierMoyen: gagne.length ? caGagne / gagne.length : 0,
    dossiersARelancer: projects.filter((p) => p.status === 'À rappeler').length,
    scoreIAMoyen: total ? projects.reduce((sum, p) => sum + (p.completenessScore || 0), 0) / total : 0,
    devisEnvoyes: devisEnvoyesProjects.length,
  };
}

export function calcDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;

  return ((current - previous) / previous) * 100;
}

export function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M €`;
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k €`;

  return `${Math.round(value)} €`;
}

export function buildSparklineData(projects: Project[], period: KpiPeriod): { label: string; value: number }[] {
  const now = new Date();
  const buckets: { start: Date; end: Date; label: string }[] = [];

  const startOfDay = (d: Date) => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  };

  const endOfDay = (d: Date) => {
    const r = new Date(d);
    r.setHours(23, 59, 59, 999);
    return r;
  };

  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.push({ start: startOfDay(d), end: endOfDay(d), label: format(d, 'd MMM', { locale: fr }) });
    }
  } else if (period === '30d') {
    for (let i = 3; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);

      const start = new Date(end);
      start.setDate(start.getDate() - 6);

      buckets.push({
        start: startOfDay(start),
        end: endOfDay(end),
        label: `${format(start, 'd MMM', { locale: fr })} - ${format(end, 'd MMM', { locale: fr })}`,
      });
    }
  } else {
    const months = period === '90d' ? 3 : 12;

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      buckets.push({ start: startOfDay(start), end: endOfDay(end), label: format(monthDate, 'MMM yyyy', { locale: fr }) });
    }
  }

  return buckets.map((b) => ({
    label: b.label,
    value: projects
      .filter((p) => {
        if (!p.createdAt || p.status === 'Perdu') return false;

        const d = new Date(p.createdAt);

        return !Number.isNaN(d.getTime()) && d >= b.start && d <= b.end;
      })
      .reduce((sum, p) => sum + (p.devisAmount || parseBudget(p.budget || '')), 0),
  }));
}

function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduceMotion) {
      prevTarget.current = target;
      return;
    }

    if (prevTarget.current === target) return;

    const start = prevTarget.current;
    const startTime = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(start + (target - start) * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        prevTarget.current = target;
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduceMotion]);

  return reduceMotion ? target : value;
}

export function AnimatedKpiValue({ value, format }: { value: number; format: (v: number) => string }) {
  const animated = useCountUp(value);

  return <>{format(animated)}</>;
}

export function TrendIndicator({ delta, unit = '%' }: { delta: number; unit?: string }) {
  if (delta > 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-500">
        <TrendingUp className="w-3 h-3" />
        <span>+{delta.toFixed(1)}{unit} vs période précédente</span>
      </div>
    );
  }

  if (delta < 0) {
    return (
      <div className="flex items-center gap-1 text-xs" style={{ color: '#dc2626' }}>
        <TrendingDown className="w-3 h-3" />
        <span>{delta.toFixed(1)}{unit} vs période précédente</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-zinc-500">
      <Minus className="w-3 h-3" />
      <span>Stable vs période précédente</span>
    </div>
  );
}

export function Sparkline({ data, height = 60 }: { data: { label: string; value: number }[]; height?: number }) {
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);

  const width = 600;
  const padding = 4;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * (width - padding * 2) + padding : width / 2;
    const y = height - padding - ((d.value - min) / range) * (height - padding * 2);

    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${height} L ${points[0]?.x ?? 0} ${height} Z`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height: `${height}px` }}>
        <defs>
          <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,197,94,0.06)" />
            <stop offset="100%" stopColor="rgba(34,197,94,0)" />
          </linearGradient>
        </defs>

        {points.length > 1 && <path d={areaPath} fill="url(#sparklineGradient)" stroke="none" />}
        {points.length > 1 && <path d={linePath} fill="none" stroke="#22c55e" strokeWidth={2} />}

        {points.length > 0 && (
          <circle cx={points[0].x} cy={points[0].y} r={3} fill="#22c55e" />
        )}
        {points.length > 1 && (
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill="#22c55e" />
        )}

        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - (width / Math.max(points.length, 1)) / 2}
            y={0}
            width={width / Math.max(points.length, 1)}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHover({ index: i, x: p.x, y: p.y })}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hover && (
        <div
          className="absolute pointer-events-none rounded-lg border bg-zinc-900 px-3 py-2 text-xs"
          style={{
            borderColor: '#27272a',
            left: `${(hover.x / width) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="text-zinc-400">{data[hover.index].label}</div>
          <div className="font-semibold text-white">{formatCurrency(data[hover.index].value)}</div>
        </div>
      )}
    </div>
  );
}

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

function Dashboard({ plan }: { plan: PlanKey }) {
  const router = useRouter();
  const canAccessCalendar = hasFeature(plan, 'calendar');
  const canExportPdf = hasFeature(plan, 'pdfExports');

  const user = {
    email: 'demo@kadria.local',
    name: 'Artisan Demo',
    role: 'User',
  };

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;

    try {
      const raw = localStorage.getItem('kadria_filters');
      if (!raw) return DEFAULT_FILTERS;

      const parsed = JSON.parse(raw);
      const isExpired = !parsed.timestamp || Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000;

      if (isExpired || !parsed.filters) return DEFAULT_FILTERS;

      return { ...DEFAULT_FILTERS, ...parsed.filters };
    } catch {
      return DEFAULT_FILTERS;
    }
  });

  useEffect(() => {
    localStorage.setItem('kadria_filters', JSON.stringify({ filters, timestamp: Date.now() }));
  }, [filters]);

  const [kpiPeriod, setKpiPeriod] = useState<KpiPeriod>(() => {
    if (typeof window === 'undefined') return '30d';

    const saved = localStorage.getItem('kadria_kpi_period');

    return saved === '7d' || saved === '30d' || saved === '90d' || saved === '1y' ? saved : '30d';
  });

  const setPeriod = (period: KpiPeriod) => {
    setKpiPeriod(period);
    localStorage.setItem('kadria_kpi_period', period);
  };

  const [searchInput, setSearchInput] = useState(filters.search);
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

  useEffect(() => {
    if (activeView === 'calendar' && !canAccessCalendar) {
      setActiveView('commercial');
    }
  }, [activeView, canAccessCalendar]);

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

  const updateFilter = (key: keyof FilterState, value: string) => {
    setQuickFilter(null);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const debouncedSearch = useDebouncedCallback((val: string) => {
    updateFilter('search', val);
  }, 400);

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const now = today.getTime();

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

  const filteredProjects = useMemo(
    () => filterProjects(allProjects, filters),
    [allProjects, filters],
  );

  const sortedProjects = useMemo(
    () =>
      [...filteredProjects].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return db - da;
      }),
    [filteredProjects],
  );

  const displayedProjects =
    quickFilter === 'today'
      ? todayCallbacks
      : quickFilter === 'overdue'
        ? overdueCallbacks
        : sortedProjects;

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    setQuickFilter(null);
  };

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; error?: boolean }>({
    visible: false,
    message: '',
  });

  useEffect(() => {
    if (!exportMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

  const showToast = (message: string, error = false) => {
    setToast({ visible: true, message, error });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  const activeFilterLabels = [
    filters.search && `Recherche: ${filters.search}`,
    filters.statut && `Statut: ${filters.statut}`,
    filters.metier && `Métier: ${filters.metier}`,
    filters.budget && `Budget: ${BUDGET_OPTIONS.find((b) => b.value === filters.budget)?.label ?? filters.budget}`,
    filters.score && `Score: ${SCORE_OPTIONS.find((s) => s.value === filters.score)?.label ?? filters.score}`,
    filters.periode && `Période: ${PERIODE_OPTIONS.find((p) => p.value === filters.periode)?.label ?? filters.periode}`,
    filters.source && `Source: ${SOURCE_OPTIONS.find((s) => s.value === filters.source)?.label ?? filters.source}`,
  ].filter(Boolean) as string[];

  const handleExportCSV = () => {
    setExportMenuOpen(false);

    try {
      const dateStr = format(new Date(), 'yyyy-MM-dd');

      exportToCSV(filteredProjects, `kadria-dossiers-${dateStr}.csv`);
      showToast(`✓ Export CSV téléchargé — ${filteredProjects.length} dossiers`);
    } catch (error) {
      console.error('EXPORT_CSV_ERROR', error);
      showToast('✗ Erreur lors de l’export', true);
    }
  };

  const handleExportPDF = async (type: 'list' | 'monthly') => {
    if (!canExportPdf) {
      setExportMenuOpen(false);
      showToast('Fonction disponible avec le plan Performance', true);
      return;
    }

    setExportMenuOpen(false);
    showToast('✓ PDF en cours de génération...');

    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: type === 'monthly' ? allProjects : filteredProjects,
          type,
          filtersLabel: activeFilterLabels.join(', '),
        }),
      });

      if (!res.ok) throw new Error('Export PDF failed');

      const html = await res.text();
      const win = window.open('', '_blank');

      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch (error) {
      console.error('EXPORT_PDF_ERROR', error);
      showToast('✗ Erreur lors de l’export', true);
    }
  };

  const kpiPeriodData = useMemo(() => {
    const days = KPI_PERIOD_DAYS[kpiPeriod];

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);

    const prevEnd = new Date(start);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days);

    const periodProjects = filterByPeriod(allProjects, start, end);
    const previousProjects = filterByPeriod(allProjects, prevStart, prevEnd);

    return {
      start,
      end,
      current: computeKpis(periodProjects),
      previous: computeKpis(previousProjects),
      sparkline: buildSparklineData(periodProjects, kpiPeriod),
    };
  }, [allProjects, kpiPeriod]);

  const periodLabel = `Du ${format(kpiPeriodData.start, 'd MMMM', { locale: fr })} au ${format(kpiPeriodData.end, 'd MMMM yyyy', { locale: fr })}`;

  const kpiCards: {
    label: string;
    value: number;
    delta: number | null;
    icon: typeof Euro;
    borderColor: string;
    format: (v: number) => string;
    alert?: boolean;
  }[] = [
    {
      label: 'CA potentiel',
      value: kpiPeriodData.current.caPotentiel,
      delta: calcDelta(kpiPeriodData.current.caPotentiel, kpiPeriodData.previous.caPotentiel),
      icon: Euro,
      borderColor: '#22c55e',
      format: formatCurrency,
    },
    {
      label: 'Devis envoyés',
      value: kpiPeriodData.current.devisTotal,
      delta: calcDelta(kpiPeriodData.current.devisTotal, kpiPeriodData.previous.devisTotal),
      icon: Send,
      borderColor: '#2563eb',
      format: formatCurrency,
    },
    {
      label: 'Chantiers gagnés',
      value: kpiPeriodData.current.caGagne,
      delta: calcDelta(kpiPeriodData.current.caGagne, kpiPeriodData.previous.caGagne),
      icon: Trophy,
      borderColor: '#15803d',
      format: formatCurrency,
    },
    {
      label: 'Taux de conversion',
      value: kpiPeriodData.current.tauxConversion,
      delta: kpiPeriodData.current.tauxConversion - kpiPeriodData.previous.tauxConversion,
      icon: Target,
      borderColor: '#7c3aed',
      format: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      label: 'Panier moyen',
      value: kpiPeriodData.current.panierMoyen,
      delta: calcDelta(kpiPeriodData.current.panierMoyen, kpiPeriodData.previous.panierMoyen),
      icon: ShoppingBag,
      borderColor: '#d97706',
      format: formatCurrency,
    },
    {
      label: 'À relancer',
      value: kpiPeriodData.current.dossiersARelancer,
      delta: null,
      icon: Clock,
      borderColor: '#d97706',
      format: (v: number) => `${Math.round(v)} dossier(s)`,
      alert: kpiPeriodData.current.dossiersARelancer > 0,
    },
  ];

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
        <div style={{ flex: 1, minWidth: 0 }}>
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

          <FeatureGate feature="calendar" requiredPlan="performance" className={isMobile ? 'flex-1' : ''}>
            <button onClick={() => setActiveView('calendar')} style={{ ...navButtonStyle(activeView === 'calendar'), ...(isMobile ? { flex: 1 } : {}) }}>
              Calendrier
            </button>
          </FeatureGate>

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

      {/* Barre période */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <p className="text-sm text-zinc-400">Période analysée · {periodLabel}</p>

        <div className="flex flex-row items-center gap-2">
          {KPI_PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
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
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: '16px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />
            ))}
          </div>
        ) : (
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

                {card.delta !== null && (
                  <TrendIndicator delta={card.delta} unit={card.label === 'Taux de conversion' ? ' pts' : '%'} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sparkline CA potentiel */}
      {!loading && (
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-bold text-white">Évolution du CA potentiel</p>
              <p className="text-sm text-zinc-400">
                {kpiPeriod === '7d'
                  ? 'Sur les 7 derniers jours'
                  : kpiPeriod === '30d'
                    ? 'Sur les 30 derniers jours'
                    : kpiPeriod === '90d'
                      ? 'Sur les 3 derniers mois'
                      : 'Sur les 12 derniers mois'}
              </p>
            </div>

            <span className="rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1 text-sm text-green-500">
              {formatCurrency(kpiPeriodData.current.caPotentiel)} sur la période
            </span>
          </div>

          <div className="mt-3">
            <Sparkline data={kpiPeriodData.sparkline} height={80} />
          </div>
        </div>
      )}

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
                  setFilters(DEFAULT_FILTERS);
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
                  setFilters(DEFAULT_FILTERS);
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
        <FeatureGate feature="calendar" requiredPlan="performance">
          <div style={{ padding: '0 32px' }}>
            <Calendar artisanId="" />
          </div>
        </FeatureGate>
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
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />

                <Input
                  className="pl-9 rounded-[10px] py-2.5 focus:border-green-500"
                  placeholder="Nom, projet, ville, référence..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    debouncedSearch(e.target.value);
                  }}
                />
              </div>

              <Select value={filters.statut} onValueChange={(v) => updateFilter('statut', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>

                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} style={{ color: BADGE_STYLES[o.value]?.color }}>
                      ● {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.metier} onValueChange={(v) => updateFilter('metier', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les métiers" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Tous les métiers</SelectItem>

                  {METIER_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.budget} onValueChange={(v) => updateFilter('budget', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les budgets" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Tous les budgets</SelectItem>

                  {BUDGET_OPTIONS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.score} onValueChange={(v) => updateFilter('score', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tous les scores" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Tous les scores</SelectItem>

                  {SCORE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} style={{ color: s.color }}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.periode} onValueChange={(v) => updateFilter('periode', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Toutes les dates" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>

                  {PERIODE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.source} onValueChange={(v) => updateFilter('source', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Toutes les sources" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Toutes les sources</SelectItem>

                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
                  ? `${displayedProjects.length} dossier(s) sur ${allProjects.length} total`
                  : `${displayedProjects.length} dossier(s) trouvé(s)`}
              </p>

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

                <div className="relative" ref={exportMenuRef}>
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-[10px] border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors duration-150 hover:border-green-500/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exporter
                  </button>

                  {exportMenuOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="block w-full rounded-lg px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                      >
                        Export CSV
                        <p className="text-xs text-zinc-400">Tous les dossiers filtrés sélectionnés</p>
                      </button>

                      {canExportPdf ? (
                        <button
                          type="button"
                          onClick={() => handleExportPDF('list')}
                          className="block w-full rounded-lg px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                        >
                          Export PDF
                          <p className="text-xs text-zinc-400">Version PDF de la liste en cours</p>
                        </button>
                      ) : (
                        <FeatureGate feature="pdfExports" requiredPlan="performance" variant="menuItem">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm text-zinc-300"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium text-zinc-200">Export PDF</span>
                              <span className="block text-xs text-zinc-400">Version PDF de la liste en cours</span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-700/80 px-2 py-1 text-[11px] font-semibold text-zinc-300">
                              <Lock className="h-3 w-3 text-green-500" />
                              Performance
                            </span>
                          </button>
                        </FeatureGate>
                      )}

                      <div className="my-1 border-t border-zinc-800" />

                      {canExportPdf ? (
                        <button
                          type="button"
                          onClick={() => handleExportPDF('monthly')}
                          className="block w-full rounded-lg px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                        >
                          Rapport mensuel
                          <p className="text-xs text-zinc-400">Synthèse PDF du mois en cours</p>
                        </button>
                      ) : (
                        <FeatureGate feature="pdfExports" requiredPlan="performance" variant="menuItem">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm text-zinc-300"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium text-zinc-200">Rapport mensuel</span>
                              <span className="block text-xs text-zinc-400">Synthèse PDF du mois en cours</span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-700/80 px-2 py-1 text-[11px] font-semibold text-zinc-300">
                              <Lock className="h-3 w-3 text-green-500" />
                              Performance
                            </span>
                          </button>
                        </FeatureGate>
                      )}
                    </div>
                  )}

                  {hasActiveFilters && (
                    <p className="mt-1 text-right text-xs text-zinc-400">
                      {filteredProjects.length} dossier(s) sélectionné(s)
                    </p>
                  )}
                </div>
              </div>
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
                <SearchX className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                <p className="font-bold text-white">Aucun dossier trouvé</p>

                <p className="text-zinc-400 mt-1">
                  {filters.search
                    ? `Aucun résultat pour '${filters.search}'`
                    : filters.statut
                      ? `Aucun dossier avec le statut '${filters.statut}'`
                      : 'Essayez d’élargir vos critères de recherche'}
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-[10px] bg-green-500 px-6 py-3 text-sm font-semibold text-zinc-950"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : viewMode === 'kanban' ? (
              <KanbanBoard projects={displayedProjects} router={router} onStatusChange={handleStatusChange} />
            ) : (
              <ProjectList projects={displayedProjects} router={router} />
            )}
          </div>
        </div>
      )}

      <div
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-5 py-3.5 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-opacity duration-300 ${
          toast.visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        } ${toast.error ? 'border-red-600 bg-zinc-900 text-red-400' : 'border-green-500/30 bg-zinc-900 text-zinc-100'}`}
      >
        {toast.error ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
        {toast.message}
      </div>
    </div>
  );
}

export function ProjectList({
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

export function KanbanBoard({
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full pb-2 [scroll-snap-type:x_mandatory] md:[scroll-snap-type:none]">
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
              className={`flex min-w-0 flex-col rounded-2xl border bg-zinc-900 transition-colors duration-200 [scroll-snap-align:start] ${
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

export function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1 text-xs text-green-400">
      {label}

      <button type="button" onClick={onRemove} aria-label="Supprimer ce filtre">
        <X className="w-3 h-3" />
      </button>
    </span>
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

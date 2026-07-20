'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { getProjects, updateProject } from '@/src/lib/api';
import AuthGuard from '@/src/components/AuthGuard';
import NotificationBell from '@/src/components/notifications/NotificationBell';
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
  ChevronLeft,
  ChevronDown,
  BarChart3,
  Bell,
  AlertTriangle,
  MapPin,
  LogOut,
  Euro,
  Target,
  Clock,
  PhoneCall,
  Mail,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Download,
  CheckCircle,
  XCircle,
  Lock,
  Sparkles,
  Globe,
  Timer,
  CreditCard,
} from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { useTheme } from '@/src/hooks/useTheme';
import { ProjectResponsibleInline, type ProjectResponsibleOption } from '@/src/components/projects/ProjectResponsibleCard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FeatureGate, PlanProvider, UpgradeModal } from '@/src/components/FeatureGate';
import { hasFeature, normalizePlan, PLAN_DEFINITIONS, type PlanFeatureKey, type PlanKey } from '@/src/lib/plans';
import { formatEuro, getAnnualFullPrice, getAnnualOneShotPrice } from '@/src/config/pricing';
import { normalizeDepositStatus } from '@/src/lib/deposit';
import {
  buildAutomaticTasks,
  getHotLeadMessage,
  getOpportunityBadge,
  getProjectRiskStatus,
  isHotLead,
  type Task,
} from '@/src/lib/commercial-actions';
import { getProjectCommercialAnalysis } from '@/src/lib/project-scoring';
import { computeNextAction as computeActionEngineNextAction, computeProjectHealth, type ActionEngineProjectInput, type ActionType, type NextAction } from '@/src/lib/action-engine';
import { getProjectLifecycle, PROJECT_STATUS_OPTIONS } from '@/src/lib/project-lifecycle';
import { computeProgressRecommendations, type ProgressRecommendations } from '@/src/lib/progression-engine';
import OperationsCenterSection, { OperationsWorkbenchSections } from '@/src/components/dashboard/OperationsCenterSection';
import type { OperationsCenterResult } from '@/src/lib/recommendations';
import TrackingWorkspace from '@/src/components/workspace/tracking/TrackingWorkspace';
import TasksWorkspace from '@/src/components/workspace/tasks/TasksWorkspace';
import { useWorkspaceNavigation, type DashboardMode } from '@/src/components/workspace/WorkspaceNavigationContext';

export type { DashboardMode } from '@/src/components/workspace/WorkspaceNavigationContext';

type UsageStatus = 'ok' | 'warning' | 'limit_reached' | 'exceeded';

interface MonthlyUsageSummary {
  artisanId: string;
  periodMonth: string;
  plan: string;
  projects: {
    used: number;
    limit: number | null;
    unlimited: boolean;
    percent: number | null;
    status: UsageStatus;
  };
  vapi: {
    callsUsed: number;
    callsLimit: number | null;
    callsUnlimited: boolean;
    callsPercent: number | null;
    minutesUsed: number;
    minutesLimit: number | null;
    minutesPercent: number | null;
    status: UsageStatus;
  };
  devis: {
    used: number;
    limit: number | null;
    unlimited: boolean;
    percent: number | null;
    status: UsageStatus;
  };
  assistant?: {
    used: number;
    limit: number | null;
    percent: number | null;
    status: UsageStatus;
  };
  updatedAt?: string;
}

const MobileDashboardView = dynamic(() => import('./dashboard/MobileDashboardView'), { ssr: false });

const MobileDevisView = dynamic(() => import('./dashboard/MobileDevisView'), { ssr: false });

const MobilePipelineView = dynamic(() => import('./dashboard/MobilePipelineView'), { ssr: false });

const MobileValueReportView = dynamic(() => import('./dashboard/MobileValueReportView'), { ssr: false });

const MobileAgendaView = dynamic(() => import('./dashboard/MobileAgendaView'), { ssr: false });
const CalendarWorkspace = dynamic(() => import('./workspace/calendar/CalendarWorkspace'), { ssr: false });
const ClientsV2List = dynamic(() => import('./dashboard/ClientsV2List'), { ssr: false });
const MobileBottomNav = dynamic(
  () => import('./dashboard/MobileDashboardView').then((mod) => mod.MobileBottomNav),
  { ssr: false },
);

const ProspectsLeafletMap = dynamic(
  () => import('@/src/components/ProspectsLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
        Kadria prépare la carte...
      </div>
    ),
  },
);

type GetProjectsOutputType = {
  projects: any[];
};

export type Project = GetProjectsOutputType['projects'][0];
// Mappe un Project du dashboard vers l'input de l'Action Engine, en ne
// reprenant que des champs reellement presents sur le projet (cf.
// src/lib/action-engine.ts — "ne jamais inventer de donnees"). Aucun signal
// absent du projet (ex: rendez-vous, tradeAnswers) n'est simule ici.
function projectToActionEngineInput(p: Project): ActionEngineProjectInput {
  const devisSent = Boolean(p.quoteSentAt) || p.status === 'Devis envoyé';
  const devisAccepted = Boolean(p.acceptedAt) || p.status === 'Gagné';
  const devisExists = devisSent || devisAccepted || Boolean(p.devisAmount);
  return {
    status: p.status,
    clientName: p.clientName,
    clientFirstName: p.clientFirstName,
    clientPhone: p.clientPhone,
    clientEmail: p.clientEmail,
    trade: p.trade,
    projectType: p.projectType,
    aiSummary: p.aiSummary,
    budget: p.budget,
    desiredTimeline: p.desiredTimeline,
    city: p.city,
    siteAddress: p.siteAddress,
    photos: p.photos,
    completenessScore: p.completenessScore,
    createdAt: p.createdAt,
    lastFollowUpAt: p.lastFollowUpAt,
    latestDevis: devisExists
      ? {
          sent: devisSent,
          accepted: devisAccepted,
          declined: p.status === 'Perdu',
          sentAt: p.quoteSentAt || null,
        }
      : null,
  };
}

const ACTION_PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const ACTION_URGENCY_RANK: Record<string, number> = { overdue: 0, today: 1, soon: 2, none: 3 };
const ACTION_IMPACT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

const ACTION_TYPE_EMOJI: Record<ActionType, string> = {
  complete_qualification: '🟡',
  request_photos: '🟡',
  schedule_appointment: '🟡',
  send_quote: '🔴',
  follow_up_quote: '🟠',
  review_quote_decline: '🟠',
  schedule_intervention: '🔴',
  ask_review: '⚪',
  monitor: '⚪',
};

const ACTION_TYPE_COUNTER_LABEL: Record<ActionType, string> = {
  complete_qualification: 'Qualification à terminer',
  request_photos: 'Photos à demander',
  schedule_appointment: 'Rendez-vous à planifier',
  send_quote: 'Devis à envoyer',
  follow_up_quote: 'Relances',
  review_quote_decline: 'Devis refusés à traiter',
  schedule_intervention: 'Interventions à programmer',
  ask_review: 'Avis clients à demander',
  monitor: 'Surveillance',
};

// "Guideline commerciale" (Suivi commercial) : lecture du pipeline par etape
// (Qualifier / Chiffrer / Securiser / Realiser & fideliser). Ne recalcule
// rien - reutilise uniquement des valeurs deja calculees ailleurs
// (actionEngineCounters, depositProjects, ...).
type GuidelineFilterValue = 'critical' | 'today' | 'week' | 'deposits' | 'deposits_paid' | ActionType;

type GuidelineRow = {
  label: string;
  value: number;
  displayValue?: string;
  filterValue?: GuidelineFilterValue;
};

function GuidelineGroupCard({
  title,
  subtitle,
  rows,
  activeFilter,
  onSelect,
}: {
  title: string;
  subtitle: string;
  rows: GuidelineRow[];
  activeFilter?: GuidelineFilterValue | null;
  onSelect?: (value: GuidelineFilterValue) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <p className="font-bold text-[var(--text-1)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--text-2)]">{subtitle}</p>
      <div className="mt-3 space-y-1.5">
        {rows.map((row) => {
          const active = row.value > 0;
          const clickable = active && Boolean(row.filterValue) && Boolean(onSelect);
          const isCurrentFilter = clickable && activeFilter === row.filterValue;
          const content = (
            <>
              <span className={active ? 'text-[var(--text-1)]' : 'text-[var(--text-3)]'}>{row.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                    active ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'text-[var(--text-3)]'
                  }`}
                >
                  {row.displayValue ?? row.value}
                </span>
                {clickable && <ChevronRight className="h-3.5 w-3.5 text-[var(--text-3)]" />}
              </span>
            </>
          );

          if (clickable) {
            return (
              <button
                key={row.label}
                type="button"
                onClick={() => onSelect?.(row.filterValue!)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors sm:py-1.5 ${
                  isCurrentFilter
                    ? 'bg-[var(--accent-dim)]'
                    : 'bg-[var(--bg-hover)] hover:bg-[var(--accent-dim)]/60'
                } cursor-pointer`}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={row.label}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm ${
                active ? 'bg-[var(--bg-hover)]' : ''
              }`}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sortNextActions<T extends { action: NextAction }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const p = (ACTION_PRIORITY_RANK[a.action.priority] ?? 9) - (ACTION_PRIORITY_RANK[b.action.priority] ?? 9);
    if (p !== 0) return p;
    const u = (ACTION_URGENCY_RANK[a.action.urgency] ?? 9) - (ACTION_URGENCY_RANK[b.action.urgency] ?? 9);
    if (u !== 0) return u;
    return (ACTION_IMPACT_RANK[a.action.impact] ?? 9) - (ACTION_IMPACT_RANK[b.action.impact] ?? 9);
  });
}

function parseDurationMinutes(duration: string): number {
  const match = duration.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

const PROGRESS_CENTER_STORAGE_KEY = 'kadria-progress-center-expanded';

function getProjectRevenueAmount(project: Project): number {
  return Number(project.devisAmount) || parseBudget(project.budget || '');
}

function isDepositRelevantProject(project: Project): boolean {
  const amount = getProjectRevenueAmount(project);
  if (amount <= 0 || project.status === 'Perdu') return false;

  return project.status === 'Devis envoyé' || project.status === 'Gagné' || Boolean(project.quoteSentAt) || Boolean(project.acceptedAt);
}

type DepositPriorityAction = {
  kind: 'deposit';
  project: Project;
  title: string;
  subtitle: string;
  estimatedDuration: string;
  priorityRank: number;
  filterKey: 'deposits' | 'deposits_paid';
  icon: string;
};

const STATUS_OPTIONS = [
  { value: 'Nouveau', label: 'Nouveau', cls: 'bg-[var(--bg-hover)] text-[var(--text-1)]' },
  { value: 'À rappeler', label: 'À rappeler', cls: 'bg-amber-500/20 text-amber-400' },
  { value: 'Qualifié', label: 'Qualifié', cls: 'bg-green-500/20 text-green-400' },
  { value: 'En cours', label: 'En cours', cls: 'bg-purple-500/20 text-purple-400' },
  { value: 'Devis envoyé', label: 'Devis envoyé', cls: 'bg-blue-500/20 text-blue-400' },
  { value: 'Devis accepté', label: 'Devis accepté', cls: 'bg-emerald-500/20 text-emerald-300' },
  { value: 'Acompte demandé', label: 'Acompte demandé', cls: 'bg-cyan-500/20 text-cyan-300' },
  { value: 'Acompte payé', label: 'Acompte payé', cls: 'bg-teal-500/20 text-teal-300' },
  { value: 'Réalisation du projet', label: 'Réalisation du projet', cls: 'bg-lime-500/20 text-lime-300' },
  { value: 'En risque', label: 'En risque', cls: 'bg-red-500/20 text-red-300' },
  { value: 'A relancer', label: 'A relancer', cls: 'bg-amber-500/20 text-amber-300' },
  { value: 'Gagné', label: 'Gagné', cls: 'bg-green-600/20 text-green-300' },
  { value: 'Perdu', label: 'Perdu', cls: 'bg-red-500/20 text-red-400' },
];

export const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  'Nouveau':      { bg: 'var(--badge-new-bg)',       color: 'var(--badge-new-text)' },
  'À rappeler':   { bg: 'var(--badge-callback-bg)',  color: 'var(--badge-callback-text)' },
  'Qualifié':     { bg: 'var(--badge-qualified-bg)', color: 'var(--badge-qualified-text)' },
  'Devis envoyé': { bg: 'var(--badge-quote-bg)',     color: 'var(--badge-quote-text)' },
  'Devis accepté': { bg: 'rgba(16,185,129,0.16)', color: '#6ee7b7' },
  'Acompte demandé': { bg: 'rgba(6,182,212,0.16)', color: '#67e8f9' },
  'Acompte payé': { bg: 'rgba(20,184,166,0.16)', color: '#5eead4' },
  'Réalisation du projet': { bg: 'rgba(132,204,22,0.16)', color: '#bef264' },
  'En risque':    { bg: 'var(--badge-risk-bg)',      color: 'var(--badge-risk-text)' },
  'A relancer':   { bg: 'var(--badge-callback-bg)',  color: 'var(--badge-callback-text)' },
  'En cours':     { bg: 'var(--badge-progress-bg)',  color: 'var(--badge-progress-text)' },
  'Gagné':        { bg: 'var(--badge-won-bg)',       color: 'var(--badge-won-text)' },
  'Perdu':        { bg: 'var(--badge-lost-bg)',      color: 'var(--badge-lost-text)' },
};

function getDashboardLifecycle(project: Project) {
  return getProjectLifecycle({
    status: project.status,
    completenessScore: project.completenessScore,
    clientUpdateCount: project.clientUpdateCount,
    unreadClientActivityCount: project.clientActivity?.unreadCount,
    clientLastUpdateAt: project.clientLastUpdateAt,
    callbackDate: project.callbackDate,
    desiredTimeline: project.desiredTimeline,
    quoteSentAt: project.quoteSentAt,
    acceptedAt: project.acceptedAt,
    depositStatus: project.depositStatus,
    depositAmount: project.depositAmount,
    depositPaymentUrl: project.depositPaymentUrl,
    depositPaidAt: project.depositPaidAt,
    appointment: project.appointment?.start ? { start: project.appointment.start } : null,
    actionEngineInput: projectToActionEngineInput(project),
  });
}

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

function getProjectAnalysisFor(project: Project, artisanTrades?: string[]) {
  return getProjectCommercialAnalysis({
    status: project.status,
    clientName: project.clientName,
    clientFirstName: project.clientFirstName,
    clientPhone: project.clientPhone,
    clientEmail: project.clientEmail,
    trade: project.trade,
    projectType: project.projectType,
    budget: project.budget,
    desiredTimeline: project.desiredTimeline,
    maturity: project.maturity,
    city: project.city,
    siteAddress: project.siteAddress,
    aiSummary: project.aiSummary,
    completenessScore: project.completenessScore,
    photos: project.photos,
    source: project.source,
  }, { artisanTrades: artisanTrades ?? [] });
}

export function opportunityScore(project: Project, artisanTrades?: string[]): number {
  return getProjectAnalysisFor(project, artisanTrades).score;
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

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export function formatReceivedAt(dateLike: unknown): string {
  if (!dateLike) return 'Date inconnue';
  const date = new Date(dateLike as string);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  const diffMs = Date.now() - date.getTime();

  if (diffMs < 0) {
    return Math.abs(diffMs) <= FUTURE_TOLERANCE_MS ? 'à l\'instant' : 'Date à vérifier';
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours} h`;
  if (diffDays < 7) return `il y a ${diffDays} j`;

  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getReceivedSortTimestamp(dateLike: unknown): number {
  if (!dateLike) return 0;
  const date = new Date(dateLike as string);
  const time = date.getTime();
  if (Number.isNaN(time)) return 0;

  const diffMs = Date.now() - time;
  if (diffMs < 0 && Math.abs(diffMs) > FUTURE_TOLERANCE_MS) return 0;

  return time;
}

export function timeAgo(dateStr: string): string {
  return formatReceivedAt(dateStr);
}

// Colonne Activité (suivi commercial) : libellés courts pour les types
// d'événements client significatifs. Garde en phase avec
// SIGNIFICANT_EVENT_LABELS côté serveur (src/lib/client-events.ts) — dupliqué
// ici pour ne pas faire dépendre ce composant client d'un module qui importe
// supabaseAdmin (server-only).
const CLIENT_ACTIVITY_LABELS: Record<string, string> = {
  client_message: 'Message client',
  client_info_updated: 'Infos complétées',
  quote_accepted: 'Devis accepté',
  quote_declined: 'Devis refusé',
  appointment_scheduled: 'RDV planifié',
  appointment_updated: 'RDV mis à jour',
};

export interface ClientActivityInfo {
  unreadCount?: number;
  lastEventType?: string | null;
  lastEventAt?: string | null;
}

function ActivityCell({ activity, compact }: { activity?: ClientActivityInfo; compact?: boolean }) {
  const unreadCount = activity?.unreadCount || 0;
  const lastType = activity?.lastEventType ? CLIENT_ACTIVITY_LABELS[activity.lastEventType] || null : null;
  const lastAt = activity?.lastEventAt || null;

  if (!activity || (!unreadCount && !lastType)) {
    return <span className="text-xs text-[var(--text-3)]">Rien à signaler</span>;
  }

  if (unreadCount > 0) {
    return (
      <div className={compact ? 'flex flex-wrap items-center gap-1.5 text-xs' : 'flex flex-col gap-0.5'}>
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-bold text-green-400">
          {unreadCount} {unreadCount > 1 ? 'nouveautés' : 'à lire'}
        </span>
        {(lastType || lastAt) && (
          <span className="text-[11px] text-[var(--text-2)]">
            {[lastType, lastAt ? timeAgo(lastAt) : null].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-1.5 text-xs' : 'flex flex-col gap-0.5'}>
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)]">
        À jour
      </span>
      {(lastType || lastAt) && (
        <span className="text-[11px] text-[var(--text-3)]">
          {[lastType, lastAt ? timeAgo(lastAt) : null].filter(Boolean).join(' · ')}
        </span>
      )}
    </div>
  );
}

function ReceivedAtLabel({ dateLike, className }: { dateLike: unknown; className?: string }) {
  const label = formatReceivedAt(dateLike);
  const title = label === 'Date à vérifier' ? 'Date de réception incohérente ou future.' : undefined;
  return (
    <span className={className} title={title}>
      {label}
    </span>
  );
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
  { status: 'Nouveau', label: 'Nouveau', color: 'var(--status-new)' },
  { status: 'À rappeler', label: 'À rappeler', color: '#d97706' },
  { status: 'Qualifié', label: 'Qualifié', color: '#16a34a' },
  { status: 'Devis envoyé', label: 'Devis envoyé', color: '#2563eb' },
  { status: 'A relancer', label: 'A relancer', color: '#d97706' },
  { status: 'En risque', label: 'En risque', color: '#ef4444' },
  { status: 'Gagné', label: 'Gagné', color: '#15803d' },
];

const KANBAN_GROUPED_COLUMNS: { id: string; label: string; statuses: string[]; defaultStatus: string; color: string }[] = [
  { id: 'new', label: 'Nouveau', statuses: ['Nouveau'], defaultStatus: 'Nouveau', color: '#60a5fa' },
  { id: 'action', label: 'Action requise', statuses: ['\u00c0 rappeler', 'A relancer', 'En risque'], defaultStatus: '\u00c0 rappeler', color: '#f97316' },
  { id: 'ready', label: 'Pr\u00eat \u00e0 chiffrer', statuses: ['Qualifi\u00e9'], defaultStatus: 'Qualifi\u00e9', color: '#16a34a' },
  { id: 'quote', label: 'Devis en attente', statuses: ['Devis envoy\u00e9'], defaultStatus: 'Devis envoy\u00e9', color: '#2563eb' },
  { id: 'closed', label: 'Cl\u00f4tur\u00e9', statuses: ['Gagn\u00e9', 'Perdu'], defaultStatus: 'Gagn\u00e9', color: 'var(--text-3)' },
];

const ACTION_REQUIRED_PRIORITY: Record<string, number> = {
  'En risque': 0,
  '\u00c0 rappeler': 1,
  'A relancer': 2,
};

type CommercialClosureStatus = 'Gagné' | 'Perdu';

type CommercialClosureRequest = {
  id: string;
  status: CommercialClosureStatus;
  projectLabel: string;
};

function isCommercialClosureStatus(status: string): status is CommercialClosureStatus {
  return status === 'Gagné' || status === 'Perdu';
}

function getCommercialClosureCopy(status: CommercialClosureStatus) {
  if (status === 'Gagné') {
    return {
      title: 'Confirmer le dossier gagné',
      description: 'Ce dossier sera marqué comme gagné et sortira des opportunités commerciales en cours.',
      confirmLabel: 'Marquer gagné',
    };
  }

  return {
    title: 'Confirmer le dossier perdu',
    description: 'Ce dossier sera clôturé comme perdu et sortira des opportunités commerciales en cours.',
    confirmLabel: 'Marquer perdu',
  };
}

function resolveKanbanDropStatus(project: Project | undefined, column: (typeof KANBAN_GROUPED_COLUMNS)[number]) {
  if (project?.status && column.statuses.includes(project.status)) return project.status;
  return column.defaultStatus;
}

function sortKanbanProjects(projects: Project[], columnId: string) {
  return [...projects].sort((a, b) => {
    if (columnId === 'action') {
      const priorityA = ACTION_REQUIRED_PRIORITY[a.status || ''] ?? 99;
      const priorityB = ACTION_REQUIRED_PRIORITY[b.status || ''] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
    }

    const dateA = getReceivedSortTimestamp(a.createdAt);
    const dateB = getReceivedSortTimestamp(b.createdAt);
    return dateB - dateA;
  });
}

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
  { value: 'excellent', label: 'Excellent (>80%)', color: 'var(--accent)' },
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
  responsible: string;
};

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  statut: '',
  metier: '',
  budget: '',
  score: '',
  periode: '',
  source: '',
  responsible: '',
};

export function filterProjects(
  projects: Project[],
  filters: FilterState,
  opts: { skipStatusFilter?: boolean } = {},
): Project[] {
  return projects.filter((p) => {
    if (filters.search) {
      const term = filters.search.toLowerCase().trim();

      const searchable = [p.clientName, p.clientFirstName, p.clientEmail, p.clientPhone, p.projectType, p.trade, p.city, p.projectNumber]
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(term)) return false;
    }

    if (!opts.skipStatusFilter && filters.statut && p.status !== filters.statut) return false;

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

    if (filters.responsible) {
      if (filters.responsible === 'unassigned' && p.responsibleUserId) return false;
      if (filters.responsible !== 'unassigned' && p.responsibleUserId !== filters.responsible) return false;
    }

    return true;
  });
}

export type ClientRelationshipStatus = 'prospect' | 'active_client' | 'to_follow_up' | 'inactive' | 'lost';

export type ClientSummary = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  latestProject?: Project;
  projects: Project[];
  projectsCount: number;
  quotesSentCount: number;
  quotesAcceptedCount: number;
  wonProjectsCount: number;
  potentialRevenue: number;
  wonRevenue: number;
  relationshipStatus: ClientRelationshipStatus;
  nextActionLabel?: string;
  nextActionProject?: Project;
};

function normalizeKeyPart(value?: string): string {
  return (value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizePhone(value?: string): string {
  return (value || '').replace(/[^\d]/g, '');
}

export function getClientGroupKey(p: Project): string {
  const email = normalizeKeyPart(p.clientEmail);
  if (email) return `email:${email}`;

  const phone = normalizePhone(p.clientPhone);
  if (phone) return `phone:${phone}`;

  const name = normalizeKeyPart(`${p.clientFirstName || ''} ${p.clientName || ''}`);
  const city = normalizeKeyPart(p.city);
  if (name && city) return `namecity:${name}|${city}`;

  if (name) return `name:${name}`;

  return `id:${p.id}`;
}

function projectValueAmount(p: Project): number {
  return p.devisAmount || parseBudget(p.budget || '');
}

function isWonProject(p: Project): boolean {
  return p.status === 'Gagné' || Boolean(p.acceptedAt);
}

function isLostProject(p: Project): boolean {
  return p.status === 'Perdu';
}

function isQuoteSentProject(p: Project): boolean {
  // devisAmount seul ne signifie pas "envoyé" : un devis brouillon a aussi un
  // montant. Seul status === 'Devis envoyé' (ou quoteSentAt) prouve l'envoi réel.
  return p.status === 'Devis envoyé' || Boolean(p.quoteSentAt);
}

function isArchivedProject(p: Project): boolean {
  return p.leadStatus === 'archived';
}

function computeRelationshipStatus(projects: Project[]): ClientRelationshipStatus {
  if (projects.some((p) => isWonProject(p))) return 'active_client';

  if (
    projects.some((p) => {
      if (isWonProject(p) || isLostProject(p) || isArchivedProject(p)) return false;
      const risk = getProjectRiskStatus(p);
      return risk.status === 'followUp' || risk.status === 'atRisk' || (isQuoteSentProject(p) && !p.acceptedAt);
    })
  ) {
    return 'to_follow_up';
  }

  if (projects.length > 0 && projects.every((p) => isLostProject(p) || isArchivedProject(p))) return 'lost';

  if (projects.some((p) => !isWonProject(p) && !isLostProject(p) && !isArchivedProject(p))) return 'prospect';

  return 'inactive';
}

function computeNextAction(projects: Project[]): { label: string; project?: Project } {
  const priorityRank: Record<string, number> = { high: 0, normal: 1, low: 2, none: 3 };
  const active = [...projects]
    .filter((p) => !isWonProject(p) && !isLostProject(p) && !isArchivedProject(p))
    .map((project) => ({ project, lifecycle: getDashboardLifecycle(project) }))
    .sort((a, b) => {
      const priorityDelta =
        (priorityRank[a.lifecycle.recommendedAction.priority] ?? 9)
        - (priorityRank[b.lifecycle.recommendedAction.priority] ?? 9);
      if (priorityDelta !== 0) return priorityDelta;
      return getReceivedSortTimestamp(b.project.createdAt) - getReceivedSortTimestamp(a.project.createdAt);
    });

  const next = active.find((entry) => entry.lifecycle.recommendedAction.priority !== 'none');
  if (!next) return { label: 'Aucune action' };

  return {
    label: next.lifecycle.recommendedAction.title,
    project: next.project,
  };
}

export function groupProjectsByClient(projects: Project[]): ClientSummary[] {
  const groups = new Map<string, Project[]>();

  for (const p of projects) {
    const key = getClientGroupKey(p);
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }

  const summaries: ClientSummary[] = [];

  for (const [key, groupProjects] of groups.entries()) {
    const sorted = [...groupProjects].sort(
      (a, b) => getReceivedSortTimestamp(b.createdAt) - getReceivedSortTimestamp(a.createdAt),
    );
    const latestProject = sorted[0];

    const quotesSent = groupProjects.filter((p) => isQuoteSentProject(p));
    const quotesAccepted = groupProjects.filter((p) => isWonProject(p));
    const wonProjects = groupProjects.filter((p) => p.status === 'Gagné' || isWonProject(p));

    const potentialRevenue = groupProjects
      .filter((p) => !isWonProject(p) && !isLostProject(p))
      .reduce((sum, p) => sum + projectValueAmount(p), 0);
    const wonRevenue = groupProjects
      .filter((p) => isWonProject(p))
      .reduce((sum, p) => sum + projectValueAmount(p), 0);

    const nextAction = computeNextAction(groupProjects);

    summaries.push({
      id: key,
      name: `${latestProject.clientFirstName || ''} ${latestProject.clientName || ''}`.trim() || 'Client',
      email: latestProject.clientEmail || undefined,
      phone: latestProject.clientPhone || undefined,
      city: latestProject.city || undefined,
      latestProject,
      projects: sorted,
      projectsCount: groupProjects.length,
      quotesSentCount: quotesSent.length,
      quotesAcceptedCount: quotesAccepted.length,
      wonProjectsCount: wonProjects.length,
      potentialRevenue,
      wonRevenue,
      relationshipStatus: computeRelationshipStatus(groupProjects),
      nextActionLabel: nextAction.label,
      nextActionProject: nextAction.project,
    });
  }

  return summaries;
}

export function sortClientSummaries(clients: ClientSummary[]): ClientSummary[] {
  return [...clients].sort((a, b) => {
    const aHasAction = a.nextActionLabel && a.nextActionLabel !== 'Aucune action' ? 1 : 0;
    const bHasAction = b.nextActionLabel && b.nextActionLabel !== 'Aucune action' ? 1 : 0;
    if (aHasAction !== bHasAction) return bHasAction - aHasAction;

    const aDate = getReceivedSortTimestamp(a.latestProject?.createdAt);
    const bDate = getReceivedSortTimestamp(b.latestProject?.createdAt);
    if (aDate !== bDate) return bDate - aDate;

    return b.potentialRevenue - a.potentialRevenue;
  });
}

export const RELATION_STATUS_LABELS: Record<ClientRelationshipStatus, string> = {
  active_client: 'Client actif',
  to_follow_up: 'À relancer',
  prospect: 'Prospect',
  lost: 'Perdu',
  inactive: 'Inactif',
};

export const RELATION_STATUS_STYLES: Record<ClientRelationshipStatus, { bg: string; color: string }> = {
  active_client: { bg: 'var(--badge-won-bg)', color: 'var(--badge-won-text)' },
  to_follow_up: { bg: 'var(--badge-callback-bg)', color: 'var(--badge-callback-text)' },
  prospect: { bg: 'var(--badge-new-bg)', color: 'var(--badge-new-text)' },
  lost: { bg: 'var(--badge-lost-bg)', color: 'var(--badge-lost-text)' },
  inactive: { bg: 'var(--bg-hover)', color: 'var(--text-3)' },
};

export const RELATION_STATUS_OPTIONS: { value: ClientRelationshipStatus; label: string }[] = [
  { value: 'active_client', label: 'Client actif' },
  { value: 'to_follow_up', label: 'À relancer' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'lost', label: 'Perdu' },
  { value: 'inactive', label: 'Inactif' },
];

export type ValuePeriod = 'week' | 'month' | '30d' | 'all';

export const VALUE_PERIOD_OPTIONS: { value: ValuePeriod; label: string }[] = [
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: '30d', label: '30 derniers jours' },
  { value: 'all', label: 'Tout' },
];

export type ValueSourceFilter = 'all' | 'web' | 'voice' | 'manual' | 'other';

export const VALUE_SOURCE_FILTER_OPTIONS: { value: ValueSourceFilter; label: string }[] = [
  { value: 'all', label: 'Toutes les sources' },
  { value: 'web', label: 'Site / Widget' },
  { value: 'voice', label: 'Assistant vocal' },
  { value: 'manual', label: 'Manuel' },
  { value: 'other', label: 'Autre' },
];

export function normalizeValueSource(source?: string): ValueSourceFilter {
  const src = (source || '').toLowerCase().trim();

  if (!src) return 'other';
  if (src.includes('chat') || src.includes('widget') || src.includes('site') || src.includes('web')) return 'web';
  if (src.includes('voice') || src.includes('vapi') || src.includes('call') || src.includes('vocal')) return 'voice';
  if (src.includes('manual') || src.includes('admin') || src.includes('manuel')) return 'manual';

  return 'other';
}

export function getValuePeriodRange(period: ValuePeriod, now: Date): { start: Date; end: Date } | null {
  if (period === 'all') return null;

  const end = new Date(now);
  const start = new Date(now);

  if (period === 'week') {
    const day = start.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === '30d') {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export function getPreviousValuePeriodRange(period: ValuePeriod, now: Date): { start: Date; end: Date } | null {
  const current = getValuePeriodRange(period, now);

  if (!current) return null;

  if (period === 'week') {
    const start = new Date(current.start);
    start.setDate(start.getDate() - 7);
    const end = new Date(current.start.getTime() - 1);
    return { start, end };
  }

  if (period === 'month') {
    const start = new Date(current.start.getFullYear(), current.start.getMonth() - 1, 1);
    const end = new Date(current.start.getTime() - 1);
    return { start, end };
  }

  const start = new Date(current.start);
  start.setDate(start.getDate() - 30);
  const end = new Date(current.start.getTime() - 1);
  return { start, end };
}

export function formatValuePercentDelta(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? 'Nouveau vs période précédente' : null;

  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(0)}% vs période précédente`;
}

export function formatValueCountDelta(current: number, previous: number, unit: string): string | null {
  const delta = current - previous;

  if (delta === 0) return `Stable vs période précédente`;

  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} ${unit} vs période précédente`;
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

  // Un dossier est "gagne" si le statut l'indique, ou si son acompte est
  // paye (cas acompte active : le devis accepte seul ne suffit plus, mais
  // l'acompte paye vaut chantier securise/gagne). Sans acompte, aucun
  // changement : depositStatus reste 'not_requested' pour tous.
  const gagne = projects.filter((p) => p.status === 'Gagné' || normalizeDepositStatus(p.depositStatus) === 'paid');
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

// Picks a handful of evenly-spaced labels (first, middle points, last) from the
// sparkline data's existing `label` field so the axis stays readable without
// overcrowding it with one label per data point.
export function sampleSparklineLabels(data: { label: string; value: number }[], maxLabels = 5): string[] {
  if (data.length === 0) return [];
  if (data.length <= maxLabels) return data.map((d) => d.label);

  const indices = new Set<number>();
  const last = data.length - 1;

  for (let i = 0; i < maxLabels; i++) {
    indices.add(Math.round((i / (maxLabels - 1)) * last));
  }

  return Array.from(indices)
    .sort((a, b) => a - b)
    .map((i) => data[i].label);
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
    <div className="flex items-center gap-1 text-xs text-[var(--text-3)]">
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
        {points.length > 1 && <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} />}

        {points.length > 0 && (
          <circle cx={points[0].x} cy={points[0].y} r={3} fill="var(--accent)" />
        )}
        {points.length > 1 && (
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill="var(--accent)" />
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
          className="absolute pointer-events-none rounded-lg border bg-[var(--bg-elevated)] px-3 py-2 text-xs"
          style={{
            borderColor: 'var(--border)',
            left: `${(hover.x / width) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="text-[var(--text-2)]">{data[hover.index].label}</div>
          <div className="font-semibold text-[var(--text-1)]">{formatCurrency(data[hover.index].value)}</div>
        </div>
      )}
    </div>
  );
}

function navButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: '10px',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--bg-elevated)',
    color: active ? 'var(--bg)' : 'var(--text-1)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  };
}

function parseAccountDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateFR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function Dashboard({ plan }: { plan: PlanKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const canExportPdf = hasFeature(plan, 'pdfExports');
  const canExportMonthlyReport = hasFeature(plan, 'monthlyPdfReport');
  const canUseKanban = hasFeature(plan, 'kanbanView');
  const canUseAdvancedFilters = hasFeature(plan, 'advancedFilters');
  const canViewKpiTrends = hasFeature(plan, 'kpiTrends');
  const canViewPipeline = hasFeature(plan, 'commercialPipeline');
  const canViewGeoProjects = hasFeature(plan, 'geoProjects');
  const [upgradeFeature, setUpgradeFeature] = useState<PlanFeatureKey | null>(null);
  const canAccessFeature = (feature: PlanFeatureKey) => hasFeature(plan, feature);
  const openUpgradeModal = (feature: PlanFeatureKey) => setUpgradeFeature(feature);
  const planChangeCtaLabel = plan === 'essentiel' ? 'Mettre à niveau' : plan === 'performance' ? 'Changer d\'offre' : 'Gérer mon offre';

  const [accountStatus, setAccountStatus] = useState<{
    status: string | null;
    billingStatus: string | null;
    trialEndDate: string | null;
  } | null>(null);
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
  const [continueTrialLoading, setContinueTrialLoading] = useState(false);

  const isSubscriptionActive = accountStatus
    ? accountStatus.status?.toLowerCase() === 'actif' || accountStatus.billingStatus === 'active'
    : false;
  const isTrialActive = Boolean(
    accountStatus &&
    !isSubscriptionActive &&
    (accountStatus.status?.toLowerCase() === 'trial' || accountStatus.billingStatus === 'trialing'),
  );
  const trialEndDateObj = isTrialActive ? parseAccountDate(accountStatus?.trialEndDate ?? null) : null;
  const trialEndDateFR = trialEndDateObj ? formatDateFR(trialEndDateObj) : null;
  const trialHoursLeft = trialEndDateObj ? (trialEndDateObj.getTime() - Date.now()) / (1000 * 60 * 60) : null;
  const showTrialEndingBanner =
    isTrialActive && !trialBannerDismissed && trialHoursLeft !== null && trialHoursLeft <= 48 && trialHoursLeft > -24;

  const continueWithPerformance = async () => {
    setContinueTrialLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'performance', interval: 'monthly' }),
      });
      const data = await res.json();
      if (data?.success && data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // L'utilisateur reste sur le dashboard ; il peut réessayer via "Voir les offres".
    } finally {
      setContinueTrialLoading(false);
    }
  };

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [responsibleOptions, setResponsibleOptions] = useState<ProjectResponsibleOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [valuePeriod, setValuePeriod] = useState<ValuePeriod>('all');
  const [valueSourceFilter, setValueSourceFilter] = useState<ValueSourceFilter>('all');
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [todayLabel, setTodayLabel] = useState("Aujourd'hui");

  useEffect(() => {
    try {
      const rawFilters = localStorage.getItem('kadria_filters');
      if (rawFilters) {
        const parsed = JSON.parse(rawFilters);
        const isExpired = !parsed.timestamp || Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000;
        if (!isExpired && parsed.filters) {
          const restoredFilters = { ...DEFAULT_FILTERS, ...parsed.filters };
          setFilters(restoredFilters);
          setSearchInput(restoredFilters.search || '');
        }
      }

      const savedPeriod = localStorage.getItem('kadria_kpi_period');
      if (savedPeriod === '7d' || savedPeriod === '30d' || savedPeriod === '90d' || savedPeriod === '1y') {
        setKpiPeriod(savedPeriod);
      }

      const savedViewMode = localStorage.getItem('kadria_view_mode');
      if (savedViewMode === 'list' || savedViewMode === 'kanban') {
        setViewMode(savedViewMode);
      }

      const savedPanel = localStorage.getItem('kadria_dashboard_panels');
      if (savedPanel === 'pipeline' || savedPanel === 'chantiers') {
        setOpenPanel(savedPanel);
      }
    } catch {
      // Ignore invalid persisted dashboard preferences.
    } finally {
      setTodayLabel(
        new Date().toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      );
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    localStorage.setItem('kadria_filters', JSON.stringify({ filters, timestamp: Date.now() }));
  }, [filters, preferencesReady]);

  const [kpiPeriod, setKpiPeriod] = useState<KpiPeriod>('30d');

  const setPeriod = (period: KpiPeriod) => {
    if (!canViewKpiTrends) return;
    setKpiPeriod(period);
    localStorage.setItem('kadria_kpi_period', period);
  };

  const [searchInput, setSearchInput] = useState(filters.search);
  const [quickFilter, setQuickFilter] = useState<'today' | 'overdue' | 'hot' | 'risk' | 'priority' | 'relance' | 'opportunities' | 'calls' | 'quotes' | 'followups' | null>(null);
  const [actionEngineFilter, setActionEngineFilter] = useState<'critical' | 'today' | 'week' | 'deposits' | 'deposits_paid' | ActionType | null>(null);
  const { dashboardMode, navigate: navigateWorkspace } = useWorkspaceNavigation();
  const setDashboardMode = useCallback((mode: DashboardMode) => navigateWorkspace({ mode }), [navigateWorkspace]);
  const [overdueEvents, setOverdueEvents] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsageSummary | null>(null);
  const [monthlyUsageLoading, setMonthlyUsageLoading] = useState(true);
  const [monthlyUsageError, setMonthlyUsageError] = useState(false);
  const monthlyUsageSectionRef = useRef<HTMLDivElement>(null);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const setView = (mode: 'list' | 'kanban') => {
    if (mode === 'kanban' && !canUseKanban) return;
    setViewMode(mode);
    localStorage.setItem('kadria_view_mode', mode);
  };

  useEffect(() => {
    if (viewMode === 'kanban' && !canUseKanban) {
      setViewMode('list');
      localStorage.setItem('kadria_view_mode', 'list');
    }
  }, [canUseKanban, viewMode]);

  const [commercialClosureRequest, setCommercialClosureRequest] = useState<CommercialClosureRequest | null>(null);

  const handleStatusChange = async (
    id: string,
    newStatus: string,
    options: { skipConfirmation?: boolean; projectLabel?: string } = {},
  ) => {
    if (!options.skipConfirmation && isCommercialClosureStatus(newStatus)) {
      const project = allProjects.find((item) => item.id === id);
      const projectLabel = options.projectLabel
        || [project?.clientFirstName, project?.clientName].filter(Boolean).join(' ')
        || project?.projectType
        || 'ce dossier';
      setCommercialClosureRequest({ id, status: newStatus, projectLabel });
      return;
    }

    setAllProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));

    try {
      await updateProject(id, { status: newStatus });
    } catch (error) {
      console.error('UPDATE_PROJECT_STATUS_ERROR', error);
    }
  };

  const closeCommercialClosureModal = useCallback(() => {
    setCommercialClosureRequest(null);
  }, []);

  const confirmCommercialClosure = useCallback(async () => {
    if (!commercialClosureRequest) return;

    const { id, status } = commercialClosureRequest;
    closeCommercialClosureModal();
    await handleStatusChange(id, status, { skipConfirmation: true });
  }, [closeCommercialClosureModal, commercialClosureRequest]);

  const [openPanel, setOpenPanel] = useState<'pipeline' | 'chantiers' | null>(null);

  const togglePanel = (panel: 'pipeline' | 'chantiers') => {
    if (panel === 'pipeline' && !canAccessFeature('commercialPipeline')) {
      openUpgradeModal('commercialPipeline');
      return;
    }
    if (panel === 'chantiers' && !canAccessFeature('geoProjects')) {
      openUpgradeModal('geoProjects');
      return;
    }

    setOpenPanel((prev) => {
      const next = prev === panel ? null : panel;
      localStorage.setItem('kadria_dashboard_panels', next ?? '');
      return next;
    });
  };

  useEffect(() => {
    if ((openPanel === 'pipeline' && !canViewPipeline) || (openPanel === 'chantiers' && !canViewGeoProjects)) {
      setOpenPanel(null);
      localStorage.setItem('kadria_dashboard_panels', '');
    }
  }, [canViewGeoProjects, canViewPipeline, openPanel]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const loadData = useCallback(async () => {
    try {
      const projRes = await getProjects({});

      setAllProjects(projRes.projects || []);
      setResponsibleOptions(Array.isArray(projRes.availableResponsibles) ? projRes.availableResponsibles : []);
      setCurrentUserId(projRes.viewerContext?.currentUserId || null);

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
    let cancelled = false;

    setMonthlyUsageLoading(true);
    setMonthlyUsageError(false);

    fetch('/api/usage/monthly')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.usage) {
          setMonthlyUsage(data.usage);
        } else {
          setMonthlyUsageError(true);
        }
        if (data.success && data.account) {
          setAccountStatus(data.account);
        }
      })
      .catch(() => {
        if (!cancelled) setMonthlyUsageError(true);
      })
      .finally(() => {
        if (!cancelled) setMonthlyUsageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [onboardingIncomplete, setOnboardingIncomplete] = useState(false);
  const [artisanTrades, setArtisanTrades] = useState<string[]>([]);
  const [artisanFirstName, setArtisanFirstName] = useState('');
  // Acompte active ou non pour cet artisan : conditionne la definition de
  // "chantier gagne" (cf. isAcceptedValueProject plus bas) sans recalculer
  // l'ensemble du dashboard.
  const [artisanDepositEnabled, setArtisanDepositEnabled] = useState(false);
  const [progressRecommendations, setProgressRecommendations] = useState<ProgressRecommendations | null>(null);
  const [setupCardDismissed, setSetupCardDismissed] = useState(false);
  const [progressCenterExpanded, setProgressCenterExpanded] = useState(false);
  const [operationsCenter, setOperationsCenter] = useState<OperationsCenterResult | null>(null);
  const [operationsCenterLoadState, setOperationsCenterLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  const formattedToday = useMemo(() => {
    const raw = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(PROGRESS_CENTER_STORAGE_KEY);
      if (saved === 'true') setProgressCenterExpanded(true);
      if (saved === 'false') setProgressCenterExpanded(false);
    } catch {
      // Ignore unavailable localStorage.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PROGRESS_CENTER_STORAGE_KEY, progressCenterExpanded ? 'true' : 'false');
    } catch {
      // Ignore unavailable localStorage.
    }
  }, [progressCenterExpanded]);

  const refreshOperationsCenter = useCallback(async () => {
    setOperationsCenterLoadState('loading');
    try {
      const response = await fetch('/api/operations-center');
      const data = await response.json();
      if (!response.ok || !data.success || !data.operationsCenter) throw new Error('Operations Center indisponible');
      setOperationsCenter(data.operationsCenter);
      setOperationsCenterLoadState('ready');
    } catch {
      setOperationsCenter(null);
      setOperationsCenterLoadState('error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOperationsCenterLoadState('loading');
      try {
        const response = await fetch('/api/operations-center');
        const data = await response.json();
        if (!response.ok || !data.success || !data.operationsCenter) throw new Error('Operations Center indisponible');
        if (cancelled) return;
        setOperationsCenter(data.operationsCenter);
        setOperationsCenterLoadState('ready');
      } catch {
        if (cancelled) return;
        setOperationsCenter(null);
        setOperationsCenterLoadState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/artisan/config')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.config) {
          setOnboardingIncomplete(!data.config.onboardingCompleted);
          setArtisanTrades(Array.isArray(data.config.trades) ? data.config.trades : []);
          setArtisanFirstName(typeof data.config.firstName === 'string' ? data.config.firstName.trim() : '');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/artisan/business-profile').then((r) => r.json()).catch(() => null),
      fetch('/api/artisan/service-profiles').then((r) => r.json()).catch(() => null),
      fetch('/api/integrations/google-calendar/status').then((r) => r.json()).catch(() => null),
      fetch('/api/artisan/config').then((r) => r.json()).catch(() => null),
    ]).then(([profileRes, serviceProfilesRes, calendarRes, configRes]) => {
      if (cancelled) return;
      const row = profileRes?.success ? profileRes.profile : null;
      setProgressRecommendations(
        computeProgressRecommendations({
          businessProfile: row
            ? {
                primaryTrade: row.primary_trade,
                baseCity: row.base_city,
                interventionRadiusKm: row.intervention_radius_km,
                hourlyRateHt: row.hourly_rate_ht,
                defaultVatRate: row.default_vat_rate,
                workingDays: row.working_days,
                workStartTime: row.work_start_time,
                workEndTime: row.work_end_time,
              }
            : null,
          serviceProfiles: serviceProfilesRes?.success ? serviceProfilesRes.profiles : [],
          calendarIntegration: calendarRes?.success ? { connected: !!calendarRes.connected } : null,
          artisanConfig: configRes?.success ? configRes.config : null,
        })
      );
      setArtisanDepositEnabled(Boolean(configRes?.success && configRes.config?.depositEnabled));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    if (!canUseAdvancedFilters && (key === 'budget' || key === 'score' || key === 'periode' || key === 'source')) return;

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

  const activeProjects = useMemo(
    () => allProjects.filter((p) => p.leadStatus !== 'archived'),
    [allProjects],
  );

  // Source de verite unique pour le pilotage du dashboard : chaque projet
  // actif passe par computeNextAction / computeProjectHealth (Action Engine).
  // Aucune regle metier propre n'est recalculee ici.
  const actionEngineEntries = useMemo(
    () =>
      activeProjects
        .filter((p) => p.status !== 'Perdu' && p.status !== 'Gagné')
        .map((p) => {
          const input = projectToActionEngineInput(p);
          return { project: p, action: computeActionEngineNextAction(input), health: computeProjectHealth(input) };
        }),
    [activeProjects],
  );

  const sortedActionEngineEntries = useMemo(() => sortNextActions(actionEngineEntries), [actionEngineEntries]);

  const filteredActionEngineEntries = useMemo(() => {
    if (!actionEngineFilter) return sortedActionEngineEntries;
    if (actionEngineFilter === 'critical') return sortedActionEngineEntries.filter((e) => e.action.priority === 'critical');
    if (actionEngineFilter === 'today') return sortedActionEngineEntries.filter((e) => e.action.urgency === 'today' || e.action.urgency === 'overdue');
    if (actionEngineFilter === 'week') return sortedActionEngineEntries.filter((e) => e.action.urgency !== 'none');
    if (actionEngineFilter === 'deposits') return [];
    return sortedActionEngineEntries.filter((e) => e.action.actionType === actionEngineFilter);
  }, [sortedActionEngineEntries, actionEngineFilter]);

  const actionEngineCounters = useMemo(() => {
    const counts: Record<ActionType, number> = {
      complete_qualification: 0,
      request_photos: 0,
      schedule_appointment: 0,
      send_quote: 0,
      follow_up_quote: 0,
      review_quote_decline: 0,
      schedule_intervention: 0,
      ask_review: 0,
      monitor: 0,
    };
    actionEngineEntries.forEach(({ action }) => {
      counts[action.actionType] += 1;
    });
    return counts;
  }, [actionEngineEntries]);

  const criticalActionsCount = actionEngineEntries.filter((e) => e.action.priority === 'critical').length;
  const highActionsCount = actionEngineEntries.filter((e) => e.action.priority === 'high').length;
  const averageMaturityScore = actionEngineEntries.length > 0
    ? actionEngineEntries.reduce((sum, e) => sum + e.action.maturityScore, 0) / actionEngineEntries.length
    : null;

  const businessHealth: { label: string; color: string; emoji: string } = !actionEngineEntries.length
    ? { label: 'En attente des premiers dossiers', color: 'var(--text-2)', emoji: '⚪' }
    : criticalActionsCount > 0
      ? { label: 'Actions urgentes', color: '#dc2626', emoji: '🔴' }
      : highActionsCount >= 3 || (averageMaturityScore !== null && averageMaturityScore < 50)
        ? { label: 'À surveiller', color: '#d97706', emoji: '🟡' }
        : { label: 'En excellente santé', color: '#16a34a', emoji: '🟢' };

  const todayActionTypes: ActionType[] = ['send_quote', 'follow_up_quote', 'schedule_appointment'];
  const todayActionEntries = actionEngineEntries.filter((e) =>
    todayActionTypes.includes(e.action.actionType) && (e.action.urgency === 'today' || e.action.urgency === 'overdue'),
  );
  const todayActionsByType = todayActionTypes.reduce((acc, type) => {
    acc[type] = todayActionEntries.filter((e) => e.action.actionType === type).length;
    return acc;
  }, {} as Record<ActionType, number>);
  const todayEstimatedMinutes = todayActionEntries.reduce((sum, e) => sum + parseDurationMinutes(e.action.estimatedDuration), 0);

  const todayCallbacks = activeProjects.filter((project) => {
    if (!project.callbackDate) return false;

    const callbackKey = String(project.callbackDate).slice(0, 10);

    return callbackKey === todayKey;
  });

  const overdueCallbacks = activeProjects.filter((project) => {
    if (!project.callbackDate) return false;
    if (project.status === 'Gagné' || project.status === 'Perdu') return false;

    const callbackTime = new Date(project.callbackDate).getTime();

    return !Number.isNaN(callbackTime) && callbackTime < now;
  });

  const overdueCount = overdueEvents.length;
  const todayCount = todayEvents.length;

  const pipelineSteps = PROJECT_STATUS_OPTIONS.map((label) => ({
    label,
    value: allProjects.filter((project) => getDashboardLifecycle(project).displayStatus === label).length,
  }));

  const topOpportunities = [...activeProjects]
    .filter((project) => project.status !== 'Gagné' && project.status !== 'Perdu')
    .sort((a, b) => opportunityScore(b, artisanTrades) - opportunityScore(a, artisanTrades))
    .slice(0, 5);

  const depositProjects = useMemo(() => {
    const toAsk = activeProjects.filter((project) => {
      const depositStatus = normalizeDepositStatus(project.depositStatus);
      return isDepositRelevantProject(project) && (depositStatus === 'not_requested' || depositStatus === 'recommended');
    });
    const requested = activeProjects.filter((project) => normalizeDepositStatus(project.depositStatus) === 'requested');
    const paid = activeProjects.filter((project) => normalizeDepositStatus(project.depositStatus) === 'paid');
    const requestedAmount = requested.reduce((sum, project) => sum + Math.max(0, Number(project.depositAmount) || 0), 0);
    const paidAmount = paid.reduce((sum, project) => sum + Math.max(0, Number(project.depositAmount) || 0), 0);

    return {
      toAsk,
      requested,
      paid,
      requestedAmount,
      paidAmount,
      securedRate: requestedAmount > 0 ? (paidAmount / requestedAmount) * 100 : 0,
    };
  }, [activeProjects]);

  // Navigation Guideline commerciale -> onglet "Mes taches a faire" filtre.
  // Reutilise l'etat de filtre existant (actionEngineFilter), deja consomme
  // par priorityActionItems / mesTachesItems : aucune nouvelle architecture.
  const goToTasksFilter = (filterValue: GuidelineFilterValue) => {
    setActionEngineFilter(filterValue);
    setDashboardMode('tasks');
  };

  const actionEngineFilterLabel = (filter: typeof actionEngineFilter): string | null => {
    if (!filter) return null;
    if (filter === 'critical') return 'Actions critiques';
    if (filter === 'today') return "A traiter aujourd'hui";
    if (filter === 'week') return 'A traiter cette semaine';
    if (filter === 'deposits') return 'Acomptes a suivre';
    if (filter === 'deposits_paid') return 'Acomptes recus';
    return ACTION_TYPE_COUNTER_LABEL[filter];
  };

  // "Guideline commerciale" : regroupe les compteurs deja calcules
  // (actionEngineCounters, depositProjects) par etape du pipeline commercial.
  // Aucun recalcul de regle metier ici.
  const guidelineGroups: { title: string; subtitle: string; rows: GuidelineRow[] }[] = [
    {
      title: 'Qualifier',
      subtitle: 'Les dossiers qui manquent encore d’informations pour avancer.',
      rows: [
        { label: 'Qualification à terminer', value: actionEngineCounters.complete_qualification, filterValue: 'complete_qualification' },
        { label: 'Photos à demander', value: actionEngineCounters.request_photos, filterValue: 'request_photos' },
        { label: 'Rendez-vous à planifier', value: actionEngineCounters.schedule_appointment, filterValue: 'schedule_appointment' },
      ],
    },
    {
      title: 'Chiffrer',
      subtitle: 'Les opportunités à transformer en proposition claire.',
      rows: [
        { label: 'Devis à envoyer', value: actionEngineCounters.send_quote, filterValue: 'send_quote' },
        { label: 'Devis refusés à traiter', value: actionEngineCounters.review_quote_decline, filterValue: 'review_quote_decline' },
      ],
    },
    {
      title: 'Sécuriser',
      subtitle: 'Les dossiers à verrouiller avant intervention.',
      rows: [
        { label: 'Acomptes à demander', value: depositProjects.toAsk.length, filterValue: 'deposits' },
        { label: 'Acomptes demandés', value: depositProjects.requested.length, displayValue: formatCurrency(depositProjects.requestedAmount), filterValue: 'deposits' },
        { label: 'Acomptes reçus', value: depositProjects.paid.length, displayValue: formatCurrency(depositProjects.paidAmount), filterValue: 'deposits_paid' },
        { label: 'CA sécurisé', value: depositProjects.paidAmount, displayValue: formatCurrency(depositProjects.paidAmount), filterValue: 'deposits_paid' },
        { label: 'Taux de sécurisation', value: depositProjects.securedRate, displayValue: `${Math.round(depositProjects.securedRate)} %` },
      ],
    },
    {
      title: 'Réaliser & fidéliser',
      subtitle: 'Les actions de fin de cycle pour terminer proprement et générer de la preuve.',
      rows: [
        { label: 'Interventions à programmer', value: actionEngineCounters.schedule_intervention, filterValue: 'schedule_intervention' },
        { label: 'Avis clients à demander', value: actionEngineCounters.ask_review, filterValue: 'ask_review' },
        { label: 'Relances', value: actionEngineCounters.follow_up_quote, filterValue: 'follow_up_quote' },
      ],
    },
  ];

  const guidelineCommercialeSection = (
    <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-5">
      <p className="font-bold text-[var(--text-1)]">Guideline commerciale</p>
      <p className="mt-1 text-sm text-[var(--text-2)]">Les points à surveiller pour faire avancer vos dossiers.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {guidelineGroups.map((group) => (
          <GuidelineGroupCard
            key={group.title}
            title={group.title}
            subtitle={group.subtitle}
            rows={group.rows}
            activeFilter={actionEngineFilter}
            onSelect={goToTasksFilter}
          />
        ))}
      </div>
    </div>
  );

  const hotLeads = activeProjects.filter((project) => project.status !== 'Gagné' && project.status !== 'Perdu' && isHotLead(project));
  const riskProjects = activeProjects.filter((project) => getProjectRiskStatus(project).status !== 'none');
  const todayTasks = buildAutomaticTasks(activeProjects).filter((task) => {
    const due = new Date(task.dueDate);
    return !Number.isNaN(due.getTime()) && due <= new Date(Date.now() + 24 * 60 * 60 * 1000);
  });

  const filteredProjects = useMemo(
    () => filterProjects(dashboardMode === 'clients' ? allProjects : activeProjects, filters, { skipStatusFilter: dashboardMode === 'clients' }),
    [allProjects, activeProjects, filters, dashboardMode],
  );

  const clientSummaries = useMemo(
    () => groupProjectsByClient(filteredProjects),
    [filteredProjects],
  );

  const displayedClients = useMemo(
    () =>
      sortClientSummaries(
        filters.statut ? clientSummaries.filter((c) => c.relationshipStatus === filters.statut) : clientSummaries,
      ),
    [clientSummaries, filters.statut],
  );

  const sortedProjects = useMemo(
    () =>
      [...filteredProjects].sort((a, b) => {
        const da = getReceivedSortTimestamp(a.createdAt);
        const db = getReceivedSortTimestamp(b.createdAt);

        return db - da;
      }),
    [filteredProjects],
  );

  const geoSummary = useMemo(() => {
    const hasCoordinates = (project: Project) => {
      const latitude = Number(project.latitude);
      const longitude = Number(project.longitude);
      return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude !== 0 && longitude !== 0;
    };

    const geolocatedCount = sortedProjects.filter((project) => hasCoordinates(project)).length;
    const missingAddressCount = sortedProjects.filter((project) => !project.siteAddress && !project.city).length;
    const urgentCount = sortedProjects.filter((project) => {
      const risk = getProjectRiskStatus(project);
      return risk.status === 'followUp' || risk.status === 'atRisk' || isHotLead(project);
    }).length;
    const quotesSentCount = sortedProjects.filter((project) => isQuoteSentProject(project)).length;
    const depositsPendingCount = sortedProjects.filter((project) => {
      const depositStatus = normalizeDepositStatus(project.depositStatus);
      return isDepositRelevantProject(project) && (depositStatus === 'not_requested' || depositStatus === 'recommended' || depositStatus === 'requested');
    }).length;
    const topCities = Array.from<[string, number]>(
      sortedProjects.reduce((acc, project) => {
        const city = (project.city || '').trim();
        if (!city) return acc;
        acc.set(city, (acc.get(city) ?? 0) + 1);
        return acc;
      }, new Map<string, number>()),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      projects: sortedProjects,
      mapProjects: sortedProjects.slice(0, 8),
      geolocatedCount,
      missingAddressCount,
      urgentCount,
      quotesSentCount,
      depositsPendingCount,
      topCities,
    };
  }, [sortedProjects]);

  const priorityProjects = Array.from(
    new Map(
      [...topOpportunities, ...riskProjects, ...hotLeads]
        .filter((project) => project.id)
        .map((project) => [project.id, project]),
    ).values(),
  );

  const callsProjects = activeProjects.filter((project) =>
    todayTasks.some((task) => task.type === 'call' && task.projectId === project.id),
  );
  const quotesProjects = activeProjects.filter((project) =>
    todayTasks.some((task) => task.type === 'quote' && task.projectId === project.id),
  );
  const followupsProjects = activeProjects.filter((project) =>
    todayTasks.some((task) => (task.type === 'followUp' || task.type === 'email') && task.projectId === project.id),
  );

  const displayedProjects =
    quickFilter === 'today'
      ? todayCallbacks
      : quickFilter === 'overdue' || quickFilter === 'relance'
        ? overdueCallbacks
        : quickFilter === 'hot'
          ? hotLeads
          : quickFilter === 'risk'
            ? riskProjects
            : quickFilter === 'opportunities'
              ? topOpportunities
              : quickFilter === 'priority'
                ? priorityProjects
                : quickFilter === 'calls'
                  ? callsProjects
                  : quickFilter === 'quotes'
                    ? quotesProjects
                    : quickFilter === 'followups'
                      ? followupsProjects
                      : sortedProjects;

  const unassignedProjectsCount = useMemo(
    () => allProjects.filter((project) => !project.responsibleUserId).length,
    [allProjects],
  );
  const myProjectsCount = useMemo(
    () => (currentUserId ? allProjects.filter((project) => project.responsibleUserId === currentUserId).length : 0),
    [allProjects, currentUserId],
  );

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    setQuickFilter(null);
  };

  const applyQuickFilter = (value: typeof quickFilter) => {
    setQuickFilter(value);
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    document.getElementById('project-list-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToCommercialFilter = (value: 'calls' | 'quotes' | 'followups') => {
    setDashboardMode('commercial');
    applyQuickFilter(value);
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

  const createFollowUpTask = async (project: { id: string; clientFirstName?: string; clientName?: string }) => {
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Rappeler ${[project.clientFirstName, project.clientName].filter(Boolean).join(' ')}`.trim() || 'Rappeler le prospect',
          date: `${today}T09:00:00`,
          type: 'Rappel',
          projectId: project.id,
          notes: 'Tache creee depuis Dossiers a risque',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erreur inconnue');
      showToast('Tache ajoutee au calendrier pour aujourd\'hui');
    } catch (error) {
      console.error('CREATE_FOLLOW_UP_TASK_ERROR', error);
      showToast('Impossible de creer la tache', true);
    }
  };

  const activeFilterLabels = [
    filters.search && `Recherche: ${filters.search}`,
    filters.statut && `Statut: ${filters.statut}`,
    filters.metier && `Métier: ${filters.metier}`,
    filters.budget && `Budget: ${BUDGET_OPTIONS.find((b) => b.value === filters.budget)?.label ?? filters.budget}`,
    filters.score && `Score: ${SCORE_OPTIONS.find((s) => s.value === filters.score)?.label ?? filters.score}`,
    filters.periode && `Période: ${PERIODE_OPTIONS.find((p) => p.value === filters.periode)?.label ?? filters.periode}`,
    filters.source && `Source: ${SOURCE_OPTIONS.find((s) => s.value === filters.source)?.label ?? filters.source}`,
    filters.responsible && `Responsable: ${
      filters.responsible === 'unassigned'
        ? 'Non affectés'
        : filters.responsible === currentUserId
          ? 'Mes dossiers'
          : responsibleOptions.find((option) => option.userId === filters.responsible)?.displayName ?? filters.responsible
    }`,
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
    const feature = type === 'monthly' ? 'monthlyPdfReport' : 'pdfExports';
    if (!canAccessFeature(feature)) {
      setExportMenuOpen(false);
      openUpgradeModal(feature);
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

      if (res.status === 403) {
        openUpgradeModal(feature);
        return;
      }
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

  const taskCounts = todayTasks.reduce(
    (acc, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1;
      return acc;
    },
    {} as Record<Task['type'], number>,
  );

  const relanceCount = (taskCounts.followUp || 0) + overdueCallbacks.length + overdueEvents.length;
  const showValueOverview = dashboardMode === 'value';
  const showTasksOverview = dashboardMode === 'tasks';
  const showCommercialWorkspace = dashboardMode === 'commercial';
  const showClientsWorkspace = dashboardMode === 'clients';
  const showCalendarWorkspace = dashboardMode === 'calendar';
  const showCalendarWorkspaceDesktop = showCalendarWorkspace && !isMobile;
  const showPipelineWorkspace = dashboardMode === 'pipeline';
  const showValueReportWorkspace = dashboardMode === 'value-report';
  // Le Suivi V2 remplace le reporting commercial historique sur desktop.
  // Les blocs existants restent en place pour les parcours mobiles en attendant
  // leur propre refonte, mais ne sont plus montés sous TrackingWorkspace.
  const showLegacyCommercialOverviewDesktop = false;
  // Layout conditionnel du Suivi commercial desktop : la grande colonne
  // gauche est portee par le bloc le plus utile selon la presence ou non
  // de dossiers en risque.
  const hasRiskProjects = riskProjects.length > 0;


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
      borderColor: 'var(--accent)',
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
      label: 'À relancer',
      value: kpiPeriodData.current.dossiersARelancer,
      delta: null,
      icon: Clock,
      borderColor: '#d97706',
      format: (v: number) => `${Math.round(v)} dossier(s)`,
      alert: kpiPeriodData.current.dossiersARelancer > 0,
    },
    {
      label: 'Opportunites prioritaires',
      value: topOpportunities.length,
      delta: null,
      icon: Target,
      borderColor: 'var(--accent)',
      format: (v: number) => `${Math.round(v)} dossier(s)`,
      alert: topOpportunities.length > 0,
    },
    {
      label: 'Relances a effectuer',
      value: relanceCount,
      delta: null,
      icon: Mail,
      borderColor: '#f59e0b',
      format: (v: number) => `${Math.round(v)} relance(s)`,
      alert: relanceCount > 0,
    },
    {
      label: 'Opportunités à sécuriser',
      value: riskProjects.length,
      delta: null,
      icon: AlertTriangle,
      borderColor: '#ef4444',
      format: (v: number) => `${Math.round(v)} dossier(s)`,
      alert: riskProjects.length > 0,
    },
    {
      label: 'Prospects chauds',
      value: hotLeads.length,
      delta: null,
      icon: Bell,
      borderColor: 'var(--accent)',
      format: (v: number) => `${Math.round(v)} prospect(s)`,
      alert: hotLeads.length > 0,
    },
    {
      label: 'Acomptes à demander',
      value: depositProjects.toAsk.length,
      delta: null,
      icon: Timer,
      borderColor: '#f59e0b',
      format: (v: number) => `${Math.round(v)} dossier(s)`,
      alert: depositProjects.toAsk.length > 0,
    },
    {
      label: 'Acomptes demandés',
      value: depositProjects.requestedAmount,
      delta: null,
      icon: CreditCard,
      borderColor: '#2563eb',
      format: formatCurrency,
      alert: depositProjects.requested.length > 0,
    },
    {
      label: 'Acomptes reçus',
      value: depositProjects.paidAmount,
      delta: null,
      icon: CheckCircle,
      borderColor: '#16a34a',
      format: formatCurrency,
      alert: depositProjects.paid.length > 0,
    },
  ];

  const depositPriorityActions = useMemo<DepositPriorityAction[]>(
    () => [
      ...depositProjects.toAsk.map((project) => ({
        kind: 'deposit' as const,
        project,
        title: "Demander l'acompte",
        subtitle: [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || project.projectType || 'Dossier',
        estimatedDuration: '5 min',
        priorityRank: project.status === 'Gagné' || Boolean(project.acceptedAt) ? 88 : 72,
        filterKey: 'deposits' as const,
        icon: '🟠',
      })),
      ...depositProjects.requested.map((project) => ({
        kind: 'deposit' as const,
        project,
        title: "Suivre l'acompte",
        subtitle: "Acompte demandé, paiement en attente",
        estimatedDuration: '3 min',
        priorityRank: 82,
        filterKey: 'deposits' as const,
        icon: '🟡',
      })),
    ]
      .sort((a, b) => b.priorityRank - a.priorityRank)
      .slice(0, 8),
    [depositProjects],
  );

  // Acomptes recus : ne sont pas des actions a faire (rien a relancer), mais
  // le filtre "Acomptes recus"/"CA securise" de la Guideline doit malgre tout
  // pouvoir lister les dossiers concernes dans "Mes taches a faire".
  const paidDepositActions = useMemo<DepositPriorityAction[]>(
    () =>
      depositProjects.paid.map((project) => ({
        kind: 'deposit' as const,
        project,
        title: 'Acompte encaissé',
        subtitle: [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || project.projectType || 'Dossier',
        estimatedDuration: '2 min',
        priorityRank: 40,
        filterKey: 'deposits_paid' as const,
        icon: '🟢',
      })),
    [depositProjects],
  );

  const priorityActionItems = useMemo(() => {
    const actionEngineItems = filteredActionEngineEntries.map(({ project, action }) => ({
      kind: 'engine' as const,
      project,
      action,
      priorityRank:
        (action.priority === 'critical' ? 400 : action.priority === 'high' ? 300 : action.priority === 'medium' ? 200 : 100) +
        (action.urgency === 'overdue' ? 30 : action.urgency === 'today' ? 20 : action.urgency === 'soon' ? 10 : 0),
    }));

    if (actionEngineFilter === 'deposits') {
      return depositPriorityActions;
    }

    if (actionEngineFilter === 'deposits_paid') {
      return paidDepositActions;
    }

    return [...depositPriorityActions, ...actionEngineItems]
      .sort((a, b) => b.priorityRank - a.priorityRank)
      .slice(0, 8);
  }, [actionEngineFilter, depositPriorityActions, paidDepositActions, filteredActionEngineEntries]);

  // "Mes taches a faire" — liste unifiee : les appels (uniquement portes par
  // buildAutomaticTasks, absents de l'Action Engine) + les priorites deja
  // calculees par l'Action Engine / les acomptes (priorityActionItems),
  // sans dupliquer de logique metier.
  const callTaskItems = useMemo(
    () =>
      todayTasks
        .filter((task) => task.type === 'call')
        .map((task) => ({ kind: 'call' as const, task })),
    [todayTasks],
  );

  const mesTachesItems = useMemo(
    () => [...callTaskItems, ...priorityActionItems].slice(0, 8),
    [callTaskItems, priorityActionItems],
  );

  // Bloc reutilisable "Opportunités à sécuriser" (Suivi commercial) — memes
  // donnees/handlers que precedemment, extraits pour etre places dans la
  // grande colonne gauche du Suivi commercial tout en restant utilisables
  // tels quels dans la disposition de l'onglet "Mes taches".
  const opportunitesCard = (
    <>
      <div className="mb-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <div>
          <p className="font-bold text-[var(--text-1)]">Opportunités à sécuriser</p>
          <p className="text-sm text-[var(--text-2)]">Actions rapides recommandees.</p>
        </div>
      </div>
      <div className="space-y-3">
        {riskProjects.slice(0, 2).map((project) => {
          const risk = getProjectRiskStatus(project);
          return (
            <div key={project.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">{[project.clientFirstName, project.clientName].filter(Boolean).join(' ') || project.projectType || 'Dossier'}</p>
                  <p className="mt-1 text-xs text-red-300">Dossier en risque - {risk.reason}</p>
                </div>
                <StatusBadge status={risk.label} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => router.push(`/dashboard-v2/projet/${project.id}`)}
                  style={{
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Relancer
                </button>
                <button
                  onClick={() => createFollowUpTask(project)}
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-1)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Creer une tache
                </button>
                <button
                  onClick={() =>
                    handleStatusChange(project.id, 'Perdu', {
                      projectLabel: [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || project.projectType || 'ce dossier',
                    })
                  }
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cloturer
                </button>
              </div>
            </div>
          );
        })}
        {riskProjects.length === 0 && <p className="text-sm text-[var(--text-3)]">Aucun dossier à surveiller pour le moment.</p>}
      </div>
      {riskProjects.length > 2 && (
        <button
          onClick={() => { setQuickFilter('risk'); setFilters(DEFAULT_FILTERS); setSearchInput(''); }}
          className="mt-4 w-full rounded-lg border border-red-500/25 bg-red-500/[0.04] px-4 py-2 text-sm font-semibold text-red-300"
        >
          Voir tous les dossiers en risque
        </button>
      )}
    </>
  );

  // Carte compacte "Actions à traiter" (Suivi commercial) — reutilise
  // uniquement les compteurs deja calcules (taskCounts, actionEngineCounters,
  // depositProjects), sans dependre du filtre actionEngineFilter ni de la
  // liste complete "Mes taches a faire" (reservee a son onglet dedie).
  const actionsATraiterCounts = {
    calls: taskCounts.call || 0,
    quotes: taskCounts.quote || 0,
    followups: (taskCounts.followUp || 0) + (taskCounts.email || 0),
    appointments: actionEngineCounters.schedule_appointment || 0,
    deposits: depositProjects.toAsk.length + depositProjects.requested.length,
  };
  const actionsATraiterTotal =
    actionsATraiterCounts.calls +
    actionsATraiterCounts.quotes +
    actionsATraiterCounts.followups +
    actionsATraiterCounts.appointments +
    actionsATraiterCounts.deposits;
  const actionsATraiterParts = [
    actionsATraiterCounts.calls > 0 ? `${actionsATraiterCounts.calls} appel${actionsATraiterCounts.calls > 1 ? 's' : ''}` : null,
    actionsATraiterCounts.quotes > 0 ? `${actionsATraiterCounts.quotes} devis` : null,
    actionsATraiterCounts.followups > 0 ? `${actionsATraiterCounts.followups} relance${actionsATraiterCounts.followups > 1 ? 's' : ''}` : null,
    actionsATraiterCounts.appointments > 0 ? `${actionsATraiterCounts.appointments} rendez-vous` : null,
    actionsATraiterCounts.deposits > 0 ? `${actionsATraiterCounts.deposits} acompte${actionsATraiterCounts.deposits > 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const actionsATraiterCard = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-[var(--text-1)]">Actions à traiter</p>
        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-2)]">{actionsATraiterTotal} action(s)</span>
      </div>
      {actionsATraiterTotal > 0 ? (
        <div>
          <p className="text-xl font-bold text-[var(--text-1)]">{actionsATraiterTotal} action{actionsATraiterTotal > 1 ? 's' : ''} en attente</p>
          {actionsATraiterParts && <p className="mt-1 text-sm text-[var(--text-2)]">{actionsATraiterParts}</p>}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-2)]">Tout est à jour pour le moment.</p>
      )}
      <button
        type="button"
        onClick={() => setDashboardMode('tasks')}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-dim)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-dim)]/80 sm:w-auto"
      >
        Voir mes tâches <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  // --- Vue "Valeur générée par Kadria" — calculs V1 sans nouvelle API ---
  // Règles métriques figées : CA potentiel = tous les projets sauf Gagné/Perdu ;
  // CA gagné = projets Gagné + devis acceptés (acceptedAt), sans double comptage ;
  // devis acceptés = acceptedAt renseigné (avec fallback statut Gagné, seul signal
  // disponible sur les projets tant que le détail des devis n'est pas chargé ici).
  const canSeeAdvancedValueDashboard = canAccessFeature('advancedValueDashboard');
  const projectValue = (p: Project) => p.devisAmount || parseBudget(p.budget || '');
  // Regle acompte : si les acomptes sont actives pour l'artisan, un devis
  // accepte ne suffit plus a considerer le chantier comme gagne/securise —
  // il faut l'acompte paye. Sans acompte, comportement inchange (statut
  // Gagné ou acceptedAt).
  const isAcceptedValueProject = (p: Project) =>
    artisanDepositEnabled
      ? normalizeDepositStatus(p.depositStatus) === 'paid'
      : p.status === 'Gagné' || Boolean(p.acceptedAt);

  // Le filtre source détaillé est réservé Performance+ ; en Essentiel, on ignore la
  // sélection et on retombe sur "Toutes les sources".
  const effectiveValueSourceFilter: ValueSourceFilter = canSeeAdvancedValueDashboard ? valueSourceFilter : 'all';
  const valuePeriodRange = getValuePeriodRange(valuePeriod, today);
  const valuePreviousPeriodRange = getPreviousValuePeriodRange(valuePeriod, today);

  const matchesValuePeriod = (p: Project, range: { start: Date; end: Date } | null) => {
    if (!range) return true;
    if (!p.createdAt) return false;

    const created = new Date(p.createdAt);

    // Date invalide ou future incohérente : exclue des périodes limitées.
    if (Number.isNaN(created.getTime()) || created.getTime() > now + 24 * 60 * 60 * 1000) return false;

    return created >= range.start && created <= range.end;
  };

  const matchesValueSource = (p: Project) =>
    effectiveValueSourceFilter === 'all' || normalizeValueSource(p.source) === effectiveValueSourceFilter;

  const valueFilteredProjects = activeProjects.filter(
    (p) => matchesValuePeriod(p, valuePeriodRange) && matchesValueSource(p),
  );
  const valuePreviousFilteredProjects = valuePreviousPeriodRange
    ? activeProjects.filter((p) => matchesValuePeriod(p, valuePreviousPeriodRange) && matchesValueSource(p))
    : [];
  const valueFilteredIds = new Set(valueFilteredProjects.map((p) => p.id));
  const hasValueData = valueFilteredProjects.length > 0;

  const wonProjects = valueFilteredProjects.filter(isAcceptedValueProject);
  const openValueProjects = valueFilteredProjects.filter((p) => !isAcceptedValueProject(p) && p.status !== 'Perdu');
  const valueCaEnCours = openValueProjects.reduce((sum, p) => sum + projectValue(p), 0);
  const valueCaGagne = wonProjects.reduce((sum, p) => sum + projectValue(p), 0);
  const valueDevisEnvoyesCount = valueFilteredProjects.filter((p) => p.status === 'Devis envoyé').length;
  const valueDevisAcceptesCount = wonProjects.length;
  const valueTauxConversion = valueDevisEnvoyesCount > 0
    ? (valueDevisAcceptesCount / valueDevisEnvoyesCount) * 100
    : null;
  const valueNouveauxCount = valueFilteredProjects.filter((p) => p.status === 'Nouveau').length;
  const valueARappelerCount = valueFilteredProjects.filter((p) => p.status === 'À rappeler').length;
  const valueARelancerCount = valueFilteredProjects.filter((p) => p.status === 'A relancer').length;

  // Comparaison période précédente (V1) : uniquement disponible si une période
  // limitée est sélectionnée — "Tout" n'a pas de période précédente comparable.
  const previousWonProjects = valuePreviousFilteredProjects.filter(isAcceptedValueProject);
  const previousOpenProjects = valuePreviousFilteredProjects.filter((p) => !isAcceptedValueProject(p) && p.status !== 'Perdu');
  const previousCaEnCours = previousOpenProjects.reduce((sum, p) => sum + projectValue(p), 0);
  const previousCaGagne = previousWonProjects.reduce((sum, p) => sum + projectValue(p), 0);
  const previousDevisEnvoyesCount = valuePreviousFilteredProjects.filter((p) => p.status === 'Devis envoyé').length;
  const previousDevisAcceptesCount = previousWonProjects.length;
  const previousDossiersCount = valuePreviousFilteredProjects.length;

  const valueComparisons = {
    dossiers: formatValueCountDelta(valueFilteredProjects.length, previousDossiersCount, 'dossier(s)'),
    caEnCours: formatValuePercentDelta(valueCaEnCours, previousCaEnCours),
    caGagne: formatValuePercentDelta(valueCaGagne, previousCaGagne),
    devisEnvoyes: formatValueCountDelta(valueDevisEnvoyesCount, previousDevisEnvoyesCount, 'devis'),
    devisAcceptes: formatValueCountDelta(valueDevisAcceptesCount, previousDevisAcceptesCount, 'devis'),
  };

  // Alerte "devis sans réponse" V1 : seuil fixe (10 jours) défini dans
  // getProjectRiskStatus. À terme, ce seuil devra être configurable par artisan.
  const staleQuoteProjects = valueFilteredProjects.filter((p) => {
    const risk = getProjectRiskStatus(p);
    return risk.status === 'followUp' && risk.reason.startsWith('Devis envoye');
  });
  const incompleteValueProjects = valueFilteredProjects.filter((p) => {
    const risk = getProjectRiskStatus(p);
    return risk.status === 'followUp' && risk.reason.startsWith('Dossier incomplet');
  });
  const valueHotLeads = valueFilteredProjects.filter(
    (p) => p.status !== 'Gagné' && p.status !== 'Perdu' && isHotLead(p),
  );
  const uncontactedHotLeads = valueHotLeads.filter((p) => !p.lastFollowUpAt);
  const pendingSentQuoteProjects = valueFilteredProjects.filter((p) => p.status === 'Devis envoyé' && !p.acceptedAt);
  const valueQuotesProjects = quotesProjects.filter((p) => valueFilteredIds.has(p.id));

  type ValueAction = { key: string; title: string; client: string; context: string; projectId: string };
  const valueActions: ValueAction[] = [];
  const seenValueActionProjects = new Set<string>();
  const pushValueAction = (project: Project, title: string, context: string) => {
    if (!project?.id || seenValueActionProjects.has(project.id)) return;
    seenValueActionProjects.add(project.id);
    valueActions.push({
      key: `${project.id}-${title}`,
      title,
      client: [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || project.projectType || 'Dossier',
      context,
      projectId: project.id,
    });
  };
  // Alertes/opportunités avancées (devis sans réponse, opportunités chaudes) réservées Performance+.
  if (canSeeAdvancedValueDashboard) {
    staleQuoteProjects.forEach((p) => {
      const amount = projectValue(p);
      pushValueAction(
        p,
        'Devis à relancer',
        `${amount > 0 ? `${formatCurrency(amount)} en attente · ` : ''}Devis envoyé depuis ${getProjectRiskStatus(p).daysWithoutAction ?? '—'} j sans réponse`,
      );
    });
  }
  valueQuotesProjects.forEach((p) => {
    const amount = projectValue(p);
    pushValueAction(p, 'Devis à envoyer', amount > 0 ? `Budget estimé ${formatCurrency(amount)}` : 'Budget non renseigné');
  });
  todayCallbacks
    .filter((p) => valueFilteredIds.has(p.id))
    .forEach((p) => pushValueAction(p, "Rappel prévu aujourd'hui", 'Rappel programmé ce jour'));
  if (canSeeAdvancedValueDashboard) {
    uncontactedHotLeads.forEach((p) => {
      const amount = projectValue(p);
      pushValueAction(
        p,
        'Opportunité chaude',
        amount > 0 ? `${getHotLeadMessage(p)} · ${formatCurrency(amount)} potentiel` : getHotLeadMessage(p),
      );
    });
  }
  incompleteValueProjects.forEach((p) => {
    const amount = projectValue(p);
    pushValueAction(
      p,
      'Dossier incomplet',
      amount > 0 ? `Informations manquantes · budget estimé ${formatCurrency(amount)}` : 'Informations manquantes — budget non renseigné',
    );
  });
  const topValueActions = valueActions.slice(0, canSeeAdvancedValueDashboard ? 5 : 3);

  const priorityAction = valueActions[0] || null;
  const priorityActionTitle = priorityAction
    ? priorityAction.title === 'Devis à relancer'
      ? `Relancer le devis de ${priorityAction.client}`
      : priorityAction.title === 'Devis à envoyer'
        ? `Envoyer le devis à ${priorityAction.client}`
        : priorityAction.title === "Rappel prévu aujourd'hui"
          ? `Rappeler ${priorityAction.client}`
          : priorityAction.title === 'Opportunité chaude'
            ? `Relancer ${priorityAction.client} — opportunité chaude`
            : `Compléter le dossier de ${priorityAction.client}`
    : 'Tout est à jour pour le moment';

  // "Valeur en attente" V1 : argent potentiellement récupérable à court terme,
  // sans double comptage (devis envoyés en attente englobe les devis sans réponse).
  const pendingQuoteValue = pendingSentQuoteProjects.reduce((sum, p) => sum + projectValue(p), 0);
  const staleQuoteValue = staleQuoteProjects.reduce((sum, p) => sum + projectValue(p), 0);
  const hotLeadPendingValue = uncontactedHotLeads.reduce((sum, p) => sum + projectValue(p), 0);
  const quotesToSendValue = valueQuotesProjects.reduce((sum, p) => sum + projectValue(p), 0);
  const totalPendingValue = pendingQuoteValue + hotLeadPendingValue + quotesToSendValue;

  const qualifiedValueCount = valueFilteredProjects.filter((p) => Number(p.completenessScore || 0) >= 100).length;
  const preparedQuotesValueCount = valueFilteredProjects.filter((p) => p.status === 'Devis envoyé' || Boolean(p.devisAmount)).length;
  const handledFollowUpsValueCount = valueFilteredProjects.filter((p) => p.lastFollowUpAt).length;
  const estimatedMinutesSaved = qualifiedValueCount * 8 + preparedQuotesValueCount * 5 + handledFollowUpsValueCount * 5;
  const estimatedHoursSaved = Math.floor(estimatedMinutesSaved / 60);
  const estimatedRemMinutesSaved = estimatedMinutesSaved % 60;

  const valueSourceStats = SOURCE_OPTIONS.map((opt) => {
    const sourceProjects = valueFilteredProjects.filter((p) => {
      const src = (p.source || '').toLowerCase();
      if (opt.value === 'chat') return src.includes('chat');
      if (opt.value === 'voice') return src.includes('voice') || src.includes('vocal') || src.includes('call');
      if (opt.value === 'manual') return src.includes('manual') || src.includes('manuel');
      return false;
    });
    return {
      label: opt.label,
      count: sourceProjects.length,
      amount: sourceProjects.reduce((sum, p) => sum + projectValue(p), 0),
    };
  }).filter((s) => s.count > 0);
  const mostValuableSource = valueSourceStats.length > 0
    ? [...valueSourceStats].sort((a, b) => b.amount - a.amount)[0]
    : null;

  const NAV_ITEMS: { mode: DashboardMode; label: string; icon: typeof Euro }[] = [
    { mode: 'value', label: 'Accueil', icon: Euro },
    { mode: 'commercial', label: 'Suivi', icon: Target },
    { mode: 'calendar', label: 'Agenda', icon: CalendarDays },
    { mode: 'clients', label: 'Clients', icon: FolderOpen },
    { mode: 'tasks', label: 'À faire', icon: CheckCircle },
  ];

  return (
    <div className="dashboard-shell" style={{ minHeight: '100vh', background: 'var(--bg)', display: isMobile ? 'block' : 'flex', overflowX: 'hidden' }}>
      {!isMobile && (
        <aside
          className="sticky top-0 flex h-screen shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)] py-6"
          style={{
            background: 'color-mix(in srgb, var(--bg-elevated) 92%, #050607 8%)',
            width: sidebarCollapsed ? '76px' : '252px',
            paddingLeft: sidebarCollapsed ? '10px' : '16px',
            paddingRight: sidebarCollapsed ? '10px' : '16px',
            transition: 'width 0.2s ease, padding 0.2s ease',
            overflow: 'hidden',
          }}
        >
        <div className="flex h-full flex-col">
          <div className={`mb-8 flex items-center shrink-0 ${sidebarCollapsed ? 'flex-col gap-3 px-0' : 'justify-between px-2'}`}>
            {sidebarCollapsed ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-green-400">K</p>
            ) : (
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-[var(--text-1)]">KADRIA</span>
                  <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-400">PRO</span>
                </div>
                <div className="mt-3 text-base font-semibold text-[var(--text-1)]">
                  {artisanFirstName ? `Bonjour ${artisanFirstName}` : 'Bonjour'}
                </div>
                <div className="mt-1 text-sm text-[var(--text-3)]">
                  {formattedToday}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Déployer le menu' : 'Réduire le menu'}
              title={sidebarCollapsed ? 'Déployer le menu' : 'Réduire le menu'}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-2)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className={`flex flex-1 flex-col gap-1 overflow-y-auto ${sidebarCollapsed ? 'items-center' : ''}`}>
            {NAV_ITEMS.map((item) => {
              const isActive = dashboardMode === item.mode;
              const Icon = item.icon;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => {
                    setDashboardMode(item.mode);
                    setQuickFilter(null);
                  }}
                  title={item.label}
                  aria-label={item.label}
                  className={
                    sidebarCollapsed
                      ? `flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-150 ${
                          isActive
                            ? 'border-green-500/30 bg-green-500/10 text-green-400'
                            : 'border-transparent text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]'
                        }`
                      : `flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-150 ${
                          isActive
                            ? 'border-green-500/30 bg-green-500/10 text-green-400'
                            : 'border-transparent text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]'
                        }`
                  }
                  style={isActive && !sidebarCollapsed ? { boxShadow: 'inset 3px 0 0 0 var(--accent)' } : undefined}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {isTrialActive && trialEndDateFR && (
            sidebarCollapsed ? (
              <div
                className="mb-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10 text-green-400"
                title={`Essai gratuit Performance jusqu'au ${trialEndDateFR}`}
              >
                <Sparkles className="h-4 w-4" />
              </div>
            ) : (
              <div className="mb-2 shrink-0 rounded-xl border border-green-500/30 bg-green-500/[0.08] px-3 py-2.5">
                <p className="text-xs font-semibold text-green-400">Vous testez Kadria Performance</p>
                <p className="mt-0.5 text-xs text-[var(--text-2)]">Essai gratuit jusqu&apos;au {trialEndDateFR}</p>
              </div>
            )
          )}

          <div className={`mt-auto flex shrink-0 flex-col gap-2 border-t border-[var(--border)] pt-4 ${sidebarCollapsed ? 'items-center' : ''}`}>
            <button
              onClick={() => setPlanModalOpen(true)}
              title={planChangeCtaLabel}
              aria-label={planChangeCtaLabel}
              className={
                sidebarCollapsed
                  ? 'flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--accent-border)] bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'flex items-center gap-2 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-dim)] px-3 py-2.5 text-sm font-semibold text-[var(--accent)]'
              }
            >
              <Sparkles className="w-4 h-4" /> {!sidebarCollapsed && planChangeCtaLabel}
            </button>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
              aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
              className={
                sidebarCollapsed
                  ? 'flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-2)]'
                  : 'flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-2)]'
              }
            >
              {theme === 'dark' ? '☀️' : '🌙'} {!sidebarCollapsed && (theme === 'dark' ? 'Thème clair' : 'Thème sombre')}
            </button>

            <button
              onClick={() => router.push('/parametres')}
              title="Mon profil"
              aria-label="Mon profil"
              className={
                sidebarCollapsed
                  ? 'flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-2)]'
                  : 'flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-2)]'
              }
            >
              ⚙️ {!sidebarCollapsed && 'Mon profil'}
            </button>

            <button
              onClick={logout}
              title="Déconnexion"
              aria-label="Déconnexion"
              className={
                sidebarCollapsed
                  ? 'flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                  : 'flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2.5 text-sm text-[var(--text-2)]'
              }
            >
              <LogOut className="w-4 h-4" /> {!sidebarCollapsed && 'Déconnexion'}
            </button>
          </div>
        </div>
        </aside>
      )}

      <div className="min-w-0 flex-1" style={{ padding: isMobile ? '16px 14px 32px' : '24px 32px 40px' }}>
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <NotificationBell variant="desktop" />
        </div>
      )}
      {showTrialEndingBanner && (
        <div
          className="mb-5 flex flex-col gap-3 rounded-2xl border border-green-500/30 bg-green-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10 text-green-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">Votre essai se termine bientôt.</p>
              <p className="mt-0.5 text-sm text-[var(--text-2)]">Continuez avec Performance ou choisissez une offre adaptée.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={continueWithPerformance}
              disabled={continueTrialLoading}
              className="inline-flex items-center justify-center rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-green-400 disabled:opacity-60"
            >
              {continueTrialLoading ? '...' : 'Continuer avec Performance'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/tarifs')}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]"
            >
              Voir les offres
            </button>
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setTrialBannerDismissed(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-3)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {onboardingIncomplete && (
        <div
          style={{
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <span style={{ color: 'var(--text-2)', fontSize: '13px' }}>
            Finalisez votre configuration pour mieux qualifier vos prospects.
          </span>
          <button
            onClick={() => router.push('/onboarding')}
            style={{
              background: 'var(--accent)',
              border: 'none',
              color: 'black',
              fontWeight: 600,
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Reprendre l&apos;onboarding
          </button>
        </div>
      )}
      {progressRecommendations && progressRecommendations.progress.percent < 100 && !setupCardDismissed && (
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: isMobile ? '14px' : '18px',
            marginBottom: '20px',
            background: 'var(--bg-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
            <div>
              <div style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                🚀 Centre de progression
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                {progressCenterExpanded
                  ? progressRecommendations.globalMessage
                  : `Encore environ ${progressRecommendations.estimatedCompletionTime} pour débloquer tout le potentiel de Kadria.`}
              </div>
            </div>
            <div style={{ color: 'var(--accent)', fontSize: '20px', fontWeight: 800, whiteSpace: 'nowrap' }}>
              {progressRecommendations.progress.percent}%
            </div>
          </div>

          <div style={{ height: '6px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${progressRecommendations.progress.percent}%`, background: 'var(--accent)', transition: 'width 0.2s' }} />
          </div>

          {!progressCenterExpanded ? (
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ color: 'var(--text-3)', fontSize: '12px', minWidth: 0 }}>
                {progressRecommendations.nextSteps[0]
                  ? `Prochaine étape : ${progressRecommendations.nextSteps[0].title}.`
                  : 'Poursuivez votre configuration pour activer toutes les briques clés.'}
              </div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                {progressRecommendations.nextSteps[0] && (
                  <button
                    type="button"
                    onClick={() => (progressRecommendations.nextSteps[0].key === 'calendar' ? setDashboardMode('calendar') : router.push(progressRecommendations.nextSteps[0].href))}
                    style={{
                      background: 'var(--accent)',
                      border: 'none',
                      color: 'black',
                      fontWeight: 700,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Continuer la configuration
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setProgressCenterExpanded(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-1)',
                    fontWeight: 700,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Voir le détail
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ border: '1px solid rgba(34,197,94,0.28)', background: 'rgba(34,197,94,0.12)', color: '#86efac', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}>
                    Essentiel
                  </span>
                  <span style={{ border: '1px solid rgba(251,191,36,0.28)', background: 'rgba(251,191,36,0.12)', color: '#fcd34d', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}>
                    Recommandé
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setProgressCenterExpanded(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-1)',
                    fontWeight: 700,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    alignSelf: isMobile ? 'stretch' : 'auto',
                  }}
                >
                  Réduire
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {progressRecommendations.nextSteps.map((s) => (
                  <div
                    key={s.key}
                    style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'stretch' : 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      background: 'var(--bg-elevated)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontSize: '16px' }}>{s.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{s.title}</span>
                          <span style={{
                            border: '1px solid',
                            borderColor: s.category === 'essential' ? 'rgba(34,197,94,0.28)' : 'rgba(251,191,36,0.28)',
                            background: s.category === 'essential' ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                            color: s.category === 'essential' ? '#86efac' : '#fcd34d',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}>
                            {s.category === 'essential' ? 'Essentiel' : 'Recommandé'}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-3)', fontSize: '11px' }}>
                          {s.estimatedTime} · ✓ {s.benefits[0]}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => (s.key === 'calendar' ? setDashboardMode('calendar') : router.push(s.href))}
                      style={{
                        background: 'var(--accent)',
                        border: 'none',
                        color: 'black',
                        fontWeight: 700,
                        borderRadius: '8px',
                        padding: '7px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        alignSelf: isMobile ? 'stretch' : 'auto',
                      }}
                    >
                      {s.cta}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {pathname.startsWith('/parametres') && progressRecommendations && progressRecommendations.progress.percent === 100 && !setupCardDismissed && (
        <div
          style={{
            border: '1px solid rgba(34,197,94,0.3)',
            background: 'rgba(34,197,94,0.08)',
            borderRadius: '14px',
            padding: isMobile ? '14px' : '18px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
            <div>
              <div style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                🎉 Votre entreprise est prête.
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                Toutes les fonctionnalités de Kadria peuvent désormais fonctionner à leur plein potentiel.
              </div>
            </div>
            <button
              onClick={() => setSetupCardDismissed(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>✓ Profil métier</span>
            <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>✓ Prestations</span>
            <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>✓ Tarifs</span>
            <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>✓ Agenda</span>
          </div>
          <button
            onClick={() => router.push('/parametres/profil-metier')}
            style={{
              background: 'var(--accent)', border: 'none', color: 'black', fontWeight: 700,
              borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer',
            }}
          >
            Découvrir les prochaines fonctionnalités
          </button>
        </div>
      )}
      {isMobile && dashboardMode === 'value' ? (
        <MobileDashboardView
          firstName={artisanFirstName}
          artisanTrades={artisanTrades}
          priorityProjects={priorityProjects}
          topOpportunities={topOpportunities}
          hotLeads={hotLeads}
          riskProjects={riskProjects}
          todayTasks={todayTasks}
          pipelineSteps={pipelineSteps}
          kpiCards={kpiCards}
          progressRecommendations={progressRecommendations}
          progressCenterExpanded={progressCenterExpanded}
          operationsCenter={operationsCenter}
          router={router}
          dashboardMode={dashboardMode}
          setDashboardMode={setDashboardMode}
          setProgressCenterExpanded={setProgressCenterExpanded}
          setFilters={setFilters}
          applyQuickFilter={applyQuickFilter}
          goToCommercialFilter={goToCommercialFilter}
          resetFilters={resetFilters}
          showToast={showToast}
          getProjectHref={(projectId) => `/dashboard-v2/projet/${projectId}`}
          settingsHref="/parametres"
          onSubscriptionClick={() => router.push('/abonnement')}
          onSupportClick={() => { window.location.href = 'mailto:contact@kadria.fr'; }}
          onLogoutClick={logout}
          createProject={(form) =>
            fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(form),
            }).then((res) => res.json())
          }
        />
      ) : (
      <>
      {/* Vue "Valeur générée par Kadria" — vue par défaut */}
      {showCommercialWorkspace && !loading && !isMobile && (
        <TrackingWorkspace
          projects={allProjects}
          operationsCenter={operationsCenter}
          loadState={operationsCenterLoadState}
          onOpenProject={(projectId, target) => router.push(target || `/dashboard-v2/projet/${projectId}`)}
        />
      )}
      {showTasksOverview && !loading && !isMobile && (
        <TasksWorkspace
          firstName={artisanFirstName}
          operationsCenter={operationsCenter}
          loadState={operationsCenterLoadState}
          onRefresh={refreshOperationsCenter}
        />
      )}
      {showValueOverview && !loading && isMobile && (
        <div className="flex flex-col gap-6">
          {operationsCenter && <OperationsCenterSection data={operationsCenter} />}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
            <h2 className="text-2xl font-bold text-[var(--text-1)]">Valeur générée par Kadria</h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">
              Suivez les demandes captées, les opportunités en cours et le chiffre d&apos;affaires généré grâce à Kadria.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {VALUE_PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValuePeriod(opt.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                      valuePeriod === opt.value
                        ? 'bg-green-500 text-zinc-950'
                        : 'bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {canSeeAdvancedValueDashboard ? (
                <div className="flex flex-wrap items-center gap-2">
                  {VALUE_SOURCE_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValueSourceFilter(opt.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                        valueSourceFilter === opt.value
                          ? 'bg-[var(--text-1)] text-[var(--bg)]'
                          : 'bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text-1)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openUpgradeModal('advancedValueDashboard')}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1.5 text-sm font-semibold text-[var(--text-2)] hover:text-[var(--text-1)]"
                >
                  <Lock className="h-3.5 w-3.5 text-green-500" />
                  Analyse par source avec Performance
                </button>
              )}
            </div>
          </div>

          {!hasValueData && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
              <p className="text-sm font-medium text-[var(--text-2)]">Aucun résultat sur cette période.</p>
              <p className="mt-1 text-sm text-[var(--text-3)]">Changez la période pour voir davantage d'activité.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              { label: 'CA potentiel en cours', value: formatCurrency(valueCaEnCours), icon: Euro, borderColor: 'var(--accent)', delta: valueComparisons.caEnCours },
              { label: 'CA gagné', value: formatCurrency(valueCaGagne), icon: Trophy, borderColor: '#15803d', delta: valueComparisons.caGagne },
              { label: 'Dossiers captés', value: String(valueFilteredProjects.length), icon: FolderOpen, borderColor: '#2563eb', delta: valueComparisons.dossiers },
              { label: 'Devis envoyés', value: String(valueDevisEnvoyesCount), icon: Send, borderColor: '#7c3aed', delta: valueComparisons.devisEnvoyes },
              { label: 'Devis acceptés', value: String(valueDevisAcceptesCount), icon: CheckCircle, borderColor: '#22c55e', delta: valueComparisons.devisAcceptes },
              ...(canSeeAdvancedValueDashboard
                ? [{ label: 'Taux de conversion', value: valueTauxConversion !== null ? `${valueTauxConversion.toFixed(1)}%` : '—', icon: Target, borderColor: '#d97706', delta: null as string | null }]
                : []),
            ].map((card) => (
              <div
                key={card.label}
                className="flex min-h-[100px] flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 sm:px-5 sm:py-5"
                style={{ borderTopWidth: '2px', borderTopColor: card.borderColor }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-3)] text-[13px]">{card.label}</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-hover)] text-green-500">
                    <card.icon className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-2xl font-bold tracking-tight text-[var(--text-1)] sm:text-[28px]">{card.value}</span>
                {card.delta && <span className="text-xs font-medium text-[var(--text-3)]">{card.delta}</span>}
              </div>
            ))}
          </div>

          {/* Sparkline CA potentiel */}
          {!loading && (
            <FeatureGate feature="kpiTrends" requiredPlan="performance">
              <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-[var(--text-1)]">Évolution du CA potentiel</p>
                    <p className="text-sm text-[var(--text-2)]">
                      {kpiPeriod === '7d'
                        ? 'Sur les 7 derniers jours'
                        : kpiPeriod === '30d'
                          ? 'Sur les 30 derniers jours'
                          : kpiPeriod === '90d'
                            ? 'Sur les 3 derniers mois'
                            : 'Sur les 12 derniers mois'}
                    </p>
                  </div>

                  <span className="rounded-full border border-green-500/30 bg-green-500/[0.08] px-3 py-1 text-xs text-green-500 sm:text-sm">
                    {formatCurrency(kpiPeriodData.current.caPotentiel)} sur la période
                  </span>
                </div>

                {kpiPeriodData.sparkline.length < 2 || kpiPeriodData.sparkline.every((d) => d.value === 0) ? (
                  <p className="mt-3 text-sm text-[var(--text-3)]">
                    Pas encore assez d'activité pour afficher une évolution.
                  </p>
                ) : (
                  <>
                    <div className="mt-3">
                      <Sparkline data={kpiPeriodData.sparkline} height={isMobile ? 56 : 80} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {sampleSparklineLabels(kpiPeriodData.sparkline).map((lbl, i) => (
                        <span key={i} className="text-[11px] text-[var(--text-3)]">
                          {lbl}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </FeatureGate>
          )}

          {canSeeAdvancedValueDashboard && totalPendingValue > 0 ? (
            <ImpactCard variant="money">
              <p className="text-base font-bold text-[var(--impact-text)]">Valeur en attente</p>
              <p className="mt-2 text-2xl font-bold text-[var(--impact-text)]">
                {formatCurrency(totalPendingValue)} en attente
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-[var(--impact-subcard-border)] bg-[var(--impact-subcard-bg)] px-4 py-3">
                  <p className="text-xs text-[var(--impact-text-soft)]">Devis à relancer</p>
                  <p className="mt-1 text-base font-bold text-[var(--impact-text)]">
                    {staleQuoteProjects.length} devis{staleQuoteValue > 0 ? ` · ${formatCurrency(staleQuoteValue)}` : ''}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--impact-subcard-border)] bg-[var(--impact-subcard-bg)] px-4 py-3">
                  <p className="text-xs text-[var(--impact-text-soft)]">Opportunités chaudes non traitées</p>
                  <p className="mt-1 text-base font-bold text-[var(--impact-text)]">
                    {uncontactedHotLeads.length} dossier(s){hotLeadPendingValue > 0 ? ` · ${formatCurrency(hotLeadPendingValue)}` : ''}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--impact-subcard-border)] bg-[var(--impact-subcard-bg)] px-4 py-3">
                  <p className="text-xs text-[var(--impact-text-soft)]">Devis à envoyer</p>
                  <p className="mt-1 text-base font-bold text-[var(--impact-text)]">
                    {valueQuotesProjects.length} dossier(s){quotesToSendValue > 0 ? ` · ${formatCurrency(quotesToSendValue)}` : ''}
                  </p>
                </div>
              </div>
            </ImpactCard>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
              <p className="text-base font-bold text-[var(--text-1)]">Valeur en attente</p>
              {canSeeAdvancedValueDashboard ? (
                <p className="mt-2 text-2xl font-bold text-[var(--text-1)]">— en attente</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-[var(--text-2)]">
                    Kadria suit déjà les devis envoyés et les dossiers en cours. Passez à Performance pour voir le détail des montants récupérables à court terme.
                  </p>
                  <button
                    type="button"
                    onClick={() => openUpgradeModal('advancedValueDashboard')}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-transform hover:scale-[1.02]"
                  >
                    Passer à Performance
                  </button>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6 relative overflow-hidden">
              {/* Subtle green glow behind icon */}
              <div className="absolute top-4 right-4 h-16 w-16 rounded-full bg-green-500/[0.07] blur-xl pointer-events-none" />
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                    <Timer className="h-4 w-4 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-2)]">Temps estimé économisé</p>
                </div>
                <span className="shrink-0 rounded-full border border-green-500/25 bg-green-500/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-green-400">
                  Temps récupéré
                </span>
              </div>
              <p className="mt-4 text-4xl font-extrabold tracking-tight text-[var(--text-1)] sm:text-[44px]">
                {estimatedHoursSaved > 0 ? `${estimatedHoursSaved} h ${estimatedRemMinutesSaved} min` : `${estimatedRemMinutesSaved} min`}
              </p>
              <p className="mt-1 text-xs text-[var(--text-3)]">économisées sur la période</p>
              {canSeeAdvancedValueDashboard ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-[var(--bg-hover)] px-3 py-2">
                    <span className="text-xs text-[var(--text-2)]">Qualification automatique</span>
                    <span className="text-xs font-semibold text-[var(--text-1)]">{qualifiedValueCount * 8} min · {qualifiedValueCount} dossier(s)</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[var(--bg-hover)] px-3 py-2">
                    <span className="text-xs text-[var(--text-2)]">Devis préparés</span>
                    <span className="text-xs font-semibold text-[var(--text-1)]">{preparedQuotesValueCount * 5} min · {preparedQuotesValueCount} devis</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[var(--bg-hover)] px-3 py-2">
                    <span className="text-xs text-[var(--text-2)]">Relances suivies</span>
                    <span className="text-xs font-semibold text-[var(--text-1)]">{handledFollowUpsValueCount * 5} min · {handledFollowUpsValueCount} relance(s)</span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[var(--text-3)]">
                  8 min économisées par dossier qualifié automatiquement, 5 min par relance/devis préparé.
                </p>
              )}
              <p className="mt-3 text-[11px] italic text-[var(--text-3)] opacity-70">
                Estimation indicative basée sur les actions traitées par Kadria.
              </p>
            </div>

            {canSeeAdvancedValueDashboard ? (
              valueSourceStats.length > 0 && (
                <div className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6 relative overflow-hidden">
                  <div className="absolute top-4 right-4 h-16 w-16 rounded-full bg-green-500/[0.06] blur-xl pointer-events-none" />
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                      <Globe className="h-4 w-4 text-green-400" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-2)]">Sources des demandes</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {valueSourceStats.map((s, idx) => {
                      const isTop = mostValuableSource && s.label === mostValuableSource.label && mostValuableSource.amount > 0;
                      return (
                        <div
                          key={s.label}
                          className={`rounded-xl px-4 py-3 ${isTop ? 'border border-green-500/25 bg-green-500/[0.06]' : 'border border-[var(--border)] bg-[var(--bg-hover)]'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-[var(--text-1)] truncate">{s.label}</p>
                                {isTop && (
                                  <span className="shrink-0 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-400">
                                    + rentable
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-[var(--text-3)]">
                                {s.count} demande{s.count > 1 ? 's' : ''}
                                {s.amount > 0 ? ` · ${formatCurrency(s.amount)} générés` : ''}
                              </p>
                            </div>
                            {idx === 0 && valueSourceStats.length > 1 && (
                              <span className="shrink-0 mt-0.5 text-[11px] font-semibold text-[var(--text-3)]">#{idx + 1}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                    <Lock className="h-4 w-4 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-2)]">Sources des demandes</p>
                </div>
                <p className="mt-3 text-sm text-[var(--text-2)]">
                  Kadria suit déjà les principaux indicateurs de votre activité. Identifiez vos sources les plus rentables, vos devis sans réponse et les opportunités à plus fort potentiel en passant à Performance.
                </p>
                <button
                  type="button"
                  onClick={() => openUpgradeModal('advancedValueDashboard')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-transform hover:scale-[1.02]"
                >
                  Passer à Performance
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barre période */}
      {showLegacyCommercialOverviewDesktop && (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--text-2)]">Période analysée · {periodLabel}</p>

        <FeatureGate feature="kpiTrends" requiredPlan="performance">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-row">
          {KPI_PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={
                opt.value === kpiPeriod
                  ? 'rounded-full border px-4 py-2 text-sm font-semibold cursor-pointer'
                  : 'rounded-full border px-4 py-2 text-sm cursor-pointer transition-[border-color,color] duration-150 hover:border-green-500/30 hover:text-[var(--text-1)]'
              }
              style={
                opt.value === kpiPeriod
                  ? { background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)', color: 'var(--accent)' }
                  : { background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-2)' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        </FeatureGate>
      </div>
      )}

      {/* KPIs */}
      {showLegacyCommercialOverviewDesktop && (
      <div style={{ padding: 0, marginBottom: '24px' }}>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: isMobile ? '12px' : '16px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-[var(--bg-hover)]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: isMobile ? '12px' : '16px' }}>
            {kpiCards.slice(0, 4).map((card) => (
              <div
                key={card.label}
                className={`flex min-h-[100px] flex-col gap-2 rounded-2xl border px-4 py-4 sm:px-[22px] sm:py-5 ${card.alert ? 'bg-orange-600/[0.04] border-orange-600/30' : 'bg-[var(--bg-elevated)] border-[var(--border)]'}`}
                style={{ borderTopWidth: '2px', borderTopColor: card.borderColor }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-3)] text-[13px]">{card.label}</span>

                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-hover)] text-green-500">
                    <card.icon className="w-4 h-4" />
                  </div>
                </div>

                  <span className="text-2xl font-bold tracking-tight text-[var(--text-1)] sm:text-[28px]">
                  <AnimatedKpiValue value={card.value} format={card.format} />
                </span>

                {card.delta !== null && canViewKpiTrends && (
                  <TrendIndicator delta={card.delta} unit={card.label === 'Taux de conversion' ? ' pts' : '%'} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {showLegacyCommercialOverviewDesktop && !loading && (
        <div className="mb-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 lg:col-span-2">
            {hasRiskProjects ? opportunitesCard : actionsATraiterCard}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[var(--text-1)]">État de vos dossiers</p>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: businessHealth.color }} />
              </div>
              <p className="mt-1 text-sm font-semibold" style={{ color: businessHealth.color }}>{businessHealth.label}</p>
              {averageMaturityScore !== null && (
                <p className="mt-1 text-xs text-[var(--text-2)]">
                  Avancement moyen {Math.round(averageMaturityScore)}/100 · {criticalActionsCount} point(s) urgent(s) · {highActionsCount} action(s) à traiter
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              {hasRiskProjects ? actionsATraiterCard : opportunitesCard}
            </div>
          </div>
        </div>
      )}

      {showTasksOverview && !loading && isMobile && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-[var(--text-1)]">Kadria travaille avec vous aujourd&apos;hui</p>
                <p className="text-sm text-[var(--text-2)]">Voyez immédiatement ce que Kadria gère, ce qui attend votre accord et ce qui mérite votre attention.</p>
              </div>
              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-2)]">{mesTachesItems.length} action(s)</span>
            </div>
            {operationsCenter && (
              <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-base font-bold text-[var(--text-1)]">En un coup d&apos;œil</p>
                    <p className="mt-1 text-sm text-[var(--text-2)]">
                      Kadria vous aide déjà à avancer sans quitter cette page.
                    </p>
                  </div>
                  {operationsCenter.workbench.permissions.canReadAutomations ? (
                    <button
                      type="button"
                      onClick={() => router.push('/parametres/automatisations')}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] transition-colors hover:text-[var(--text-1)]"
                    >
                      {operationsCenter.workbench.permissions.canManageAutomations ? 'Gérer les actions automatiques' : 'Voir les réglages'}
                      {!operationsCenter.workbench.permissions.canManageAutomations ? ' · Lecture seule' : ''}
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <ActionSummary
                    icon={Sparkles}
                    label="automatisations actives"
                    value={operationsCenter.workbench.summary.activeAutomationCount}
                  />
                  <ActionSummary
                    icon={Bell}
                    label="en attente de votre accord"
                    value={operationsCenter.workbench.summary.approvalCount}
                  />
                  <ActionSummary
                    icon={CheckCircle}
                    label="réalisées récemment"
                    value={operationsCenter.workbench.recentlyCompleted.length}
                  />
                  <ActionSummary
                    icon={AlertTriangle}
                    label="à vérifier"
                    value={operationsCenter.workbench.summary.attentionCount}
                  />
                </div>
              </div>
            )}
            {actionEngineFilter && (
              <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[var(--text-2)]">
                  Filtre actif : <span className="font-semibold text-[var(--text-1)]">{actionEngineFilterLabel(actionEngineFilter)}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setActionEngineFilter(null)}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  Afficher toutes les actions
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <ActionSummary icon={PhoneCall} label="appels à faire" value={taskCounts.call || 0} onClick={() => goToCommercialFilter('calls')} />
              <ActionSummary icon={FolderOpen} label="devis à envoyer" value={taskCounts.quote || 0} onClick={() => goToCommercialFilter('quotes')} />
              <ActionSummary icon={Mail} label="relances à faire" value={(taskCounts.followUp || 0) + (taskCounts.email || 0)} onClick={() => goToCommercialFilter('followups')} />
              <ActionSummary
                icon={CalendarDays}
                label="rendez-vous à planifier"
                value={actionEngineCounters.schedule_appointment || 0}
                onClick={() => setActionEngineFilter(actionEngineFilter === 'schedule_appointment' ? null : 'schedule_appointment')}
              />
              <ActionSummary
                icon={CreditCard}
                label="acomptes à suivre"
                value={depositProjects.toAsk.length + depositProjects.requested.length}
                onClick={() => setActionEngineFilter(actionEngineFilter === 'deposits' ? null : 'deposits')}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--text-3)]">Cliquez sur un bloc pour filtrer la liste</p>
            <div className="mt-4">
              {operationsCenter ? (
                <OperationsWorkbenchSections data={operationsCenter} recentlyCompletedLimit={3} />
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-4 text-center">
                  <p className="text-sm font-semibold text-[var(--text-1)]">Tout est à jour pour le moment.</p>
                  <p className="mt-1 text-xs text-[var(--text-2)]">Kadria vous signalera ici ce qui mérite votre attention.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[var(--text-1)]">État de vos dossiers</p>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: businessHealth.color }} />
              </div>
              <p className="mt-1 text-sm font-semibold" style={{ color: businessHealth.color }}>{businessHealth.label}</p>
              {averageMaturityScore !== null && (
                <p className="mt-1 text-xs text-[var(--text-2)]">
                  Avancement moyen {Math.round(averageMaturityScore)}/100 · {criticalActionsCount} point(s) urgent(s) · {highActionsCount} action(s) à traiter
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              {opportunitesCard}
            </div>
          </div>
        </div>
      )}

      {showLegacyCommercialOverviewDesktop && !loading && guidelineCommercialeSection}

      {/* Alertes */}
      {showLegacyCommercialOverviewDesktop && !loading && (overdueCount > 0 || todayCount > 0) && (
        <div style={{ padding: 0, marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {overdueCount > 0 && (
            <div
              style={{
                flex: 1,
                minWidth: isMobile ? '100%' : '280px',
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
                <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: 0 }}>
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
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#b91c1c',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Voir les dossiers en retard →
              </button>
            </div>
          )}

          {todayCount > 0 && (
            <div
              style={{
                flex: 1,
                minWidth: isMobile ? '100%' : '280px',
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
                <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: 0 }}>
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
                  background: 'rgba(217,119,6,0.14)',
                  border: '1px solid rgba(217,119,6,0.4)',
                  color: '#92400e',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Voir les relances à faire →
              </button>
            </div>
          )}
        </div>
      )}

      {showCalendarWorkspaceDesktop && (
        <div className="mb-6">
          <CalendarWorkspace />
        </div>
      )}

      {isMobile && showClientsWorkspace && (
        <ClientsV2List onOpenProject={(projectId) => router.push(`/dashboard-v2/projet/${projectId}`)} onOpenClient={(clientId) => router.push(`/dashboard-v2/clients/${clientId}`)} />
      )}

      {isMobile && showCommercialWorkspace && (
        <MobileDevisView projects={sortedProjects} router={router} getProjectHref={(projectId) => `/dashboard-v2/projet/${projectId}`} />
      )}

      {isMobile && showCommercialWorkspace && !loading && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          {actionsATraiterCard}
        </div>
      )}

      {isMobile && showCommercialWorkspace && !loading && guidelineCommercialeSection}

      {isMobile && showPipelineWorkspace && (
        <MobilePipelineView projects={sortedProjects} router={router} getProjectHref={(projectId) => `/dashboard-v2/projet/${projectId}`} />
      )}

      {isMobile && showCalendarWorkspace && (
        <MobileAgendaView router={router} />
      )}

      {isMobile && showValueReportWorkspace && (
        <MobileValueReportView
          projects={sortedProjects}
          topOpportunities={topOpportunities}
          hotLeads={hotLeads}
          valueCaEnCours={valueCaEnCours}
          valueCaGagne={valueCaGagne}
          valueDevisEnvoyesCount={valueDevisEnvoyesCount}
          valueDevisAcceptesCount={valueDevisAcceptesCount}
          valueTauxConversion={valueTauxConversion}
          qualifiedValueCount={qualifiedValueCount}
          preparedQuotesValueCount={preparedQuotesValueCount}
          handledFollowUpsValueCount={handledFollowUpsValueCount}
          estimatedHoursSaved={estimatedHoursSaved}
          estimatedRemMinutesSaved={estimatedRemMinutesSaved}
        />
      )}

      {showClientsWorkspace && !isMobile && (
      <div className="flex flex-col gap-6 w-full" style={{ marginBottom: '24px' }}>
          {/* ZONE 1 — Top 3 opportunités */}
          {showCommercialWorkspace && !loading && topOpportunities.length > 0 && (
            <FeatureGate feature="topAiOpportunities" requiredPlan="performance">
            <>
              <div className="my-2 border-t border-[var(--border)]" />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-base font-bold text-[var(--text-1)]">Dossiers à traiter en priorité</p>
                  <p className="mt-1 text-xs text-[var(--text-2)]">
                    Les dossiers à traiter d&apos;abord selon l&apos;urgence, le budget, la réactivité du client et l&apos;avancement.
                  </p>
                </div>

                <span className="inline-flex w-fit rounded-full border border-green-500/25 bg-green-500/[0.08] px-3 py-1 text-xs text-green-400">
                  Priorité Kadria
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {canAccessFeature('topAiOpportunities') ? topOpportunities.map((project, index) => (
                  <button
                    key={project.id}
                    onClick={() => router.push(`/dashboard-v2/projet/${project.id}`)}
                      className={`flex flex-col gap-3 rounded-2xl border p-4 text-left transition-transform duration-200 hover:-translate-y-0.5 sm:p-5 ${
                      index === 0
                        ? IMPACT_CARD_BASE_CLASSES
                        : 'border-[var(--border)] bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs rounded px-2 py-0.5 font-bold ${
                        index === 0 ? 'bg-[var(--impact-badge-bg)] text-[var(--impact-badge-text)]' : 'bg-green-500/20 text-green-400'
                      }`}>
                        #{index + 1}
                      </span>

                      <span className={`font-bold text-sm ${index === 0 ? 'text-[var(--impact-cta)]' : 'text-green-400'}`}>
                        {opportunityScore(project, artisanTrades)}/100
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-[var(--text-1)] truncate">
                        {project.clientFirstName} {project.clientName}
                      </p>

                      <p className="text-sm text-[var(--text-2)] truncate">
                        {project.projectType || project.trade || 'Projet'} - {project.city || 'Ville non renseignee'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {(() => {
                        const badge = getOpportunityBadge(opportunityScore(project, artisanTrades));
                        return (
                          <span
                            className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                            style={{ color: badge.color, background: badge.bg, borderColor: badge.border }}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}

                      <span className="text-[var(--text-2)] text-xs">
                        {project.budget || 'Budget non renseigne'}
                      </span>
                    </div>

                    <span className={`mt-auto text-sm font-semibold ${
                      index === 0 ? 'text-[var(--impact-cta)]' : 'text-green-400'
                    }`}>Voir le dossier</span>
                  </button>
                )) : Array.from({ length: 3 }).map((_, index) => (
                  <button
                    key={`locked-top-${index}`}
                    type="button"
                    onClick={() => openUpgradeModal('topAiOpportunities')}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-left transition-colors duration-200 hover:border-green-500/25"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-bold text-[var(--text-3)]">
                        #{index + 1}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-2)]">
                        <Lock className="h-3 w-3 text-green-500" />
                        Performance
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-4 w-2/3 rounded bg-[var(--bg-hover)]" />
                      <div className="h-3 w-1/2 rounded bg-[var(--bg-hover)]/80" />
                    </div>
                    <p className="mt-4 text-xs leading-5 text-[var(--text-3)]">
                      Classement des dossiers prioritaires disponible avec Performance.
                    </p>
                  </button>
                ))}
              </div>
            </>
            </FeatureGate>
          )}

          {showCommercialWorkspace && (
          <>
          {/* ZONE 2 — Toggles */}
          <div>
            <div className="relative my-8 border-t border-[var(--border)]">
              <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-[var(--bg)] px-4 text-xs uppercase tracking-[0.08em] text-[var(--text-2)]">
                Voir plus de détails
              </span>
            </div>

            {false && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="contents">
              <button
                onClick={() => togglePanel('pipeline')}
                aria-label={!canAccessFeature('commercialPipeline') ? 'Pipeline commerciale — disponible avec Performance' : undefined}
                className={`flex min-h-20 items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 backdrop-blur-[1px] transition-colors duration-200 sm:px-5 ${
                  !canAccessFeature('commercialPipeline')
                    ? 'cursor-pointer border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/55 opacity-80 hover:bg-[var(--bg-elevated)]/70'
                    : openPanel === 'pipeline'
                      ? 'border-green-500 bg-green-500/[0.08] shadow-[0_0_0_1px_rgba(34,197,94,0.25)]'
                      : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-green-500/25 hover:bg-green-500/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3
                    className={`h-[22px] w-[22px] shrink-0 ${
                      !canAccessFeature('commercialPipeline')
                        ? 'text-[var(--text-3)]'
                        : openPanel === 'pipeline'
                          ? 'text-green-400'
                          : 'text-[var(--text-2)]'
                    }`}
                  />

                  <div className="flex flex-col text-left">
                    <span className={`text-[15px] font-bold ${!canAccessFeature('commercialPipeline') ? 'text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}>
                      Pipeline commerciale
                    </span>
                    <span className="text-xs text-[var(--text-2)]">
                      {!canAccessFeature('commercialPipeline')
                        ? 'Vue Kanban complète'
                        : `${pipelineSteps.length} étapes · ${allProjects.length} dossiers`}
                    </span>
                  </div>
                </div>

                {!canAccessFeature('commercialPipeline') ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[11px] font-semibold text-green-500">
                    <Lock className="h-3 w-3" />
                    Performance
                  </span>
                ) : (
                  <ChevronDown
                    className={`h-[18px] w-[18px] shrink-0 text-[var(--text-2)] transition-transform duration-200 ${
                      openPanel === 'pipeline' ? 'rotate-180' : 'animate-bounce'
                    }`}
                  />
                )}
              </button>
              </div>

              <div className="contents">
              <button
                onClick={() => togglePanel('chantiers')}
                aria-label={!canAccessFeature('geoProjects') ? 'Chantiers géolocalisés — disponible avec Performance' : undefined}
                className={`flex min-h-20 items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 backdrop-blur-[1px] transition-colors duration-200 sm:px-5 ${
                  !canAccessFeature('geoProjects')
                    ? 'cursor-pointer border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/55 opacity-80 hover:bg-[var(--bg-elevated)]/70'
                    : openPanel === 'chantiers'
                      ? 'border-green-500 bg-green-500/[0.08] shadow-[0_0_0_1px_rgba(34,197,94,0.25)]'
                      : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-green-500/25 hover:bg-green-500/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin
                    className={`h-[22px] w-[22px] shrink-0 ${
                      !canAccessFeature('geoProjects')
                        ? 'text-[var(--text-3)]'
                        : openPanel === 'chantiers'
                          ? 'text-green-400'
                          : 'text-[var(--text-2)]'
                    }`}
                  />

                  <div className="flex flex-col text-left">
                    <span className={`text-[15px] font-bold ${!canAccessFeature('geoProjects') ? 'text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}>
                      Chantiers géolocalisés
                    </span>
                    <span className="text-xs text-[var(--text-2)]">
                      {!canAccessFeature('geoProjects')
                        ? 'Vue géographique des chantiers'
                        : `Vue géographique · ${sortedProjects.slice(0, 8).length} points`}
                    </span>
                  </div>
                </div>

                {!canAccessFeature('geoProjects') ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[11px] font-semibold text-green-500">
                    <Lock className="h-3 w-3" />
                    Performance
                  </span>
                ) : (
                  <ChevronDown
                    className={`h-[18px] w-[18px] shrink-0 text-[var(--text-2)] transition-transform duration-200 ${
                      openPanel === 'chantiers' ? 'rotate-180' : 'animate-bounce'
                    }`}
                  />
                )}
              </button>
              </div>
            </div>
            )}
          </div>

            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
              <div
                className={`rounded-2xl border p-4 sm:p-5 ${
                  !canAccessFeature('geoProjects')
                    ? 'border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/55 opacity-80'
                    : 'border-[var(--border)] bg-[var(--bg-elevated)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className={`h-5 w-5 ${!canAccessFeature('geoProjects') ? 'text-[var(--text-3)]' : 'text-green-400'}`} />
                      <h3 className={`text-[15px] font-bold ${!canAccessFeature('geoProjects') ? 'text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}>
                        Carte des chantiers
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-2)]">
                      {!canAccessFeature('geoProjects')
                        ? 'Vue géographique des dossiers disponible avec Performance'
                        : `${geoSummary.mapProjects.length} dossiers affichés sur la carte`}
                    </p>
                  </div>

                  {!canAccessFeature('geoProjects') ? (
                    <button
                      type="button"
                      onClick={() => openUpgradeModal('geoProjects')}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[11px] font-semibold text-green-500"
                    >
                      <Lock className="h-3 w-3" />
                      Performance
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => togglePanel('chantiers')}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] transition-colors hover:border-green-500/30 hover:text-[var(--text-1)]"
                    >
                      {openPanel === 'chantiers' ? 'Réduire la carte' : 'Agrandir la carte'}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openPanel === 'chantiers' ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]" style={{ height: isMobile ? '220px' : '250px' }}>
                  {canAccessFeature('geoProjects') ? (
                    <ProspectsLeafletMap
                      projects={geoSummary.mapProjects}
                      onSelectProject={(projectId) => router.push(`/dashboard-v2/projet/${projectId}`)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--text-2)]">
                      Activez Performance pour afficher la carte géolocalisée des dossiers.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-bold text-[var(--text-1)]">Zones et priorités</h3>
                    <p className="mt-1 text-xs text-[var(--text-2)]">
                      Synthèse géographique et commerciale basée sur les dossiers déjà affichés.
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-semibold text-[var(--text-2)]">
                    {geoSummary.projects.length} dossier(s)
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-3)]">Géolocalisés</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--text-1)]">{geoSummary.geolocatedCount}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-3)]">Adresse manquante</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--text-1)]">{geoSummary.missingAddressCount}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-3)]">Urgents</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-300">{geoSummary.urgentCount}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-3)]">Devis envoyés</p>
                    <p className="mt-2 text-2xl font-semibold text-blue-300">{geoSummary.quotesSentCount}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-3)]">Acomptes à suivre</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--text-1)]">{geoSummary.depositsPendingCount}</p>
                    <p className="mt-1 text-xs text-[var(--text-2)]">Dossiers avec acompte à demander ou relancer.</p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-3)]">Top zones</p>
                    {geoSummary.topCities.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {geoSummary.topCities.map(([city, count]) => (
                          <div key={city} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate text-[var(--text-1)]">{city}</span>
                            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-2)]">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--text-2)]">Aucune ville renseignée sur les dossiers affichés.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          {/* ZONE 3 — Panneau accordéon */}
          {false && (
          <div
            className="rounded-2xl border border-[var(--border)] overflow-hidden transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none"
            style={{
              maxHeight: openPanel === 'pipeline' ? '600px' : '0px',
              opacity: openPanel === 'pipeline' ? 1 : 0,
            }}
          >
            {openPanel === 'pipeline' && !loading && (
               <div className="p-4 sm:p-6">
                <h3 className="text-[var(--text-1)] font-semibold mb-3">Pipeline</h3>

                <div>
                  {pipelineSteps.map((step) => {
                    const style = BADGE_STYLES[step.label] || { bg: 'var(--badge-new-bg)', color: 'var(--badge-new-text)' };
                    const total = allProjects.length || 1;
                    const pct = step.value > 0 ? Math.max(Math.round((step.value / total) * 100), 4) : 0;

                    return (
                      <div
                        key={step.label}
                        style={{
                          padding: '10px 14px',
                          background: 'var(--bg-elevated)',
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
                            background: 'var(--border)',
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
          )}

          <div
            className="rounded-2xl border border-[var(--border)] overflow-hidden transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none"
            style={{
              maxHeight: openPanel === 'chantiers' ? '720px' : '0px',
              opacity: openPanel === 'chantiers' ? 1 : 0,
            }}
          >
            {openPanel === 'chantiers' && !loading && (
               <div className="p-4 sm:p-6">
                <h3 className="text-[var(--text-1)] font-semibold mb-3">📍 Chantiers</h3>

                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-[var(--text-2)]">Vue détaillée de la carte des chantiers.</p>
                  <button
                    type="button"
                    onClick={() => togglePanel('chantiers')}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] transition-colors hover:border-green-500/30 hover:text-[var(--text-1)]"
                  >
                    Réduire
                    <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                  </button>
                </div>

                 <div style={{ height: isMobile ? '320px' : '440px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <ProspectsLeafletMap
                    projects={geoSummary.mapProjects}
                    onSelectProject={(projectId) => router.push(`/dashboard-v2/projet/${projectId}`)}
                  />
                </div>
              </div>
            )}
          </div>

          </>
          )}

          {/* ZONE 4 — Liste projets, pleine largeur */}
          <div id="project-list-section" className="space-y-4 w-full">
            {showClientsWorkspace ? (
              <ClientsV2List onOpenProject={(projectId) => router.push(`/dashboard-v2/projet/${projectId}`)} onOpenClient={(clientId) => router.push(`/dashboard-v2/clients/${clientId}`)} />
            ) : (
            <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:min-w-[260px] sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-3)]" />

                <Input
                  className="pl-9 rounded-[10px] py-2.5 focus:border-green-500"
                  placeholder={showClientsWorkspace ? 'Nom, e-mail, téléphone, ville...' : 'Client, besoin, ville...'}
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    debouncedSearch(e.target.value);
                  }}
                />
              </div>

              {showCommercialWorkspace && (
              <button
                type="button"
                onClick={() => {
                  setQuickFilter(quickFilter === 'hot' ? null : 'hot');
                  setFilters(DEFAULT_FILTERS);
                  setSearchInput('');
                }}
                className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border px-4 py-2 text-sm font-semibold sm:w-auto ${
                  quickFilter === 'hot'
                    ? 'border-green-500/40 bg-green-500/[0.08] text-green-400'
                    : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-2)] hover:border-green-500/25'
                }`}
              >
                <Bell className="h-4 w-4" />
                Prospects chauds
              </button>
              )}

              {showCommercialWorkspace && (
              <button
                type="button"
                onClick={() => {
                  setQuickFilter(quickFilter === 'risk' ? null : 'risk');
                  setFilters(DEFAULT_FILTERS);
                  setSearchInput('');
                }}
                className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border px-4 py-2 text-sm font-semibold sm:w-auto ${
                  quickFilter === 'risk'
                    ? 'border-red-500/40 bg-red-500/[0.08] text-red-300'
                    : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-2)] hover:border-red-500/25'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                En risque
              </button>
              )}

              <Select value={filters.statut} onValueChange={(v) => updateFilter('statut', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={showClientsWorkspace ? 'Tous les types de clients' : 'Tous les statuts'} />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">{showClientsWorkspace ? 'Tous les types de clients' : 'Tous les statuts'}</SelectItem>

                  {showClientsWorkspace
                    ? RELATION_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} style={{ color: RELATION_STATUS_STYLES[o.value]?.color }}>
                          ● {o.label}
                        </SelectItem>
                      ))
                    : STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} style={{ color: BADGE_STYLES[o.value]?.color }}>
                          ● {o.label}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>

              <Select value={filters.metier} onValueChange={(v) => updateFilter('metier', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[180px]">
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

              <FeatureGate feature="advancedFilters" requiredPlan="performance">
              <Select value={filters.budget} onValueChange={(v) => updateFilter('budget', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
              </FeatureGate>

              <FeatureGate feature="advancedFilters" requiredPlan="performance">
              <Select value={filters.score} onValueChange={(v) => updateFilter('score', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[160px]">
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
              </FeatureGate>

              <FeatureGate feature="advancedFilters" requiredPlan="performance">
              <Select value={filters.periode} onValueChange={(v) => updateFilter('periode', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
              </FeatureGate>

              <FeatureGate feature="advancedFilters" requiredPlan="performance">
              <Select value={filters.source} onValueChange={(v) => updateFilter('source', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
              </FeatureGate>

              {!showClientsWorkspace && responsibleOptions.length > 0 && (
                <Select value={filters.responsible || 'all'} onValueChange={(v) => updateFilter('responsible', v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Tous les responsables du dossier" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">Tous les responsables du dossier</SelectItem>
                    {currentUserId && <SelectItem value={currentUserId}>Mes dossiers</SelectItem>}
                    <SelectItem value="unassigned">Sans responsable</SelectItem>
                    {responsibleOptions.map((option) => (
                      <SelectItem key={option.userId} value={option.userId}>
                        {option.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                    className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-2)] transition-colors duration-150 hover:border-red-600 hover:text-red-600 sm:w-auto"
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
                  <FilterPill
                    label={`Statut: ${showClientsWorkspace ? RELATION_STATUS_LABELS[filters.statut as ClientRelationshipStatus] ?? filters.statut : filters.statut}`}
                    onRemove={() => updateFilter('statut', '')}
                  />
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
                {filters.responsible && (
                  <FilterPill
                    label={`Responsable du dossier: ${
                      filters.responsible === 'unassigned'
                        ? 'Sans responsable'
                        : filters.responsible === currentUserId
                          ? 'Mes dossiers'
                          : responsibleOptions.find((option) => option.userId === filters.responsible)?.displayName ?? filters.responsible
                    }`}
                    onRemove={() => updateFilter('responsible', '')}
                  />
                )}
              </div>
            )}

            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--text-2)]">
                {showClientsWorkspace
                  ? `${displayedClients.length} client(s) trouvé(s)`
                  : hasActiveFilters
                    ? `${displayedProjects.length} dossier(s) sur ${allProjects.length} total`
                    : `${displayedProjects.length} dossier(s) trouvé(s)`}
              </p>

              {showCommercialWorkspace && (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                {!showClientsWorkspace && (
                  <>
                    {currentUserId && (
                      <button
                        type="button"
                        onClick={() => updateFilter('responsible', filters.responsible === currentUserId ? '' : currentUserId)}
                        className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          filters.responsible === currentUserId
                            ? 'border-green-500/40 bg-green-500/[0.08] text-green-300'
                            : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-2)]'
                        }`}
                      >
                        Mes dossiers · {myProjectsCount}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => updateFilter('responsible', filters.responsible === 'unassigned' ? '' : 'unassigned')}
                      className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        filters.responsible === 'unassigned'
                          ? 'border-amber-500/40 bg-amber-500/[0.08] text-amber-200'
                          : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-2)]'
                      }`}
                    >
                        Sans responsable · {unassignedProjectsCount}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setView('list')}
                    className={`min-h-11 flex-1 rounded-lg px-4 py-2 text-sm transition-colors duration-150 sm:flex-none ${
                    viewMode === 'list'
                      ? 'bg-green-500 font-semibold text-zinc-950'
                      : 'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  📋 Liste
                </button>

                <FeatureGate feature="kanbanView" requiredPlan="performance">
                <button
                  type="button"
                  onClick={() => setView('kanban')}
                    className={`min-h-11 flex-1 rounded-lg px-4 py-2 text-sm transition-colors duration-150 sm:flex-none ${
                    viewMode === 'kanban'
                      ? 'bg-green-500 font-semibold text-zinc-950'
                      : 'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  🗂️ Suivi par étapes
                </button>
                </FeatureGate>

                <div className="relative w-full sm:w-auto" ref={exportMenuRef}>
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen((v) => !v)}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-1)] transition-colors duration-150 hover:border-green-500/30 sm:w-auto sm:justify-start"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exporter
                  </button>

                  {exportMenuOpen && (
                    <div className="absolute left-0 right-0 z-50 mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.4)] sm:left-auto sm:right-0 sm:w-80 sm:max-w-[calc(100vw-2rem)]">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="block w-full rounded-lg px-4 py-2.5 text-left text-sm text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
                      >
                        Export CSV
                          <p className="text-xs text-[var(--text-2)]">Tous les dossiers affichés actuellement</p>
                      </button>

                      {canExportPdf ? (
                        <button
                          type="button"
                          onClick={() => handleExportPDF('list')}
                          className="block w-full rounded-lg px-4 py-2.5 text-left text-sm text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
                        >
                          Export PDF
                          <p className="text-xs text-[var(--text-2)]">Version PDF de la liste en cours</p>
                        </button>
                      ) : (
                        <FeatureGate feature="pdfExports" requiredPlan="performance" variant="menuItem">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm text-[var(--text-2)]"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium text-[var(--text-1)]">Export PDF</span>
                              <span className="block text-xs text-[var(--text-2)]">Version PDF de la liste en cours</span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)]/80 px-2 py-1 text-[11px] font-semibold text-[var(--text-2)]">
                              <Lock className="h-3 w-3 text-green-500" />
                              Performance
                            </span>
                          </button>
                        </FeatureGate>
                      )}

                      <div className="my-1 border-t border-[var(--border)]" />

                      {canExportMonthlyReport ? (
                        <button
                          type="button"
                          onClick={() => handleExportPDF('monthly')}
                          className="block w-full rounded-lg px-4 py-2.5 text-left text-sm text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
                        >
                          Rapport mensuel
                          <p className="text-xs text-[var(--text-2)]">Synthèse PDF du mois en cours</p>
                        </button>
                      ) : (
                        <FeatureGate feature="monthlyPdfReport" requiredPlan="performance" variant="menuItem">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm text-[var(--text-2)]"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium text-[var(--text-1)]">Rapport mensuel</span>
                              <span className="block text-xs text-[var(--text-2)]">Synthèse PDF du mois en cours</span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)]/80 px-2 py-1 text-[11px] font-semibold text-[var(--text-2)]">
                              <Lock className="h-3 w-3 text-green-500" />
                              Performance
                            </span>
                          </button>
                        </FeatureGate>
                      )}
                    </div>
                  )}

                  {hasActiveFilters && (
                    <p className="mt-1 text-right text-xs text-[var(--text-2)]">
                      {filteredProjects.length} dossier(s) sélectionné(s)
                    </p>
                  )}
                </div>
              </div>
              )}
            </div>

            {quickFilter && (
              <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--text-2)]">
                  Filtre actif :{' '}
                  <span className="text-[var(--text-1)] font-medium">
                    {quickFilter === 'today'
                      ? 'Relances du jour'
                      : quickFilter === 'overdue' || quickFilter === 'relance'
                        ? 'Relances à faire'
                        : quickFilter === 'hot'
                          ? 'Prospects chauds'
                          : quickFilter === 'risk'
                            ? 'Dossiers à ne pas oublier'
                            : quickFilter === 'opportunities'
                              ? 'Dossiers à traiter en priorité'
                              : quickFilter === 'calls'
                                ? 'Appels à faire'
                                : quickFilter === 'quotes'
                                  ? 'Devis à envoyer'
                                  : quickFilter === 'followups'
                                    ? 'Relances à faire'
                                    : 'Priorités du jour'}
                  </span>
                </p>

                  <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => setQuickFilter(null)}>
                  Voir tous les dossiers
                </Button>
              </div>
            )}

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl bg-[var(--bg-hover)]" />
                ))}
              </div>
            ) : (showClientsWorkspace ? displayedClients.length === 0 : displayedProjects.length === 0) ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center sm:p-16">
                <SearchX className="w-10 h-10 text-[var(--text-3)] mx-auto mb-3" />
                <p className="font-bold text-[var(--text-1)]">{showClientsWorkspace ? 'Aucun client pour le moment' : 'Aucun dossier pour le moment'}</p>

                <p className="text-[var(--text-2)] mt-1">
                  {quickFilter === 'calls' || quickFilter === 'quotes' || quickFilter === 'followups'
                    ? 'Aucun dossier dans cette sélection pour le moment.'
                    : filters.search
                      ? `Aucun résultat pour '${filters.search}'`
                      : filters.statut
                        ? showClientsWorkspace
                          ? `Aucun client avec le statut '${RELATION_STATUS_LABELS[filters.statut as ClientRelationshipStatus] ?? filters.statut}'`
                          : `Aucun dossier avec le statut '${filters.statut}'`
                        : showClientsWorkspace
                          ? 'Les nouveaux clients apparaîtront ici.'
                          : 'Les demandes de vos clients apparaîtront ici.'}
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-[10px] bg-green-500 px-6 py-3 text-sm font-semibold text-zinc-950"
                  >
                    Effacer les filtres
                  </button>
                )}
              </div>
            ) : showClientsWorkspace ? (
              <ClientPortfolioList clients={displayedClients} router={router} />
            ) : viewMode === 'kanban' ? (
              <KanbanBoard projects={displayedProjects} router={router} onStatusChange={handleStatusChange} />
            ) : (
              <ProjectList projects={displayedProjects} router={router} />
            )}
            </>
            )}
          </div>
      </div>
      )}
      {isMobile && <div style={{ height: '76px' }} />}
      </>
      )}
      {false && isMobile && dashboardMode !== 'value' && (
        <MobileBottomNav
          dashboardMode={dashboardMode}
          setDashboardMode={setDashboardMode}
          goToCommercialFilter={goToCommercialFilter}
          onFabClick={() => setDashboardMode('value')}
          onMenuClick={() => setDashboardMode('value')}
        />
      )}

      <div
        className={`fixed bottom-4 left-4 right-4 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-opacity duration-300 sm:bottom-6 sm:left-auto sm:right-6 sm:px-5 sm:py-3.5 ${
          toast.visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        } ${toast.error ? 'border-red-600 bg-[var(--bg-elevated)] text-red-400' : 'border-green-500/30 bg-[var(--bg-elevated)] text-[var(--text-1)]'}`}
      >
        {toast.error ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
        {toast.message}
      </div>

      {calendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-green-400" />
              <p className="font-bold text-[var(--text-1)]">Bientot disponible</p>
            </div>
            <p className="text-sm leading-6 text-[var(--text-2)]">
              La synchronisation Google Calendar est preparee, mais l'authentification OAuth n'est pas encore activee.
            </p>
            <button
              type="button"
              onClick={() => setCalendarModalOpen(false)}
              className="mt-5 w-full rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-zinc-950"
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {upgradeFeature && (
        <UpgradeModal
          feature={upgradeFeature}
          requiredPlan="performance"
          onClose={() => setUpgradeFeature(null)}
        />
      )}

      {planModalOpen && (
        <PlanChangeModal currentPlan={plan} onClose={() => setPlanModalOpen(false)} />
      )}

      {commercialClosureRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeCommercialClosureModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="m-0 text-lg font-bold text-[var(--text-1)]">
                  {getCommercialClosureCopy(commercialClosureRequest.status).title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-2)]">
                  {getCommercialClosureCopy(commercialClosureRequest.status).description}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCommercialClosureModal}
                className="text-[var(--text-2)] transition hover:text-[var(--text-1)]"
                aria-label="Fermer la confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-2)]">
              Dossier concerné : <span className="font-semibold text-[var(--text-1)]">{commercialClosureRequest.projectLabel}</span>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCommercialClosureModal}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--text-1)] transition hover:border-green-500/30 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmCommercialClosure}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition hover:brightness-110 ${
                  commercialClosureRequest.status === 'Gagné'
                    ? 'bg-green-500 text-zinc-950'
                    : 'bg-red-500 text-white'
                }`}
              >
                {getCommercialClosureCopy(commercialClosureRequest.status).confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
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
        className="hidden md:grid grid-cols-12 gap-4 bg-[var(--bg-elevated)] rounded-t-xl text-[var(--text-3)] uppercase tracking-widest"
        style={{ fontSize: '11px', padding: '10px 16px' }}
      >
        <span className="col-span-1">Dossier</span>
        <span className="col-span-1">Reçu</span>
        <span className="col-span-2">Client</span>
        <span className="col-span-1">Besoin</span>
        <span className="col-span-2">Responsable du dossier</span>
        <span className="col-span-1">Ville</span>
        <span className="col-span-1">Dossier renseigné</span>
        <span className="col-span-1">Historique</span>
        <span className="col-span-1">Statut</span>
        <span className="col-span-1"></span>
      </div>

      {projects.map((p) => (
        <div
          key={p.id}
          className="border-b border-[var(--border)]/50 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors duration-100 px-4 py-3 md:p-0 cursor-pointer"
          onClick={() => router.push(`/dashboard-v2/projet/${p.id}`)}
        >
          <div className="hidden md:grid grid-cols-12 gap-4 items-center" style={{ fontSize: '13px', padding: '12px 16px' }}>
            <span
              className="col-span-1 text-[var(--text-2)]"
              style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {p.projectType || p.trade || 'Dossier'}
            </span>

            <ReceivedAtLabel dateLike={p.createdAt} className="col-span-1 text-[var(--text-2)]" />

            <span className="col-span-2 flex items-center gap-2 font-medium text-[var(--text-1)] truncate">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--border)] text-xs font-bold text-[var(--text-1)]">
                {`${p.clientFirstName?.[0] || ''}${p.clientName?.[0] || ''}`.toUpperCase() || '?'}
              </span>
              {p.clientFirstName} {p.clientName}
            </span>

            <span
              className="col-span-1 text-[var(--text-2)]"
              style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {p.trade || p.projectType || '—'}
            </span>

            <span className="col-span-1 text-[var(--text-2)] truncate">
              {p.city || '—'}
            </span>

            <span className="col-span-2 text-[var(--text-2)]">
              <ProjectResponsibleInline responsibleUser={p.responsibleUser || null} responsibleUserId={p.responsibleUserId || null} />
            </span>

            <span className="col-span-1">
              <ScorePill score={p.completenessScore || 0} />
            </span>

            <span className="col-span-1">
              <ActivityCell activity={p.clientActivity} />
            </span>

            <span className="col-span-1">
              <StatusBadge status={p.status} />
            </span>

            <span className="col-span-1 text-right">
              <ChevronRight className="w-4 h-4 text-[var(--text-2)] inline" />
            </span>
          </div>

          <div className="space-y-3 md:hidden">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--border)] text-xs font-bold text-[var(--text-1)]">
                {`${p.clientFirstName?.[0] || ''}${p.clientName?.[0] || ''}`.toUpperCase() || '?'}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text-1)]">
                    {p.clientFirstName} {p.clientName}
                  </span>
                  <StatusBadge status={p.status} />
                </div>

                <p className="mt-1 text-sm text-[var(--text-2)]">
                  {p.trade || p.projectType || 'Projet'}
                </p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-2)]">
              {p.city || 'Ville non renseignee'}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-2)]">
              <ProjectResponsibleInline responsibleUser={p.responsibleUser || null} responsibleUserId={p.responsibleUserId || null} />
              <span className="text-[var(--text-3)]">•</span>
              <ScorePill score={p.completenessScore || 0} />
            </div>

            <ActivityCell activity={p.clientActivity} compact />

            <div className="flex items-center justify-between gap-3">
              <ReceivedAtLabel dateLike={p.createdAt} className="text-xs text-[var(--text-3)]" />
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-400">
                Voir le dossier
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
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
    <div className="w-full overflow-hidden">
      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 px-1 [scroll-snap-type:x_mandatory] md:grid md:min-w-0 md:grid-cols-3 md:[scroll-snap-type:none] xl:grid-cols-5">
        {KANBAN_GROUPED_COLUMNS.map((col) => {
          const colProjects = sortKanbanProjects(
            projects.filter((p) => col.statuses.includes(p.status || '')),
            col.id,
          );
          const total = colProjects.reduce((sum, p) => sum + (p.devisAmount || parseBudget(p.budget || '')), 0);
          const isClosed = col.id === 'closed';
          const headerColor = col.color;
          const isOver = overColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(col.id);
              }}
              onDragLeave={() => setOverColumn((prev) => (prev === col.id ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) {
                  const draggedProject = projects.find((project) => project.id === dragId);
                  onStatusChange(dragId, resolveKanbanDropStatus(draggedProject, col));
                }
                setDragId(null);
                setOverColumn(null);
              }}
              style={{ borderTop: `3px solid ${col.color}` }}
              className={`flex min-w-[280px] flex-col rounded-2xl border bg-[var(--bg-elevated)] transition-colors duration-200 [scroll-snap-align:start] sm:min-w-[320px] md:min-w-0 ${
                isOver ? 'border-green-500 bg-green-500/[0.04]' : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <span className="text-sm font-bold text-[var(--text-1)]">
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
                  <div className="py-8 text-center text-sm text-[var(--text-3)]">
                    <FolderOpen className="mx-auto mb-2 h-6 w-6 text-[var(--text-3)]" />
                    Aucun dossier dans cette étape pour le moment
                  </div>
                ) : (
                  colProjects.map((p) => (
                    <KanbanCard
                      key={p.id}
                      project={p}
                      router={router}
                      isDragging={dragId === p.id}
                      isClosed={isClosed}
                      onDragStart={() => setDragId(p.id)}
                      onDragEnd={() => setDragId(null)}
                    />
                  ))
                )}
              </div>

              <div className="border-t border-[var(--border)] px-2 py-2 text-center text-xs text-[var(--text-2)]">
                {colProjects.length} dossier{colProjects.length === 1 ? '' : 's'} · {formatAmount(total)} de potentiel
              </div>
            </div>
          );
        })}
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-[var(--text-3)] md:hidden">← Faites glisser pour voir les autres étapes →</p>
    </div>
  );
}

function KanbanCard({
  project,
  router,
  isDragging,
  isClosed,
  onDragStart,
  onDragEnd,
}: {
  project: Project;
  router: ReturnType<typeof useRouter>;
  isDragging: boolean;
  isClosed: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const score = project.completenessScore || 0;
  const scoreColor = score >= 80 ? 'var(--accent)' : score >= 60 ? '#f59e0b' : score > 0 ? '#dc2626' : 'var(--text-2)';
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
      className={`cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-500/30 ${
        isClosed ? 'bg-[var(--bg-hover)]/40' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--border)] text-xs font-bold text-[var(--text-1)]">
          {initials}
        </span>

        <span className="truncate text-sm font-semibold text-[var(--text-1)]">
          {project.clientFirstName} {project.clientName}
        </span>

        <StatusBadge status={project.status} />
      </div>

      <p className="mt-1.5 truncate text-xs text-[var(--text-2)]">{project.projectType || project.trade || 'Projet'}</p>

      <p className="truncate text-xs text-[var(--text-2)]">
        {project.city || '—'} · {project.budget || '—'}
      </p>

      <div className="mt-2">
        <ProjectResponsibleInline responsibleUser={project.responsibleUser || null} responsibleUserId={project.responsibleUserId || null} />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: scoreColor }}>
          Dossier renseigné à {score}%
        </span>

        <ReceivedAtLabel dateLike={project.createdAt} className="ml-auto text-xs text-[var(--text-3)]" />
      </div>

      {Boolean(project.clientActivity?.unreadCount) && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-bold text-green-400">
            {project.clientActivity!.unreadCount}{' '}
            {project.clientActivity!.unreadCount! > 1 ? 'nouveautés' : 'à lire'}
          </span>
        </div>
      )}
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

function formatShortDate(dateLike?: string): string {
  if (!dateLike) return '—';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function ClientPortfolioList({
  clients,
  router,
}: {
  clients: ClientSummary[];
  router: ReturnType<typeof useRouter>;
}) {
  const openClient = (c: ClientSummary) => {
    const target = c.nextActionProject?.id || c.latestProject?.id || c.projects[0]?.id;
    if (target) router.push(`/dashboard-v2/projet/${target}`);
  };

  return (
    <div>
      <div
        className="hidden md:grid grid-cols-12 gap-4 bg-[var(--bg-elevated)] rounded-t-xl text-[var(--text-3)] uppercase tracking-widest"
        style={{ fontSize: '11px', padding: '10px 16px' }}
      >
        <span className="col-span-2">Client</span>
        <span className="col-span-2">Contact</span>
        <span className="col-span-2">Dernière demande</span>
        <span className="col-span-2">Historique</span>
        <span className="col-span-2">Valeur client</span>
        <span className="col-span-1">Prochaine action</span>
        <span className="col-span-1"></span>
      </div>

      {clients.map((c) => (
        <div
          key={c.id}
          className="border-b border-[var(--border)]/50 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors duration-100 px-4 py-3 md:p-0 cursor-pointer"
          onClick={() => openClient(c)}
        >
          <div className="hidden md:grid grid-cols-12 gap-4 items-center" style={{ fontSize: '13px', padding: '12px 16px' }}>
            <span className="col-span-2 min-w-0">
              <span className="flex items-center gap-2 font-medium text-[var(--text-1)] truncate">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--border)] text-xs font-bold text-[var(--text-1)]">
                  {c.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </span>
                <span className="truncate">{c.name}</span>
              </span>
              <span className="mt-1 block text-xs text-[var(--text-3)] truncate">{c.city || 'Ville non renseignée'}</span>
              <span className="mt-1 inline-block"><RelationBadge status={c.relationshipStatus} /></span>
            </span>

            <span className="col-span-2 min-w-0 text-[var(--text-2)]">
              <span className="block truncate">{c.email || 'Email non renseigné'}</span>
              <span className="block truncate text-xs text-[var(--text-3)]">{c.phone || 'Téléphone non renseigné'}</span>
            </span>

            <span className="col-span-2 min-w-0 text-[var(--text-2)]">
              <span className="block truncate">{c.latestProject?.projectType || c.latestProject?.trade || 'Projet'}</span>
              <span className="block text-xs text-[var(--text-3)]">{formatShortDate(c.latestProject?.createdAt)}</span>
              <span className="mt-1 inline-block"><StatusBadge status={c.latestProject?.status} /></span>
            </span>

            <span className="col-span-2 text-[var(--text-2)] truncate">
              {c.projectsCount} dossier(s) / {c.quotesSentCount} devis envoyé(s) / {c.quotesAcceptedCount} gagné(s)
            </span>

            <span className="col-span-2 text-[var(--text-2)] truncate">
              {c.wonRevenue > 0 || c.potentialRevenue > 0
                ? [
                    c.wonRevenue > 0 ? `Gagné : ${formatCurrency(c.wonRevenue)}` : null,
                    c.potentialRevenue > 0 ? `Potentiel : ${formatCurrency(c.potentialRevenue)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' / ')
                : '—'}
            </span>

            <span className="col-span-1 text-[var(--text-2)] truncate">{c.nextActionLabel || 'Aucune action'}</span>
            <span className="col-span-1 text-right"><ChevronRight className="w-4 h-4 text-[var(--text-2)] inline" /></span>
          </div>

          <div className="md:hidden flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--border)] text-xs font-bold text-[var(--text-1)]">
              {c.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-[var(--text-1)]">{c.name}</span>
                <RelationBadge status={c.relationshipStatus} />
              </div>

              <div className="mt-1 text-xs text-[var(--text-2)]">
                <p className="truncate">{c.email || c.phone || 'Contact non renseigné'}</p>
                <p className="truncate">
                  {c.latestProject?.projectType || c.latestProject?.trade || 'Projet'} · {formatShortDate(c.latestProject?.createdAt)}
                </p>
                <p className="truncate">
                  {c.projectsCount} dossier(s) / {c.quotesSentCount} devis envoyé(s) / {c.quotesAcceptedCount} gagné(s)
                </p>
                <p className="truncate">
                  {c.wonRevenue > 0 || c.potentialRevenue > 0
                    ? [
                        c.wonRevenue > 0 ? `Gagné : ${formatCurrency(c.wonRevenue)}` : null,
                        c.potentialRevenue > 0 ? `Potentiel : ${formatCurrency(c.potentialRevenue)}` : null,
                      ]
                        .filter(Boolean)
                        .join(' / ')
                    : '—'}
                </p>
                <p className="mt-1 font-medium text-[var(--text-1)]">{c.nextActionLabel || 'Aucune action'}</p>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-[var(--text-2)] shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RelationBadge({ status }: { status: ClientRelationshipStatus }) {
  const style = RELATION_STATUS_STYLES[status];

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
      {RELATION_STATUS_LABELS[status]}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const style = BADGE_STYLES[status || ''] || { bg: 'var(--badge-new-bg)', color: 'var(--badge-new-text)' };

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

function PriorityMetric({ label, value, onClick, active }: { label: string; value: number; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
        active
          ? 'border-green-500/40 bg-green-500/[0.06]'
          : 'border-[var(--border)] bg-[var(--bg)] hover:border-green-500/30'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <p className="text-2xl font-bold tracking-tight text-[var(--text-1)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-2)]">{label}</p>
    </button>
  );
}

const USAGE_STATUS_LABELS: Record<UsageStatus, string> = {
  ok: 'OK',
  warning: 'Proche limite',
  limit_reached: 'Limite atteinte',
  exceeded: 'Dépassé',
};

const USAGE_STATUS_STYLES: Record<UsageStatus, { background: string; border: string; color: string }> = {
  ok: { background: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: 'var(--accent)' },
  warning: { background: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b' },
  limit_reached: { background: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', color: '#f97316' },
  exceeded: { background: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' },
};

function combineUsageStatusUi(a: UsageStatus, b: UsageStatus): UsageStatus {
  const order: UsageStatus[] = ['ok', 'warning', 'limit_reached', 'exceeded'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

function UsageStatusBadge({ status }: { status: UsageStatus }) {
  const style = USAGE_STATUS_STYLES[status];
  return (
    <span
      className="rounded-full border px-3 py-1 text-xs font-semibold"
      style={{ background: style.background, borderColor: style.border, color: style.color }}
    >
      {USAGE_STATUS_LABELS[status]}
    </span>
  );
}

function UsageMiniBar({ percent, status }: { percent: number | null; status: UsageStatus }) {
  const style = USAGE_STATUS_STYLES[status];
  const width = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  return (
    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
      {percent !== null && (
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: style.color }} />
      )}
    </div>
  );
}

function UsageRow({ label, value, percent, status }: { label: string; value: string; percent: number | null; status: UsageStatus }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-3)]">{label}</p>
        <p className="text-xs font-semibold text-[var(--text-1)]">{value}</p>
      </div>
      <UsageMiniBar percent={percent} status={status} />
    </div>
  );
}

function MonthlyUsageCard({
  usage,
  loading,
  error,
  isMobile,
}: {
  usage: MonthlyUsageSummary | null;
  loading: boolean;
  error: boolean;
  isMobile: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <Skeleton className="h-20 rounded-xl bg-[var(--bg-hover)]" />
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="text-xs font-semibold text-[var(--text-2)]">Utilisation</p>
        <p className="mt-2 text-sm text-[var(--text-3)]">Ces informations ne sont pas disponibles pour le moment.</p>
      </div>
    );
  }

  const globalStatus = combineUsageStatusUi(
    combineUsageStatusUi(usage.projects.status, usage.vapi.status),
    usage.assistant?.status ?? 'ok',
  );

  const projectsLabel = usage.projects.unlimited
    ? `${usage.projects.used} / Illimité`
    : `${usage.projects.used} / ${usage.projects.limit ?? 0}`;

  const callsLabel = usage.vapi.callsUnlimited
    ? `${usage.vapi.callsUsed} / Illimité`
    : usage.vapi.callsLimit === 0
      ? 'Non inclus'
      : `${usage.vapi.callsUsed} / ${usage.vapi.callsLimit}`;

  const minutesLabel = usage.vapi.minutesLimit === null
    ? `${usage.vapi.minutesUsed} min / Non limité`
    : `${usage.vapi.minutesUsed} / ${usage.vapi.minutesLimit} min`;

  const devisLabel = usage.devis.unlimited
    ? `${usage.devis.used} / Illimité`
    : `${usage.devis.used} / ${usage.devis.limit ?? 0}`;

  const assistantLabel = usage.assistant
    ? usage.assistant.limit === null
      ? `${usage.assistant.used} / Illimité`
      : `${usage.assistant.used} / ${usage.assistant.limit}`
    : null;

  return (
    <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[var(--text-1)]">Utilisation du mois</p>
        <UsageStatusBadge status={globalStatus} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <UsageRow label="Dossiers" value={projectsLabel} percent={usage.projects.unlimited ? null : usage.projects.percent} status={usage.projects.status} />
        <UsageRow label="Devis" value={devisLabel} percent={usage.devis.unlimited ? null : usage.devis.percent} status={usage.devis.status} />
        {usage.assistant && assistantLabel && (
          <UsageRow label="Messages assistant interne" value={assistantLabel} percent={usage.assistant.percent} status={usage.assistant.status} />
        )}
        <UsageRow label="Appels vocaux" value={callsLabel} percent={usage.vapi.callsUnlimited ? null : usage.vapi.callsPercent} status={usage.vapi.status} />
        <UsageRow label="Minutes" value={minutesLabel} percent={usage.vapi.minutesPercent} status={usage.vapi.status} />
      </div>

      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        className="mt-4 text-xs font-semibold text-[var(--accent)] hover:underline"
      >
        Voir le détail
      </button>

      {detailOpen && (
        <MonthlyUsageDetailModal usage={usage} onClose={() => setDetailOpen(false)} isMobile={isMobile} />
      )}
    </div>
  );
}

function MonthlyUsageDetailModal({
  usage,
  onClose,
  isMobile,
}: {
  usage: MonthlyUsageSummary;
  onClose: () => void;
  isMobile: boolean;
}) {
  const projectsLabel = usage.projects.unlimited
    ? `${usage.projects.used} / Illimité`
    : `${usage.projects.used} / ${usage.projects.limit ?? 0}`;

  const callsLabel = usage.vapi.callsUnlimited
    ? `${usage.vapi.callsUsed} / Illimité`
    : usage.vapi.callsLimit === 0
      ? 'Non inclus'
      : `${usage.vapi.callsUsed} / ${usage.vapi.callsLimit}`;

  const minutesLabel = usage.vapi.minutesLimit === null
    ? `${usage.vapi.minutesUsed} min / Non limité`
    : `${usage.vapi.minutesUsed} / ${usage.vapi.minutesLimit} min`;

  const devisLabel = usage.devis.unlimited
    ? `${usage.devis.used} / Illimité`
    : `${usage.devis.used} / ${usage.devis.limit ?? 0}`;

  const assistantLabel = usage.assistant
    ? usage.assistant.limit === null
      ? `${usage.assistant.used} / Illimité`
      : `${usage.assistant.used} / ${usage.assistant.limit}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full rounded-t-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:max-w-md sm:rounded-2xl ${isMobile ? '' : ''}`}
      >
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-[var(--text-1)]">Utilisation du mois</p>
          <button type="button" onClick={onClose} className="text-sm text-[var(--text-3)] hover:text-[var(--text-1)]">
            Fermer
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-3)]">
          <span>Période : {usage.periodMonth}</span>
          <span>·</span>
          <span>Plan : {usage.plan}</span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-3)]">Dossiers</p>
              <UsageStatusBadge status={usage.projects.status} />
            </div>
            <p className="mt-1 text-lg font-bold text-[var(--text-1)]">{projectsLabel}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-3)]">Devis</p>
              <UsageStatusBadge status={usage.devis.status} />
            </div>
            <p className="mt-1 text-lg font-bold text-[var(--text-1)]">{devisLabel}</p>
          </div>
          {usage.assistant && assistantLabel && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-3)]">Messages assistant interne</p>
                <UsageStatusBadge status={usage.assistant.status} />
              </div>
              <p className="mt-1 text-lg font-bold text-[var(--text-1)]">{assistantLabel}</p>
            </div>
          )}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-3)]">Appels vocaux</p>
              <UsageStatusBadge status={usage.vapi.status} />
            </div>
            <p className="mt-1 text-lg font-bold text-[var(--text-1)]">{callsLabel}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs text-[var(--text-3)]">Minutes vocales</p>
            <p className="mt-1 text-lg font-bold text-[var(--text-1)]">{minutesLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionSummary({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof PhoneCall;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-hover)] text-green-400">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-[var(--text-1)]">{value}</p>
      <p className="text-xs text-[var(--text-2)]">{label}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-left transition-colors hover:border-green-500/40 hover:bg-green-500/[0.04] active:scale-[0.98]"
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">{content}</div>;
}

export const IMPACT_CARD_BASE_CLASSES =
  'border border-[var(--impact-border)] bg-[image:var(--impact-bg)] shadow-[var(--impact-glow)]';

function ImpactCard({
  variant = 'priority',
  children,
  className = '',
  as: Component = 'div',
  onClick,
}: {
  variant?: 'priority' | 'insight' | 'money' | 'success';
  children: ReactNode;
  className?: string;
  as?: 'div' | 'button';
  onClick?: () => void;
}) {
  const Tag = Component as any;

  return (
    <Tag
      type={Component === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl p-4 sm:p-5 ${IMPACT_CARD_BASE_CLASSES} ${className}`}
      data-impact-variant={variant}
    >
      {children}
    </Tag>
  );
}

const PLAN_FEATURE_HIGHLIGHTS: Record<PlanKey, string[]> = {
  essentiel: [
    '50 dossiers / mois',
    'Assistant web de qualification',
    'Création automatique de dossiers projet',
    'Tableau de bord artisan',
    'Fiche projet détaillée',
    'Suivi commercial simple',
    'Base clients',
    '10 devis / mois',
    '10 appels vocaux / mois',
    'Accès limité aux fonctions avancées',
    'Site vitrine en option : +300 € HT une fois',
  ],
  performance: [
    'Dossiers illimités',
    'Devis illimités',
    'Assistant web de qualification',
    'Assistant vocal inclus',
    '150 appels vocaux / mois',
    'Tableau de bord complet',
    'Valeur générée par Kadria',
    'Suivi commercial avancé',
    'Pipeline commercial',
    'Priorités et actions à faire',
    'Relances devis',
    'Devis PDF / envoi / acceptation / refus',
    'Catalogue de prestations',
    'Modèles de devis',
    'Frais de déplacement / estimation',
    'Base clients enrichie',
    'Reporting avancé',
    'Site vitrine en option : +300 € HT une fois',
  ],
  entreprise: [
    'Tout Performance',
    'Site vitrine inclus',
    'Multi-utilisateurs',
    'Multi-numéros',
    'Quotas vocaux renforcés : 400 appels / mois',
    'Accompagnement prioritaire',
    'Configuration avancée',
    'Suivi adapté au contexte client',
    'Offre ajustable selon volume et besoins spécifiques',
  ],
};

const PLAN_POSITIONING: Record<PlanKey, string> = {
  essentiel: 'Pour démarrer avec une base claire de qualification et de suivi.',
  performance: 'L’offre recommandée pour capter, qualifier, suivre et convertir plus de demandes.',
  entreprise: 'Pour les équipes artisanales qui veulent centraliser plusieurs utilisateurs, plusieurs numéros et plus de volume.',
};

const PLAN_ANNUAL_PITCH: Partial<Record<PlanKey, string>> = {
  essentiel: `${formatEuro(getAnnualOneShotPrice('essentiel', 'annualOneShot'))} € / an au lieu de ${getAnnualFullPrice('essentiel')} €`,
  performance: `${formatEuro(getAnnualOneShotPrice('performance', 'annualOneShot'))} € / an au lieu de ${getAnnualFullPrice('performance')} €`,
};

function PlanChangeModal({ currentPlan, onClose }: { currentPlan: PlanKey; onClose: () => void }) {
  const [requestState, setRequestState] = useState<Record<string, 'idle' | 'loading' | 'sent' | 'error'>>({});

  const candidatePlans: PlanKey[] = currentPlan === 'essentiel'
    ? ['performance', 'entreprise']
    : currentPlan === 'performance'
      ? ['essentiel', 'entreprise']
      : ['performance'];

  // Affiché chaque fois qu'une offre inférieure est disponible (downgrade possible).
  const canDowngrade = candidatePlans.some((p) => PLAN_DEFINITIONS[p].rank < PLAN_DEFINITIONS[currentPlan].rank);

  const requestChange = async (targetPlan: PlanKey) => {
    setRequestState((prev) => ({ ...prev, [targetPlan]: 'loading' }));
    try {
      const res = await fetch('/api/billing/upgrade-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlan }),
      });
      if (!res.ok) throw new Error('failed');
      setRequestState((prev) => ({ ...prev, [targetPlan]: 'sent' }));
    } catch {
      setRequestState((prev) => ({ ...prev, [targetPlan]: 'error' }));
    }
  };

  // "Passer à Performance" réutilise le même flux de checkout Stripe que /tarifs
  // (POST /api/stripe/checkout avec { plan, interval }) plutôt que la demande
  // générique upgrade-request : c'est un changement direct, pas une demande à traiter.
  const goToPerformanceCheckout = async () => {
    setRequestState((prev) => ({ ...prev, performance: 'loading' }));
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'performance', interval: 'monthly' }),
      });
      const data = await res.json();
      if (data?.success && data?.url) {
        window.location.href = data.url;
        return;
      }
      setRequestState((prev) => ({ ...prev, performance: 'error' }));
    } catch {
      setRequestState((prev) => ({ ...prev, performance: 'error' }));
    }
  };

  const ctaLabel = (targetPlan: PlanKey): string => {
    if (targetPlan === 'performance') return 'Passer à Performance';
    if (targetPlan === 'essentiel') return 'Demander le passage à Essentiel';
    if (targetPlan === 'entreprise') return 'Demander l\'offre Agence';
    return 'Demander le changement';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] max-h-[90vh] overflow-y-auto sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">Changer d&apos;offre</p>
            <h3 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Comparez les offres Kadria</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Choisissez le niveau adapté à votre volume de demandes, vos devis et votre organisation.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Mensuel sans engagement · Annuel comptant -15 % · Site vitrine en option ou inclus selon l&apos;offre
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {canDowngrade && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Certaines fonctionnalités peuvent être verrouillées si vous repassez sur une offre inférieure.
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(['essentiel', 'performance', 'entreprise'] as PlanKey[]).map((planKey) => {
            const isCurrent = planKey === currentPlan;
            const def = PLAN_DEFINITIONS[planKey];
            const isCandidate = candidatePlans.includes(planKey);
            const state = requestState[planKey] || 'idle';
            const isPerformanceEmphasis = planKey === 'performance' && !isCurrent;

            return (
              <div
                key={planKey}
                className={`flex flex-col gap-4 rounded-2xl border p-5 sm:p-6 ${
                  isCurrent
                    ? 'border-green-500/40 bg-green-500/[0.04]'
                    : isPerformanceEmphasis
                      ? 'border-green-500/25 bg-green-500/[0.02]'
                      : 'border-zinc-800 bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-bold text-white">{def.label}</p>
                  {isCurrent ? (
                    <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
                      Votre offre actuelle
                    </span>
                  ) : planKey === 'performance' ? (
                    <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
                      Recommandé
                    </span>
                  ) : planKey === 'entreprise' ? (
                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                      Sur devis possible
                    </span>
                  ) : null}
                </div>

                <p className="text-sm text-zinc-400">{PLAN_POSITIONING[planKey]}</p>

                <div>
                  <p className="text-sm font-semibold text-white">
                    {planKey === 'essentiel' && '149 €/mois'}
                    {planKey === 'performance' && '249 €/mois'}
                    {planKey === 'entreprise' && '499 €/mois ou sur devis'}
                  </p>
                  {PLAN_ANNUAL_PITCH[planKey] && (
                    <p className="mt-0.5 text-xs text-zinc-500">{PLAN_ANNUAL_PITCH[planKey]}</p>
                  )}
                </div>

                <p className="text-xs text-zinc-500">
                  {def.monthlyProjectLimit ? `${def.monthlyProjectLimit} dossiers / mois` : 'Dossiers illimités'}
                </p>

                <ul className="flex flex-col gap-2 text-sm text-zinc-300">
                  {PLAN_FEATURE_HIGHLIGHTS[planKey].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-500">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                {!isCurrent && isCandidate && planKey === 'performance' && (
                  <button
                    type="button"
                    disabled={state === 'loading' || state === 'sent'}
                    onClick={goToPerformanceCheckout}
                    className="mt-auto inline-flex min-h-10 items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-transform duration-150 hover:scale-[1.02] disabled:opacity-60"
                  >
                    {state === 'loading' ? 'Redirection...' : ctaLabel(planKey)}
                  </button>
                )}

                {!isCurrent && isCandidate && planKey !== 'performance' && (
                  <button
                    type="button"
                    disabled={state === 'loading' || state === 'sent'}
                    onClick={() => requestChange(planKey)}
                    className="mt-auto inline-flex min-h-10 items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-transform duration-150 hover:scale-[1.02] disabled:opacity-60"
                  >
                    {state === 'loading'
                      ? 'Envoi...'
                      : state === 'sent'
                        ? 'Demande envoyée'
                        : ctaLabel(planKey)}
                  </button>
                )}

                {!isCurrent && isCandidate && state === 'error' && (
                  <p className="text-xs text-red-400">Erreur lors de l&apos;envoi, réessayez.</p>
                )}

                {!isCurrent && !isCandidate && currentPlan === 'entreprise' && (
                  <a
                    href="mailto:contact@kadria.fr"
                    className="mt-auto inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:border-zinc-500"
                  >
                    Contacter Kadria
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {currentPlan === 'entreprise' && (
          <p className="mt-4 text-sm text-zinc-400">
            Vous êtes déjà sur l&apos;offre la plus complète. Pour toute question sur votre offre actuelle, contactez l&apos;équipe Kadria.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="/tarifs"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            Voir la page tarifs
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md px-4 py-3 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
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

'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  FileText,
  Camera,
  Receipt,
  LayoutDashboard,
  Folder,
  Bell,
  Calendar,
  Settings,
  Target,
  Users,
  BarChart3,
  Flame,
  CheckCircle2,
  Check,
  Star,
  Home,
  Building2,
  Zap,
  Search,
  Sparkles,
} from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

/**
 * Premium landing Hero for Kadria's public homepage.
 *
 * Scope note: this component owns ONLY the Hero visuals/copy/animations.
 * CTA behaviour is passed in via props so the parent (KadriaPages.tsx)
 * keeps full control of trial-modal / navigation logic.
 *
 * Structure (v0-inspired composition):
 * - left column: marketing copy, CTAs, reassurance, social proof, metrics
 * - middle column: vertical stream of floating signal cards (chaos entrant)
 *   connected by flow lines converging into the dashboard
 * - right column: a wide, horizontal "real desktop app" dashboard preview
 *   (sidebar + topbar + KPI strip + 3-column widget grid), not a tall
 *   vertical block.
 */

type PremiumLandingHeroProps = {
  onOpenTrial: () => void;
};

const REASSURANCE_ITEMS = ['Essai gratuit 7 jours', 'Avec ou sans site', 'Pensé pour les artisans du bâtiment'];

const SOCIAL_PROOF = {
  rating: '4,9/5',
  count: '120+ artisans',
  quote: 'Enfin un outil qui me fait gagner du temps et me rapporte plus de chantiers.',
  avatars: 3,
};

const METRICS = [
  { value: '120+', label: 'artisans actifs' },
  { value: '29 min', label: 'économisées / jour' },
  { value: '4,9/5', label: 'satisfaction moyenne' },
];

const TRUST_LOGOS = [
  { name: 'Artisan du Bâtiment', icon: Home },
  { name: 'Bâtir Expert', icon: Building2 },
  { name: 'Rénov’Habitat', icon: Home },
  { name: 'Maison&Co Construction', icon: Home },
  { name: 'Presto Rénovation', icon: Zap },
];

type FlowCard = {
  key: string;
  icon: typeof Phone;
  title: string;
  detail: string;
  accent?: boolean;
  delay: number;
  floatY: number;
  duration: number;
};

// Vertical stream of cards — the "commercial chaos" narrative from the v0
// prototype's floating-cards.tsx, adapted to Kadria's real inbound signals.
const FLOW_CARDS: FlowCard[] = [
  {
    key: 'whatsapp',
    icon: MessageCircle,
    title: 'Nouveau message',
    detail: 'WhatsApp · Devis salle de bain',
    delay: 0.9,
    floatY: 3,
    duration: 4.2,
  },
  {
    key: 'appel',
    icon: Phone,
    title: 'Appel manqué',
    detail: '06 72 11 47 09 · Hier 18:42',
    delay: 1.05,
    floatY: 5,
    duration: 3.6,
  },
  {
    key: 'formulaire',
    icon: FileText,
    title: 'Formulaire reçu',
    detail: 'Rénovation complète · Incomplet',
    delay: 1.2,
    floatY: 4,
    duration: 4.0,
  },
  {
    key: 'photo',
    icon: Camera,
    title: 'Photos chantier',
    detail: '3 photos jointes · Live',
    delay: 1.35,
    floatY: 5,
    duration: 3.7,
    accent: true,
  },
  {
    key: 'relance',
    icon: Bell,
    title: 'Relance conseillée',
    detail: 'Devis n°2024-0478 · En retard',
    delay: 1.5,
    floatY: 4,
    duration: 4.4,
    accent: true,
  },
];

const SIDEBAR_ITEMS = [
  { label: 'Cockpit', icon: LayoutDashboard, active: true },
  { label: 'Opportunités', icon: Target, active: false },
  { label: 'Dossiers', icon: Folder, active: false },
  { label: 'Devis', icon: Receipt, active: false },
  { label: 'Relances', icon: Bell, active: false },
  { label: 'Calendrier', icon: Calendar, active: false },
  { label: 'Contacts', icon: Users, active: false },
  { label: 'Analyses', icon: BarChart3, active: false },
  { label: 'Paramètres', icon: Settings, active: false },
];

const KPI_STRIP = [
  { key: 'complete', label: 'Dossiers qualifiés', value: '34', delta: '+9 ce mois' },
  { key: 'hot', label: 'Opportunités chaudes', value: '11', delta: '+3 cette semaine', deltaClass: 'text-orange-400' },
  { key: 'devis', label: 'Devis en attente', value: '6', delta: '2 urgents', deltaClass: 'text-amber-400' },
  { key: 'ca', label: 'CA potentiel', value: '5,8k€', delta: '+1,9k€ ce mois', accent: true },
  { key: 'conv', label: 'Taux de conversion', value: '33 %', delta: '+6,5 pts vs préc.' },
] as const;

const PIPELINE = [
  { label: 'Nouveaux', count: 12, value: '16,2k€', color: '#3b82f6', pct: 100 },
  { label: 'Qualifiés', count: 7, value: '14,6k€', color: 'var(--accent)', pct: 58 },
  { label: 'Devis envoyés', count: 4, value: '7,6k€', color: '#f59e0b', pct: 33 },
  { label: 'Gagnés', count: 2, value: '5,8k€', color: '#a78bfa', pct: 16 },
];

const AGENDA = [
  { time: '09:00', label: 'Appel de qualification', name: 'M. Durand', color: '#3b82f6' },
  { time: '11:30', label: 'Visite chantier', name: 'Mme Martin', color: 'var(--accent)' },
  { time: '14:00', label: 'Relance devis carrelage', name: 'M. Bernard', color: '#f59e0b' },
];

const OPPORTUNITIES = [
  {
    prospect: 'M. Durand',
    project: 'Rénovation complète maison',
    status: 'Prospect chaud',
    statusStyle: 'hot',
    score: '92%',
  },
  {
    prospect: 'Mme Martin',
    project: 'Extension 20m²',
    status: 'Dossier complet',
    statusStyle: 'complete',
    score: '88%',
  },
  {
    prospect: 'M. Bernard',
    project: 'Salle de bain',
    status: 'À relancer',
    statusStyle: 'warm',
    score: '65%',
  },
] as const;

const AI_RECOS = [
  { label: 'Relancer M. Bernard', sub: 'Devis envoyé il y a 3 jours', urgency: 'high' as const },
  { label: 'Compléter le dossier Martin', sub: 'Photos manquantes · score 81/100', urgency: 'med' as const },
];

const OBJECTIVES = [
  { label: 'Devis à envoyer', done: 1, total: 3 },
  { label: 'Appels de qualification', done: 2, total: 4 },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

/* ─────────────────────────────────────────────
   Floating cards stream (middle column)
   ───────────────────────────────────────────── */

function FlowConnector() {
  return (
    <div className="flex justify-center py-[3px]">
      <div className="h-2 w-px bg-[rgba(74,222,128,0.2)]" />
    </div>
  );
}

function FlowCardItem({ card, reduceMotion }: { card: FlowCard; reduceMotion: boolean }) {
  const Icon = card.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.55, delay: card.delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        animate={reduceMotion ? {} : { y: [0, -card.floatY, 0] }}
        transition={{ duration: card.duration, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut', delay: card.delay + 0.6 }}
        className={`flex items-center gap-2 rounded-xl px-2.5 py-2 backdrop-blur-md ${
          card.accent
            ? 'border border-[rgba(74,222,128,0.28)] bg-[var(--accent-dim)]'
            : 'border border-zinc-800 bg-[rgba(16,20,26,0.9)]'
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-dim)]">
          <Icon className="h-3 w-3 text-[var(--accent)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold text-white">{card.title}</p>
          <p className="truncate text-[9px] text-zinc-500">{card.detail}</p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-md border border-[rgba(74,222,128,0.2)] bg-[var(--accent-dim)] px-1.5 py-0.5 sm:flex">
          <motion.span
            className="h-1 w-1 rounded-full bg-[var(--accent)]"
            animate={reduceMotion ? {} : { opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: reduceMotion ? 0 : Infinity }}
          />
          <span className="text-[8px] font-bold text-[var(--accent)]">Live</span>
        </span>
      </motion.div>
    </motion.div>
  );
}

function HeroFlowStream({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="flex w-full flex-col justify-center">
      {FLOW_CARDS.map((card, i) => (
        <div key={card.key}>
          <FlowCardItem card={card} reduceMotion={reduceMotion} />
          {i < FLOW_CARDS.length - 1 && <FlowConnector />}
        </div>
      ))}
    </div>
  );
}

function HeroFlowConnectorSvg({ reduceMotion }: { reduceMotion: boolean }) {
  const ys = [40, 108, 176, 244, 312];
  return (
    <svg viewBox="0 0 24 360" fill="none" className="h-full w-6" preserveAspectRatio="none" aria-hidden="true">
      {ys.map((y, i) => (
        <motion.path
          key={i}
          d={`M 0 ${y} C 12 ${y}, 12 176, 24 176`}
          stroke="rgba(74,222,128,0.25)"
          strokeWidth="1.2"
          strokeDasharray="2.5 3.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: reduceMotion ? 0 : 1.1 + i * 0.1, ease: 'easeOut' }}
        />
      ))}
      <motion.circle
        cx="24"
        cy="176"
        r="3"
        fill="rgba(74,222,128,0.7)"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: reduceMotion ? 0 : 1.7, duration: 0.3 }}
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Horizontal desktop dashboard (right column)
   ───────────────────────────────────────────── */

function DashboardSidebar() {
  return (
    <div className="hidden w-[92px] shrink-0 flex-col border-r border-zinc-800 bg-black/30 py-3 md:flex">
      <div className="mb-2 flex items-center gap-1 px-2.5 pb-2 border-b border-zinc-800">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-[9px] font-black text-zinc-950">
          K
        </span>
        <span className="text-[10px] font-bold text-white">Kadria</span>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-1.5">
        {SIDEBAR_ITEMS.slice(0, 6).map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[8.5px] leading-tight ${
              item.active ? 'bg-[var(--accent-dim)] font-semibold text-[var(--accent)]' : 'text-zinc-500'
            }`}
          >
            <item.icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardWindowChrome({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 bg-black/40 px-3 py-2">
      <div className="flex shrink-0 gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="hidden max-w-[200px] flex-1 items-center gap-1.5 rounded-md border border-[rgba(113,113,122,0.28)] bg-white/[0.04] px-2 py-1 text-[9px] text-zinc-500 sm:flex">
        <Search className="h-2.5 w-2.5 shrink-0" />
        Rechercher un dossier, un client…
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-60"
            animate={reduceMotion ? {} : { scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.2, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
        </span>
        <span className="text-[9px] font-semibold text-[var(--accent)]">Live</span>
      </div>
    </div>
  );
}

function DashboardTopBar() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-900 px-3.5 py-2">
      <div>
        <p className="text-[11px] font-bold text-white">Cockpit</p>
        <p className="text-[9px] text-zinc-500">Vue d’ensemble de votre activité commerciale</p>
      </div>
      <div className="hidden shrink-0 gap-1 sm:flex">
        {['7 jours', 'Ce mois', '3 mois'].map((t, i) => (
          <span
            key={t}
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium ${
              i === 1 ? 'border border-[rgba(74,222,128,0.28)] bg-[var(--accent-dim)] text-[var(--accent)]' : 'text-zinc-500'
            }`}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function DashboardKpiStrip() {
  return (
    <div className="flex gap-2 px-3.5 pt-2.5">
      {KPI_STRIP.map((kpi) => (
        <div
          key={kpi.key}
          className={`flex-1 rounded-lg p-2 ${
            'accent' in kpi && kpi.accent
              ? 'border border-[rgba(74,222,128,0.22)] bg-[var(--accent-dim)]'
              : 'border border-[rgba(113,113,122,0.22)] bg-[rgba(39,39,42,0.5)]'
          }`}
        >
          <p className="truncate text-[8px] font-medium uppercase tracking-wide text-zinc-500">{kpi.label}</p>
          <p className="mt-0.5 text-[13px] font-bold leading-none text-white">{kpi.value}</p>
          <p className={`mt-1 truncate text-[8.5px] font-medium ${('deltaClass' in kpi && kpi.deltaClass) || 'text-[var(--accent)]'}`}>
            {kpi.delta}
          </p>
        </div>
      ))}
    </div>
  );
}

function DCard({ children, accent, className = '' }: { children: React.ReactNode; accent?: boolean; className?: string }) {
  return (
    <div
      className={`rounded-lg p-2.5 ${
        accent ? 'border border-[rgba(74,222,128,0.2)] bg-[var(--accent-dim)]' : 'border border-[rgba(113,113,122,0.22)] bg-[rgba(39,39,42,0.5)]'
      } ${className}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, right }: { children: React.ReactNode; right?: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <span className="text-[9.5px] font-semibold text-white">{children}</span>
      {right && <span className="text-[8px] text-[var(--accent)]">{right}</span>}
    </div>
  );
}

function DashboardPipelineCard() {
  return (
    <DCard>
      <SectionLabel right="Vue pipeline">Pipeline commercial</SectionLabel>
      <div className="space-y-1.5">
        {PIPELINE.map((p, i) => (
          <div key={p.label}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold leading-none" style={{ color: p.color }}>
                  {p.count}
                </span>
                <span className="text-[8.5px] font-semibold text-zinc-300">{p.value}</span>
              </div>
              <span className="text-[8px] text-zinc-500">{p.label}</span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: p.color }}
                initial={{ width: 0 }}
                animate={{ width: `${p.pct}%` }}
                transition={{ duration: 0.6, delay: 1.1 + i * 0.07, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </DCard>
  );
}

function DashboardAgendaCard() {
  return (
    <DCard>
      <SectionLabel right="Voir calendrier">Agenda du jour</SectionLabel>
      <div className="space-y-1.5">
        {AGENDA.map((item) => (
          <div key={item.time} className="flex items-center gap-2">
            <span className="w-7 shrink-0 font-mono text-[8px] text-zinc-500">{item.time}</span>
            <div className="h-5 w-0.5 shrink-0 rounded-full" style={{ background: item.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-medium leading-tight text-zinc-200">{item.label}</p>
              <p className="truncate text-[8px] text-zinc-500">{item.name}</p>
            </div>
          </div>
        ))}
      </div>
    </DCard>
  );
}

function DashboardOpportunitiesCard() {
  return (
    <DCard className="flex-1">
      <SectionLabel right="Voir tout">Opportunités prioritaires</SectionLabel>
      <div className="space-y-1.5">
        {OPPORTUNITIES.map((opp) => (
          <div key={opp.prospect} className="flex items-center gap-2 rounded-md bg-black/30 px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-semibold text-zinc-200">{opp.prospect}</p>
              <p className="truncate text-[8px] text-zinc-500">{opp.project}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[7.5px] font-semibold ${
                opp.statusStyle === 'hot'
                  ? 'bg-orange-500/15 text-orange-400'
                  : opp.statusStyle === 'complete'
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                    : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              {opp.status}
            </span>
            <span className="shrink-0 text-[9px] font-semibold text-white">{opp.score}</span>
          </div>
        ))}
      </div>
      <Link href="/demo-request" className="mt-2 inline-flex text-[8.5px] font-medium text-[var(--accent)] hover:underline">
        Voir toutes les opportunités →
      </Link>
    </DCard>
  );
}

function DashboardAiRecosCard() {
  return (
    <DCard accent>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[var(--accent-dim)]">
          <Sparkles className="h-2.5 w-2.5 text-[var(--accent)]" />
        </span>
        <span className="text-[9.5px] font-semibold text-white">Recommandations IA</span>
      </div>
      <div className="space-y-1.5">
        {AI_RECOS.map((r) => (
          <div
            key={r.label}
            className={`rounded-md p-1.5 ${r.urgency === 'high' ? 'border border-[rgba(74,222,128,0.22)] bg-black/20' : 'border border-white/[0.06] bg-black/20'}`}
          >
            <p className="text-[8.5px] font-medium leading-tight text-zinc-200">{r.label}</p>
            <p className="mt-0.5 text-[8px] leading-tight text-zinc-500">{r.sub}</p>
          </div>
        ))}
      </div>
    </DCard>
  );
}

function DashboardScoreCard() {
  return (
    <DCard>
      <SectionLabel>Score commercial</SectionLabel>
      <div className="flex items-center gap-3">
        <div
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--accent) ${84 * 3.6}deg, rgba(113,113,122,0.25) 0deg)` }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-black text-white">
            84
          </div>
        </div>
        <div>
          <p className="text-[9.5px] font-semibold text-[var(--accent)]">Excellent</p>
          <p className="text-[8px] leading-snug text-zinc-500">Top 15% des artisans</p>
        </div>
      </div>
    </DCard>
  );
}

function DashboardObjectivesCard() {
  return (
    <DCard>
      <SectionLabel>Objectifs de la semaine</SectionLabel>
      <div className="space-y-1.5">
        {OBJECTIVES.map((obj, i) => (
          <div key={obj.label}>
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-zinc-500">{obj.label}</span>
              <span className="text-[8px] font-semibold text-zinc-300">
                {obj.done}/{obj.total}
              </span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full rounded-full bg-[var(--accent)]"
                initial={{ width: 0 }}
                animate={{ width: `${(obj.done / obj.total) * 100}%` }}
                transition={{ duration: 0.6, delay: 1.3 + i * 0.07, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </DCard>
  );
}

function HeroDashboardPreview({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[24px] border border-[rgba(74,222,128,0.28)] bg-[rgba(11,15,13,0.96)] shadow-[0_40px_120px_rgba(0,0,0,0.65),0_0_70px_rgba(34,197,94,0.16),inset_1px_0_0_rgba(74,222,128,0.25)]">
      <DashboardWindowChrome reduceMotion={reduceMotion} />
      <div className="flex h-[440px]">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardTopBar />
          <DashboardKpiStrip />
          <div className="grid flex-1 grid-cols-3 gap-2.5 overflow-hidden px-3.5 py-2.5">
            <div className="flex flex-col gap-2.5">
              <DashboardPipelineCard />
              <DashboardAgendaCard />
            </div>
            <div className="flex flex-col gap-2.5">
              <DashboardOpportunitiesCard />
            </div>
            <div className="flex flex-col gap-2.5">
              <DashboardAiRecosCard />
              <DashboardScoreCard />
              <DashboardObjectivesCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Mobile fallback
   ───────────────────────────────────────────── */

function SignalCardsMobile() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {FLOW_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={`w-[176px] shrink-0 rounded-xl p-3 backdrop-blur-md ${
              card.accent
                ? 'border border-[rgba(74,222,128,0.28)] bg-[var(--accent-dim)]'
                : 'border border-zinc-800 bg-[rgba(24,24,27,0.78)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-dim)]">
                <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
              </span>
              <p className="truncate text-[11px] font-semibold text-white">{card.title}</p>
            </div>
            <p className="mt-2 truncate text-[10px] text-zinc-400">{card.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

export function PremiumLandingHero({ onOpenTrial }: PremiumLandingHeroProps) {
  const reduceMotion = !!useReducedMotion();

  return (
    <section className="relative flex min-h-[92dvh] w-full items-start overflow-hidden bg-zinc-950 pt-[88px] md:min-h-0">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 100%, transparent 40%, #030706 80%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_84%_50%,rgba(34,197,94,0.2)_0%,transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_48%_45%,rgba(34,197,94,0.14)_0%,transparent_62%)]" />

      <div className="relative z-10 mx-auto grid w-full max-w-[1900px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.72fr_1.85fr] lg:items-center lg:gap-6 lg:px-10 lg:py-8 xl:px-14">
        {/* Zone gauche — texte / conversion */}
        <div className="max-w-2xl lg:max-w-none">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--accent-border)] bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)] shadow-[0_0_20px_rgba(34,197,94,0.12)] backdrop-blur-sm sm:text-xs sm:tracking-[0.18em]"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            Assistant commercial 24/7
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.1}
            className="mt-5 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[2.6rem] xl:text-[2.9rem]"
          >
            <span className="block">Passez du chaos commercial</span>
            <span className="block">à des dossiers</span>
            <span className="relative inline-block font-extrabold text-[var(--accent)]">
              prêts à vendre.
              <span className="absolute -bottom-1.5 left-0 h-[3px] w-16 rounded-full bg-[var(--accent)]" />
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.2}
            className="mt-5 text-base leading-relaxed text-zinc-400 sm:text-lg lg:text-sm xl:text-base"
          >
            Appels, messages, formulaires, photos et devis à relancer&nbsp;: Kadria remet de
            l&rsquo;ordre dans votre activité commerciale et vous aide à prioriser les bonnes
            opportunités.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.3}
            className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch xl:flex-row xl:items-center"
          >
            <button
              type="button"
              onClick={onOpenTrial}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-8 py-4 text-base font-bold text-zinc-950 shadow-[0_10px_32px_rgba(34,197,94,0.45)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(34,197,94,0.6)] hover:brightness-110 sm:w-auto"
            >
              Essayer gratuitement 7 jours <ArrowRight className="h-5 w-5" />
            </button>
            <Link
              href="/demo-request"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-zinc-700 bg-black/30 px-6 py-3.5 text-sm font-medium text-zinc-300 transition-colors hover:border-[var(--accent-border)] hover:text-white sm:w-auto"
            >
              Demander un accès démo
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.4}
            className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400"
          >
            {REASSURANCE_ITEMS.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                {item}
              </span>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.5}
            className="mt-6 flex flex-col gap-2 border-t border-zinc-800/80 pt-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {Array.from({ length: SOCIAL_PROOF.avatars }).map((_, i) => (
                  <span
                    key={i}
                    className="h-7 w-7 rounded-full border-2 border-zinc-950 bg-gradient-to-br from-zinc-600 to-zinc-800"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-[var(--accent)] text-[var(--accent)]" />
                ))}
              </div>
              <span className="text-sm font-semibold text-white">
                {SOCIAL_PROOF.rating} <span className="font-normal text-zinc-400">sur {SOCIAL_PROOF.count}</span>
              </span>
            </div>
            <p className="max-w-md text-sm italic leading-snug text-zinc-400">
              &ldquo;{SOCIAL_PROOF.quote}&rdquo;
            </p>
          </motion.div>

          {/* Métriques compactes façon v0 */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.55} className="mt-5 flex flex-wrap items-center gap-5">
            {METRICS.map((m) => (
              <div key={m.label} className="flex flex-col gap-0">
                <span className="text-sm font-black leading-none tracking-tight text-white">{m.value}</span>
                <span className="mt-0.5 text-[10px] text-zinc-500">{m.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Zone droite — flux de cartes + dashboard applicatif horizontal */}
        <div className="relative hidden lg:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, type: 'spring', stiffness: 90, damping: 18 }}
            className="flex items-stretch gap-2 xl:gap-3"
          >
            {/* Flux de cartes flottantes */}
            <div className="w-[176px] shrink-0 xl:w-[196px]">
              <HeroFlowStream reduceMotion={reduceMotion} />
            </div>

            {/* Connecteur animé */}
            <div className="flex shrink-0 items-center" style={{ width: 20 }}>
              <HeroFlowConnectorSvg reduceMotion={reduceMotion} />
            </div>

            {/* Dashboard applicatif */}
            <div className="min-w-0 flex-1">
              <HeroDashboardPreview reduceMotion={reduceMotion} />
            </div>
          </motion.div>
        </div>

        {/* Mobile — chaos compact + mini aperçu dashboard */}
        <div className="lg:hidden">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.3} className="mt-2">
            <SignalCardsMobile />
          </motion.div>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.4}
            className="mt-4 rounded-xl border border-[rgba(74,222,128,0.28)] bg-[rgba(11,15,13,0.96)] p-4"
          >
            <p className="text-sm font-bold text-white">Cockpit</p>
            <p className="mt-1 text-[11px] text-zinc-500">Vue d’ensemble de votre activité commerciale</p>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-black/30 px-3 py-2 text-[11px]">
              <span className="truncate text-zinc-300">
                <span className="font-semibold text-zinc-200">{OPPORTUNITIES[0].prospect}</span>{' '}
                {OPPORTUNITIES[0].project}
              </span>
              <span className="shrink-0 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                {OPPORTUNITIES[0].status}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bande de confiance — bas de section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 hidden flex-col items-center gap-2.5 px-10 lg:flex">
        <p className="text-xs text-zinc-500">Ils nous font confiance</p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 opacity-60 grayscale">
          {TRUST_LOGOS.map((logo) => (
            <span key={logo.name} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <logo.icon className="h-3.5 w-3.5" />
              {logo.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PremiumLandingHero;

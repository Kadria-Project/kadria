'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  FileText,
  Camera,
  StickyNote,
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
  ChevronDown,
  ChevronRight,
  Check,
  Star,
  Home,
  Building2,
  Zap,
} from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

/**
 * Premium landing Hero for Kadria's public homepage.
 *
 * Scope note: this component owns ONLY the Hero visuals/copy/animations.
 * CTA behaviour is passed in via props so the parent (KadriaPages.tsx)
 * keeps full control of trial-modal / navigation logic.
 *
 * Structure: left marketing copy + CTAs, center incoming commercial chaos
 * (floating signal cards converging toward Kadria), right a partially
 * cropped dashboard preview that bleeds off the right edge of the viewport.
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

const TRUST_LOGOS = [
  { name: 'Artisan du Bâtiment', icon: Home },
  { name: 'Bâtir Expert', icon: Building2 },
  { name: 'Rénov’Habitat', icon: Home },
  { name: 'Maison&Co Construction', icon: Home },
  { name: 'Presto Rénovation', icon: Zap },
];

type SignalCard = {
  key: string;
  icon: typeof Phone;
  title: string;
  body: string;
  meta?: string;
  badge?: string;
  className: string;
  delay: number;
  float: { y: number[] };
  duration: number;
  variant?: 'note';
};

const SIGNAL_CARDS: SignalCard[] = [
  {
    key: 'whatsapp',
    icon: MessageCircle,
    title: 'WhatsApp',
    body: 'Bonjour, j’aurais besoin d’un devis pour refaire ma salle de bain.',
    meta: '09:41',
    className: 'right-[2%] top-[0%] w-[210px] rotate-[4deg]',
    delay: 0.9,
    float: { y: [0, 9, 0] },
    duration: 7,
  },
  {
    key: 'appel',
    icon: Phone,
    title: 'Appel manqué',
    body: '06 72 11 47 09',
    meta: 'Hier, 18:42',
    className: 'left-[0%] top-[6%] w-[180px] rotate-[-6deg]',
    delay: 1.0,
    float: { y: [0, -8, 0] },
    duration: 6,
  },
  {
    key: 'formulaire',
    icon: FileText,
    title: 'Nouveau formulaire',
    body: 'Rénovation complète',
    badge: 'Incomplet',
    className: 'left-[8%] top-[32%] w-[188px] rotate-[3deg]',
    delay: 1.1,
    float: { y: [0, -7, 0] },
    duration: 6.5,
  },
  {
    key: 'photo',
    icon: Camera,
    title: 'Photo chantier',
    body: 'IMG_20240517.jpg',
    meta: '3 photos · 12:14',
    className: 'right-[8%] top-[34%] w-[196px] rotate-[-5deg]',
    delay: 1.2,
    float: { y: [0, 8, 0] },
    duration: 7.5,
  },
  {
    key: 'note',
    icon: StickyNote,
    title: 'Note manuscrite',
    body: 'M. Laurent / Rappeler demain / + voir pour devis / - urgent',
    className: 'left-[2%] bottom-[10%] w-[176px] rotate-[5deg]',
    delay: 1.3,
    float: { y: [0, -9, 0] },
    duration: 6.8,
    variant: 'note',
  },
  {
    key: 'message',
    icon: MessageCircle,
    title: 'Message client',
    body: 'Pouvez-vous intervenir la semaine prochaine ?',
    meta: '09:11',
    className: 'left-[20%] bottom-[0%] w-[200px] rotate-[-3deg]',
    delay: 1.4,
    float: { y: [0, 8, 0] },
    duration: 7.2,
  },
  {
    key: 'devis',
    icon: Receipt,
    title: 'Devis à relancer',
    body: 'Devis n°2024-0478',
    badge: 'En retard',
    className: 'right-[4%] bottom-[2%] w-[188px] rotate-[-2deg]',
    delay: 1.5,
    float: { y: [0, -8, 0] },
    duration: 6.4,
  },
];

const SIGNAL_CARDS_MOBILE = ['whatsapp', 'appel', 'formulaire', 'devis'];

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

const KPI_ROW_1 = [
  {
    key: 'complete',
    label: 'Dossier complet',
    value: '86%',
    sub: 'Moyenne globale',
    delta: '+12 pts vs semaine dernière',
    variant: 'ring' as const,
  },
  {
    key: 'hot',
    label: 'Prospect chaud',
    icon: Flame,
    value: '12',
    sub: 'À contacter en priorité',
    variant: 'icon' as const,
  },
  {
    key: 'action',
    label: 'Action recommandée',
    icon: CheckCircle2,
    value: 'Relancer 5 devis',
    sub: '3 aujourd’hui · 2 cette semaine',
    variant: 'icon' as const,
  },
] as const;

const KPI_ROW_2 = [
  {
    key: 'accepted',
    label: 'Devis accepté',
    value: '7',
    amount: '120 450 € HT',
    sub: 'Montant total',
    variant: 'sparkline' as const,
  },
  {
    key: 'reminder',
    label: 'Relance aujourd’hui',
    icon: Bell,
    value: '3',
    sub: 'À effectuer',
    cta: 'Voir la liste',
    variant: 'cta' as const,
  },
  {
    key: 'upcoming',
    label: 'Chantiers à venir',
    icon: Calendar,
    value: '4',
    sub: 'Dans les 30 prochains jours',
    cta: 'Voir le planning',
    variant: 'cta' as const,
  },
] as const;

const OPPORTUNITIES = [
  {
    prospect: 'M. Durand',
    project: 'Rénovation complète maison',
    status: 'Prospect chaud',
    statusStyle: 'hot',
    score: '92%',
    action: 'Appeler aujourd’hui',
  },
  {
    prospect: 'Mme Martin',
    project: 'Extension 20m²',
    status: 'Dossier complet',
    statusStyle: 'complete',
    score: '88%',
    action: 'Envoyer devis',
  },
  {
    prospect: 'M. Bernard',
    project: 'Rénovation salle de bain',
    status: 'À relancer',
    statusStyle: 'warm',
    score: '65%',
    action: 'Relancer aujourd’hui',
  },
] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

function HeroSignalCard({ card, reduceMotion }: { card: SignalCard; reduceMotion: boolean }) {
  const Icon = card.icon;
  const isNote = card.variant === 'note';

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 110, damping: 15, delay: card.delay }}
      whileHover={reduceMotion ? undefined : { scale: 1.04, boxShadow: '0 0 44px rgba(34,197,94,0.35)' }}
      className={`absolute z-20 rounded-xl p-3.5 backdrop-blur-md ${
        isNote
          ? 'border border-amber-300/30 bg-[rgba(250,204,21,0.1)] shadow-[0_14px_36px_rgba(0,0,0,0.5)]'
          : 'border border-[rgba(74,222,128,0.22)] bg-[rgba(24,24,27,0.78)] shadow-[0_14px_44px_rgba(0,0,0,0.55),0_0_24px_rgba(34,197,94,0.12)]'
      } ${card.className}`}
    >
      <motion.div
        animate={reduceMotion ? {} : card.float}
        transition={{ duration: card.duration, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
              isNote ? 'bg-amber-400/20' : 'bg-[var(--accent-dim)]'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isNote ? 'text-amber-300' : 'text-[var(--accent)]'}`} />
          </span>
          <p className={`text-[11px] font-semibold ${isNote ? 'text-amber-100' : 'text-white'}`}>{card.title}</p>
        </div>
        <p className={`mt-2 line-clamp-2 text-xs leading-snug ${isNote ? 'text-amber-100/80' : 'text-zinc-300'}`}>
          {card.body}
        </p>
        {(card.meta || card.badge) && (
          <div className="mt-1.5 flex items-center gap-2">
            {card.meta && <p className="text-[10px] text-zinc-500">{card.meta}</p>}
            {card.badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                  card.badge === 'En retard'
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {card.badge}
              </span>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SignalCardsMobile() {
  const cards = SIGNAL_CARDS.filter((c) => SIGNAL_CARDS_MOBILE.includes(c.key));
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {cards.map((card) => {
        const Icon = card.icon;
        const isNote = card.variant === 'note';
        return (
          <div
            key={card.key}
            className={`w-[168px] shrink-0 rounded-xl p-3 backdrop-blur-md ${
              isNote
                ? 'border border-amber-300/30 bg-[rgba(250,204,21,0.1)] shadow-[0_10px_28px_rgba(0,0,0,0.45)]'
                : 'border border-[rgba(74,222,128,0.22)] bg-[rgba(24,24,27,0.78)] shadow-[0_10px_28px_rgba(0,0,0,0.5)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                  isNote ? 'bg-amber-400/20' : 'bg-[var(--accent-dim)]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isNote ? 'text-amber-300' : 'text-[var(--accent)]'}`} />
              </span>
              <p className={`text-[11px] font-semibold ${isNote ? 'text-amber-100' : 'text-white'}`}>{card.title}</p>
            </div>
            <p className={`mt-2 line-clamp-2 text-[11px] leading-snug ${isNote ? 'text-amber-100/80' : 'text-zinc-300'}`}>
              {card.body}
            </p>
            {(card.meta || card.badge) && (
              <p className="mt-1 text-[10px] text-zinc-500">{card.meta ?? card.badge}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeroFlowLines({ reduceMotion }: { reduceMotion: boolean }) {
  const paths = [
    { d: 'M 0,70 C 220,30 420,150 720,260', delay: 0, duration: 3.2 },
    { d: 'M 0,180 C 240,220 460,180 720,260', delay: 0.5, duration: 3.6 },
    { d: 'M 0,300 C 230,300 470,320 720,260', delay: 1.0, duration: 3.9 },
    { d: 'M 0,400 C 230,360 470,300 720,260', delay: 1.4, duration: 4.1 },
  ];

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full lg:block"
      viewBox="0 0 720 460"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="flow-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(34,197,94,0.05)" />
          <stop offset="100%" stopColor="rgba(74,222,128,0.75)" />
        </linearGradient>
        <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {paths.map((p, i) => (
        <g key={i} filter="url(#flow-glow)">
          <motion.path
            d={p.d}
            stroke="url(#flow-gradient)"
            strokeWidth="1.3"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              reduceMotion
                ? { pathLength: 1, opacity: 0.45 }
                : { pathLength: 1, opacity: [0, 0.65, 0.65, 0] }
            }
            transition={
              reduceMotion
                ? { duration: 0.8, delay: p.delay }
                : { duration: p.duration, repeat: Infinity, ease: 'easeInOut', delay: p.delay }
            }
          />
        </g>
      ))}
    </svg>
  );
}

function HeroAttractionPoint({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <>
      {/* Convergence point sits at the right edge of the chaos zone, i.e. the
          left edge of the dashboard panel — the beam narrows horizontally
          toward it rather than floating in the middle of the section. */}
      <div className="pointer-events-none absolute right-0 top-[56%] z-10 hidden translate-x-1/2 -translate-y-1/2 lg:block">
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.4)_0%,transparent_70%)] blur-xl" />
        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] shadow-[0_0_18px_rgba(74,222,128,0.9)]" />
        <div
          className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(74,222,128,0.6) 0.6px, transparent 0.6px)',
            backgroundSize: '8px 8px',
          }}
        />
      </div>
      <motion.div
        className="pointer-events-none absolute right-[16%] top-[56%] z-10 hidden -translate-y-1/2 lg:block"
        animate={reduceMotion ? {} : { x: [0, 6, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
      >
        <ChevronRight className="h-6 w-6 text-white/80" />
      </motion.div>
    </>
  );
}

function DashboardSidebar() {
  return (
    <div className="hidden w-[168px] shrink-0 flex-col border-r border-zinc-800 py-6 pl-6 pr-4 md:flex">
      <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">K · Kadria</p>
      <div className="flex flex-1 flex-col gap-1">
        {SIDEBAR_ITEMS.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
              item.active ? 'bg-[var(--accent-dim)] font-semibold text-[var(--accent)]' : 'text-zinc-500'
            }`}
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            {item.label}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-[rgba(113,113,122,0.28)] bg-black/30 px-2 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-dim)] text-[10px] font-bold text-[var(--accent)]">
          B
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-zinc-200">Entreprise</p>
          <p className="truncate text-[10px] text-zinc-500">Bâtir Plus</p>
        </div>
      </div>
    </div>
  );
}

function DashboardHeader() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-base font-bold text-white">Cockpit</p>
        <p className="mt-1 text-[11px] text-zinc-500">Vue d’ensemble de votre activité commerciale</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-md border border-[rgba(113,113,122,0.28)] bg-black/30 px-2.5 py-1.5 text-[11px] text-zinc-300">
        Cette semaine <ChevronDown className="h-3 w-3 text-zinc-500" />
      </div>
    </div>
  );
}

function DashboardKpiRow1() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2.5">
      {KPI_ROW_1.map((kpi) => (
        <div
          key={kpi.key}
          className="rounded-lg border border-[rgba(113,113,122,0.28)] bg-[rgba(39,39,42,0.55)] p-3"
        >
          <p className="text-[10px] font-semibold text-zinc-400">{kpi.label}</p>
          {kpi.variant === 'ring' ? (
            <div className="mt-1.5 flex items-center gap-2">
              <div
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(var(--accent) ${86 * 3.6}deg, rgba(113,113,122,0.25) 0deg)`,
                }}
              >
                <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-zinc-900 text-[8px] font-bold text-white">
                  {kpi.value}
                </div>
              </div>
              <p className="text-[9px] leading-tight text-zinc-500">{kpi.sub}</p>
            </div>
          ) : (
            <div className="mt-1.5 flex items-center gap-2">
              {'icon' in kpi && kpi.icon && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--accent-dim)]">
                  <kpi.icon className="h-3.5 w-3.5 text-[var(--accent)]" />
                </span>
              )}
              <p className="truncate text-sm font-bold text-white">{kpi.value}</p>
            </div>
          )}
          {'delta' in kpi && kpi.delta ? (
            <p className="mt-1.5 text-[9px] font-medium text-[var(--accent)]">{kpi.delta}</p>
          ) : (
            <p className="mt-1.5 truncate text-[9px] text-zinc-500">{kpi.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function DashboardKpiRow2() {
  return (
    <div className="mt-2.5 grid grid-cols-3 gap-2.5">
      {KPI_ROW_2.map((kpi) => (
        <div
          key={kpi.key}
          className="rounded-lg border border-[rgba(113,113,122,0.28)] bg-[rgba(39,39,42,0.55)] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-zinc-400">{kpi.label}</p>
            {'icon' in kpi && kpi.icon && <kpi.icon className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />}
          </div>
          <p className="mt-1.5 text-sm font-bold text-white">{kpi.value}</p>
          {'amount' in kpi && kpi.amount && (
            <p className="text-[10px] font-semibold text-[var(--accent)]">{kpi.amount}</p>
          )}
          {kpi.variant === 'sparkline' ? (
            <svg viewBox="0 0 100 24" className="mt-1.5 h-5 w-full" preserveAspectRatio="none">
              <polyline
                points="0,20 15,18 30,14 45,15 60,9 75,10 100,3"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <p className="mt-1 text-[9px] text-zinc-500">{kpi.sub}</p>
          )}
          {'cta' in kpi && kpi.cta && (
            <button
              type="button"
              className="mt-2 w-full rounded-md border border-[rgba(74,222,128,0.28)] bg-[var(--accent-dim)] px-2 py-1 text-[9px] font-semibold text-[var(--accent)]"
            >
              {kpi.cta}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function DashboardOpportunitiesTable() {
  return (
    <div className="mt-3 rounded-lg border border-[rgba(113,113,122,0.28)] bg-[rgba(39,39,42,0.55)] p-3.5">
      <p className="text-xs font-semibold text-white">Opportunités prioritaires</p>
      <div className="mt-2.5 grid grid-cols-[1.1fr_1.4fr_1fr_0.6fr_1.1fr] gap-2 px-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
        <span>Prospect</span>
        <span>Projet</span>
        <span>Statut</span>
        <span>Score</span>
        <span>Prochaine action</span>
      </div>
      <div className="mt-1.5 space-y-1.5">
        {OPPORTUNITIES.map((opp) => (
          <div
            key={opp.prospect}
            className="grid grid-cols-[1.1fr_1.4fr_1fr_0.6fr_1.1fr] items-center gap-2 rounded-md bg-black/30 px-1.5 py-1.5"
          >
            <span className="truncate text-[10px] font-semibold text-zinc-200">{opp.prospect}</span>
            <span className="truncate text-[10px] text-zinc-400">{opp.project}</span>
            <span
              className={`w-fit rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${
                opp.statusStyle === 'hot'
                  ? 'bg-orange-500/15 text-orange-400'
                  : opp.statusStyle === 'complete'
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                    : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              {opp.status}
            </span>
            <span className="text-[10px] font-semibold text-white">{opp.score}</span>
            <button
              type="button"
              className="truncate rounded-md border border-[rgba(74,222,128,0.28)] px-1.5 py-1 text-left text-[9px] font-medium text-[var(--accent)]"
            >
              {opp.action}
            </button>
          </div>
        ))}
      </div>
      <Link
        href="/demo-request"
        className="mt-2.5 inline-flex text-[10px] font-medium text-[var(--accent)] hover:underline"
      >
        Voir toutes les opportunités →
      </Link>
    </div>
  );
}

function HeroDashboardPreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-[rgba(74,222,128,0.28)] bg-[rgba(11,15,13,0.96)] shadow-[0_40px_120px_rgba(0,0,0,0.65),0_0_70px_rgba(34,197,94,0.16),inset_1px_0_0_rgba(74,222,128,0.25)]">
      <div className="flex">
        <DashboardSidebar />
        <div className="min-w-0 flex-1 px-6 py-6">
          <DashboardHeader />
          <DashboardKpiRow1 />
          <DashboardKpiRow2 />
          <DashboardOpportunitiesTable />
        </div>
      </div>
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

      <div className="relative z-10 mx-auto grid w-full max-w-[1800px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[34%_28%_38%] lg:items-center lg:gap-4 lg:px-10 lg:py-10 xl:px-16">
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
            className="mt-5 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.4rem] xl:text-[3.8rem]"
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
            className="mt-5 text-base leading-relaxed text-zinc-400 sm:text-lg"
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
            className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
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
            className="mt-6 flex flex-col gap-2"
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
        </div>

        {/* Zone centrale — chaos commercial entrant */}
        <div className="relative hidden h-[520px] lg:block">
          <HeroFlowLines reduceMotion={reduceMotion} />
          <HeroAttractionPoint reduceMotion={reduceMotion} />
          {SIGNAL_CARDS.map((card) => (
            <HeroSignalCard key={card.key} card={card} reduceMotion={reduceMotion} />
          ))}
        </div>

        {/* Zone droite — dashboard partiel, coupé par le bord de l'écran */}
        <div className="relative hidden overflow-hidden lg:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, type: 'spring', stiffness: 85, damping: 18 }}
            className="absolute right-[-160px] top-1/2 w-[760px] -translate-y-1/2 xl:right-[-220px] xl:w-[920px]"
          >
            <HeroDashboardPreview />
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
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 hidden flex-col items-center gap-3 px-10 lg:flex">
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

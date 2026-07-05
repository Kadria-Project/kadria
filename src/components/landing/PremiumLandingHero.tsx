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
  Kanban,
  Bell,
  Calendar,
  BookOpen,
  Settings,
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

const REASSURANCE_ITEMS = ['Sans engagement', 'Avec ou sans site', 'Pensé pour les artisans du bâtiment'];

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
  { label: 'Vue d’ensemble', icon: LayoutDashboard, active: true },
  { label: 'Dossiers', icon: Folder, active: false },
  { label: 'Pipeline', icon: Kanban, active: false },
  { label: 'Devis', icon: Receipt, active: false },
  { label: 'Relances', icon: Bell, active: false },
  { label: 'Agenda', icon: Calendar, active: false },
  { label: 'Catalogue', icon: BookOpen, active: false },
  { label: 'Paramètres', icon: Settings, active: false },
];

const PRIORITY_FOLDERS = [
  { name: 'Rénovation salle de bain', city: 'Rouen', score: 86, badge: 'Très chaud', badgeStyle: 'hot' },
  { name: 'Réfection toiture', city: 'Mont-Saint-Aignan', score: 78, badge: 'À rappeler', badgeStyle: 'warm' },
  { name: 'Cuisine complète', city: 'Rouen', score: 72, badge: 'Devis à envoyer', badgeStyle: 'neutral' },
] as const;

const PIPELINE_COLUMNS = [
  { label: 'Nouveau', count: 7 },
  { label: 'Qualifié', count: 5 },
  { label: 'Devis', count: 3 },
  { label: 'Gagné', count: 2 },
] as const;

const TODAY_ACTIONS = [
  { label: 'Relancer Mme Laurent', time: '09:30' },
  { label: 'Appeler M. Durand', time: '10:15' },
  { label: 'Envoyer devis cuisine', time: '14:00' },
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

function HeroAttractionPoint() {
  return (
    <div className="pointer-events-none absolute left-[58%] top-[48%] z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.35)_0%,transparent_70%)] blur-xl" />
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
  );
}

function DashboardSidebar() {
  return (
    <div className="hidden w-[168px] shrink-0 flex-col gap-1 border-r border-zinc-800 py-6 pl-6 pr-4 md:flex">
      <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">Kadria</p>
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
  );
}

function DashboardPriorityList() {
  return (
    <div className="mt-4 rounded-lg border border-[rgba(113,113,122,0.28)] bg-[rgba(39,39,42,0.55)] p-3.5">
      <p className="text-xs font-semibold text-white">Dossiers prioritaires</p>
      <div className="mt-2.5 space-y-2">
        {PRIORITY_FOLDERS.map((folder) => (
          <div
            key={folder.name}
            className="flex items-center justify-between gap-2 rounded-md bg-black/30 px-3 py-2 text-[11px]"
          >
            <div className="min-w-0">
              <span className="font-semibold text-zinc-200">{folder.name}</span>
              <span className="ml-2 truncate text-zinc-500">{folder.city}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  folder.badgeStyle === 'hot'
                    ? 'bg-red-500/15 text-red-400'
                    : folder.badgeStyle === 'warm'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-[var(--accent-dim)] text-[var(--accent)]'
                }`}
              >
                {folder.badge}
              </span>
              <span className="font-semibold text-white">{folder.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPipelinePreview() {
  return (
    <div className="mt-3 rounded-lg border border-[rgba(113,113,122,0.28)] bg-[rgba(39,39,42,0.55)] p-3.5">
      <p className="text-xs font-semibold text-white">Pipeline commercial</p>
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        {PIPELINE_COLUMNS.map((col) => (
          <div key={col.label} className="rounded-md bg-black/30 px-2 py-2 text-center">
            <p className="text-[10px] text-zinc-500">{col.label}</p>
            <p className="mt-1 text-sm font-bold text-white">{col.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardActionsPreview() {
  return (
    <div className="mt-3 rounded-lg border border-[rgba(113,113,122,0.28)] bg-[rgba(39,39,42,0.55)] p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white">Actions du jour</p>
        <Link href="/demo-request" className="text-[10px] font-medium text-[var(--accent)] hover:underline">
          Voir toutes les actions →
        </Link>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {TODAY_ACTIONS.map((action) => (
          <div
            key={action.label}
            className="flex items-center justify-between gap-2 rounded-md bg-black/30 px-3 py-1.5 text-[11px]"
          >
            <span className="truncate text-zinc-300">{action.label}</span>
            <span className="shrink-0 font-semibold text-zinc-500">{action.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroDashboardPreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-[rgba(74,222,128,0.28)] bg-[rgba(11,15,13,0.96)] shadow-[0_40px_120px_rgba(0,0,0,0.65),0_0_70px_rgba(34,197,94,0.16),inset_1px_0_0_rgba(74,222,128,0.25)]">
      <div className="flex">
        <DashboardSidebar />
        <div className="min-w-0 flex-1 px-6 py-6">
          <div>
            <p className="text-base font-bold text-white">Bonjour Thomas 👋</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              <span className="font-semibold text-[var(--accent)]">7</span> nouveaux dossiers ·{' '}
              <span className="font-semibold text-[var(--accent)]">4</span> relances ·{' '}
              <span className="font-semibold text-[var(--accent)]">3</span> devis à suivre
            </p>
          </div>
          <DashboardPriorityList />
          <DashboardPipelinePreview />
          <DashboardActionsPreview />
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
            Passez du chaos commercial à{' '}
            <span className="font-extrabold text-[var(--accent)]">des dossiers prêts à vendre.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.2}
            className="mt-5 text-base leading-relaxed text-zinc-400 sm:text-lg"
          >
            Kadria capte chaque demande, structure l&rsquo;information, priorise vos actions et
            vous aide à convertir plus de chantiers.
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
              Demander une démo
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.4}
            className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400"
          >
            {REASSURANCE_ITEMS.map((item, index) => (
              <span key={item} className="flex items-center gap-2">
                {item}
                {index < REASSURANCE_ITEMS.length - 1 && (
                  <span className="hidden text-zinc-700 sm:inline">&bull;</span>
                )}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Zone centrale — chaos commercial entrant */}
        <div className="relative hidden h-[520px] lg:block">
          <HeroFlowLines reduceMotion={reduceMotion} />
          <HeroAttractionPoint />
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
            <p className="text-sm font-bold text-white">Bonjour Thomas 👋</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              <span className="font-semibold text-[var(--accent)]">7</span> nouveaux dossiers ·{' '}
              <span className="font-semibold text-[var(--accent)]">4</span> relances ·{' '}
              <span className="font-semibold text-[var(--accent)]">3</span> devis à suivre
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-black/30 px-3 py-2 text-[11px]">
              <span className="truncate text-zinc-300">
                <span className="font-semibold text-zinc-200">{PRIORITY_FOLDERS[0].name}</span>{' '}
                {PRIORITY_FOLDERS[0].city}
              </span>
              <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                {PRIORITY_FOLDERS[0].badge}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default PremiumLandingHero;

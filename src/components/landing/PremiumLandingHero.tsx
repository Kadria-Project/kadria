'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Phone,
  MessageCircle,
  FileText,
  Camera,
  StickyNote,
  Receipt,
  LayoutDashboard,
  Target,
  Folder,
  Bell,
  Calendar,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

/**
 * Premium landing Hero for Kadria's public homepage.
 *
 * Scope note: this component owns ONLY the Hero visuals/copy/animations.
 * CTA behaviour is passed in via props so the parent (KadriaPages.tsx)
 * keeps full control of trial-modal / navigation logic.
 */

type PremiumLandingHeroProps = {
  onOpenTrial: () => void;
};

const REASSURANCE_ITEMS = [
  'Essai gratuit 7 jours',
  'Sans engagement',
  'Annulation en 1 clic',
  'Données sécurisées',
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

const KPI_CARDS = [
  { label: 'Dossier complet', value: '86%', ring: true },
  { label: 'Prospect chaud', value: '12', accent: true },
  { label: 'Action recommandée', value: 'Relancer 5 devis', wide: true },
  { label: 'Devis accepté', value: '7' },
  { label: 'Relance aujourd’hui', value: '3', accent: true },
  { label: 'Chantiers à venir', value: '4' },
];

const KPI_CARDS_MOBILE = [
  { label: 'Dossier complet', value: '86%' },
  { label: 'Prospect chaud', value: '12' },
  { label: 'Devis accepté', value: '7' },
  { label: 'Relance aujourd’hui', value: '3' },
];

const OPPORTUNITIES = [
  { name: 'M. Durand', detail: 'Rénovation complète maison', tag: 'Prospect chaud', score: '92%' },
  { name: 'Mme Martin', detail: 'Extension 20m²', tag: 'Dossier complet', score: '88%' },
  { name: 'M. Bernard', detail: 'Salle de bain', tag: 'À relancer', score: '65%' },
];

const CHAOS_CARDS = [
  {
    key: 'appel',
    icon: Phone,
    title: 'Appel manqué',
    body: '06 72 11 47 09',
    meta: 'Hier, 18:42',
    className: 'left-[2%] top-[4%] rotate-[-6deg]',
    delay: 0.9,
    float: { y: [0, -8, 0] },
    duration: 6,
  },
  {
    key: 'whatsapp',
    icon: MessageCircle,
    title: 'Message WhatsApp',
    body: 'Bonjour, j’aurais besoin d’un devis pour refaire ma salle de bain.',
    meta: 'Hier, 17:32',
    className: 'right-[0%] top-[0%] rotate-[4deg]',
    delay: 1.0,
    float: { y: [0, 9, 0] },
    duration: 7,
  },
  {
    key: 'formulaire',
    icon: FileText,
    title: 'Nouveau formulaire',
    body: 'Rénovation complète',
    meta: 'Incomplet',
    className: 'left-[10%] top-[30%] rotate-[3deg]',
    delay: 1.1,
    float: { y: [0, -7, 0] },
    duration: 6.5,
  },
  {
    key: 'photo',
    icon: Camera,
    title: 'Photo chantier',
    body: 'IMG_20240517.jpg',
    meta: null,
    className: 'right-[6%] top-[36%] rotate-[-5deg]',
    delay: 1.2,
    float: { y: [0, 8, 0] },
    duration: 7.5,
  },
  {
    key: 'note',
    icon: StickyNote,
    title: 'Note rappel',
    body: 'M. Laurent — rappeler demain + voir pour devis urgente',
    meta: null,
    className: 'left-[0%] bottom-[6%] rotate-[5deg]',
    delay: 1.3,
    float: { y: [0, -9, 0] },
    duration: 6.8,
  },
  {
    key: 'devis',
    icon: Receipt,
    title: 'Devis à relancer',
    body: 'Devis N°2024-0478',
    meta: 'En retard',
    className: 'right-[4%] bottom-[0%] rotate-[-3deg]',
    delay: 1.4,
    float: { y: [0, 8, 0] },
    duration: 7.2,
  },
];

const CHAOS_CARDS_MOBILE = ['appel', 'formulaire', 'devis'];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

function ChaosCards({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <>
      {CHAOS_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 26, scale: 0.92, rotate: 0 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 110, damping: 15, delay: card.delay }}
            whileHover={
              reduceMotion
                ? undefined
                : { scale: 1.04, boxShadow: '0 0 44px rgba(34,197,94,0.35)' }
            }
            className={`absolute z-20 w-[196px] rounded-xl border border-[rgba(74,222,128,0.22)] bg-[rgba(24,24,27,0.78)] p-3.5 shadow-[0_14px_44px_rgba(0,0,0,0.55),0_0_24px_rgba(34,197,94,0.12)] backdrop-blur-md ${card.className}`}
          >
            <motion.div
              animate={reduceMotion ? {} : card.float}
              transition={{ duration: card.duration, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--accent-dim)]">
                  <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
                </span>
                <p className="text-[11px] font-semibold text-white">{card.title}</p>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-snug text-zinc-300">{card.body}</p>
              {card.meta && <p className="mt-1 text-[10px] text-zinc-500">{card.meta}</p>}
            </motion.div>
          </motion.div>
        );
      })}
    </>
  );
}

function ChaosCardsMobile() {
  const cards = CHAOS_CARDS.filter((c) => CHAOS_CARDS_MOBILE.includes(c.key));
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="w-[168px] shrink-0 rounded-xl border border-[rgba(74,222,128,0.22)] bg-[rgba(24,24,27,0.78)] p-3 shadow-[0_10px_28px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-dim)]">
                <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
              </span>
              <p className="text-[11px] font-semibold text-white">{card.title}</p>
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-zinc-300">{card.body}</p>
            {card.meta && <p className="mt-1 text-[10px] text-zinc-500">{card.meta}</p>}
          </div>
        );
      })}
    </div>
  );
}

function FlowArcs({ reduceMotion }: { reduceMotion: boolean }) {
  const paths = [
    { d: 'M 10,90 C 220,40 420,150 780,110', delay: 0, duration: 3.2 },
    { d: 'M 10,220 C 240,260 460,180 780,220', delay: 0.6, duration: 3.6 },
    { d: 'M 10,340 C 230,320 470,380 780,300', delay: 1.1, duration: 3.9 },
  ];

  return (
    <svg
      className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
      viewBox="0 0 800 420"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      {paths.map((p, i) => (
        <g key={i}>
          <motion.path
            d={p.d}
            stroke="rgba(34,197,94,0.35)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              reduceMotion
                ? { pathLength: 1, opacity: 0.5 }
                : { pathLength: 1, opacity: [0, 0.65, 0.65, 0] }
            }
            transition={
              reduceMotion
                ? { duration: 0.8, delay: p.delay }
                : { duration: p.duration, repeat: Infinity, ease: 'easeInOut', delay: p.delay }
            }
          />
          {!reduceMotion && (
            <motion.circle
              r="3.2"
              fill="rgba(74,222,128,0.9)"
              initial={{ opacity: 0 }}
              animate={{
                offsetDistance: ['0%', '100%'],
                opacity: [0, 1, 1, 0],
              }}
              transition={{ duration: p.duration, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
              style={{ offsetPath: `path('${p.d}')` }}
            />
          )}
        </g>
      ))}
    </svg>
  );
}

function ProgressRing({ value }: { value: number }) {
  const size = 40;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(113,113,122,0.3)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--accent)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.7))' }}
      />
    </svg>
  );
}

function CockpitMock({ compact = false, reduceMotion = false }: { compact?: boolean; reduceMotion?: boolean }) {
  const kpis = compact ? KPI_CARDS_MOBILE : KPI_CARDS;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-[rgba(74,222,128,0.32)] bg-[rgba(9,12,10,0.94)] shadow-[0_40px_120px_rgba(0,0,0,0.65),0_0_70px_rgba(34,197,94,0.18),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl ${
        compact ? 'p-4' : 'p-6 lg:p-7'
      }`}
    >
      <div className="flex gap-5">
        {!compact && (
          <div className="hidden w-40 shrink-0 flex-col gap-1 border-r border-zinc-800 pr-4 md:flex">
            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">Kadria</p>
            {SIDEBAR_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                  item.active
                    ? 'bg-[var(--accent-dim)] font-semibold text-[var(--accent)]'
                    : 'text-zinc-500'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </div>
            ))}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-base font-bold text-white">Cockpit</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">Vue d&rsquo;ensemble de votre activité commerciale</p>
            </div>
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
              Cette semaine
            </span>
          </div>

          <div className={`mt-4 grid grid-cols-2 gap-2.5 ${compact ? '' : 'sm:grid-cols-3'}`}>
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className={`flex items-center gap-2.5 rounded-lg border border-[rgba(113,113,122,0.32)] bg-[rgba(39,39,42,0.6)] p-3 ${
                  !compact && 'wide' in kpi && kpi.wide ? 'col-span-2 sm:col-span-1' : ''
                }`}
              >
                {!compact && 'ring' in kpi && kpi.ring ? (
                  <ProgressRing value={parseInt(kpi.value, 10)} />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-[10px] text-zinc-400">{kpi.label}</p>
                  <p
                    className={`mt-0.5 truncate font-bold text-white ${
                      !compact && 'accent' in kpi && kpi.accent ? 'text-[var(--accent)]' : ''
                    } ${!compact && 'wide' in kpi && kpi.wide ? 'text-sm' : 'text-lg'}`}
                  >
                    {kpi.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {!compact && (
            <div className="mt-4 rounded-lg border border-[rgba(113,113,122,0.32)] bg-[rgba(39,39,42,0.6)] p-3.5">
              <p className="text-xs font-semibold text-white">Opportunités prioritaires</p>
              <div className="mt-2.5 space-y-2">
                {OPPORTUNITIES.map((opp) => (
                  <div
                    key={opp.name}
                    className="flex items-center justify-between gap-2 rounded-md bg-black/30 px-3 py-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-zinc-200">{opp.name}</span>
                      <span className="ml-2 truncate text-zinc-400">{opp.detail}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          opp.tag === 'À relancer'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-[var(--accent-dim)] text-[var(--accent)]'
                        }`}
                      >
                        {opp.tag}
                      </span>
                      <span className="font-semibold text-white">{opp.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {compact && (
            <>
              <div className="mt-3 rounded-lg border border-[rgba(113,113,122,0.32)] bg-[rgba(39,39,42,0.6)] p-3">
                <p className="text-xs font-semibold text-white">Actions recommandées</p>
                <p className="mt-1 text-[11px] text-zinc-400">Relancer 5 devis</p>
              </div>
              <div className="mt-3 rounded-lg border border-[rgba(113,113,122,0.32)] bg-[rgba(39,39,42,0.6)] p-3">
                <p className="text-xs font-semibold text-white">Opportunité prioritaire</p>
                <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-black/30 px-2.5 py-1.5 text-[11px]">
                  <span className="truncate text-zinc-300">
                    <span className="font-semibold text-zinc-200">{OPPORTUNITIES[0].name}</span>{' '}
                    {OPPORTUNITIES[0].detail}
                  </span>
                  <span className="shrink-0 rounded-full bg-[var(--accent-dim)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    {OPPORTUNITIES[0].score}
                  </span>
                </div>
              </div>
            </>
          )}
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
          background: 'radial-gradient(ellipse 70% 50% at 50% 100%, transparent 40%, #09090b 80%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_84%_50%,rgba(34,197,94,0.22)_0%,transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_48%_45%,rgba(34,197,94,0.16)_0%,transparent_62%)]" />

      <div className="relative z-10 mx-auto grid w-full max-w-[1800px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[36%_26%_38%] lg:items-center lg:gap-6 lg:px-10 lg:py-10 xl:px-16">
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
            Le cockpit commercial des artisans du bâtiment
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.1}
            className="mt-5 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.6rem] xl:text-[4rem]"
          >
            Passez du chaos commercial{' '}
            <span className="font-extrabold text-[var(--accent)]">à des dossiers prêts à vendre.</span>
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
              Essayer gratuitement <ArrowRight className="h-5 w-5" />
            </button>
            <Link
              href="/demo-request"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-zinc-700 bg-black/30 px-6 py-3.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white sm:w-auto"
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
            {REASSURANCE_ITEMS.map((item, index) => (
              <span key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--accent)]" />
                {item}
                {index < REASSURANCE_ITEMS.length - 1 && (
                  <span className="hidden text-zinc-700 sm:inline">&bull;</span>
                )}
              </span>
            ))}
          </motion.div>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.5}
            className="mt-5 text-sm text-zinc-500"
          >
            Adopté par des artisans et petites entreprises du bâtiment
          </motion.p>
        </div>

        {/* Zone centrale — chaos commercial */}
        <div className="relative hidden h-[520px] lg:block">
          <FlowArcs reduceMotion={reduceMotion} />
          <ChaosCards reduceMotion={reduceMotion} />
        </div>

        {/* Zone droite — grand cockpit */}
        <div className="relative hidden lg:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 28, rotateY: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateY: -2 }}
            transition={{ duration: 0.9, delay: 0.4, type: 'spring', stiffness: 85, damping: 18 }}
            style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
            className="relative w-full max-w-none lg:min-w-[560px] xl:min-w-[700px]"
          >
            <CockpitMock />
          </motion.div>
        </div>

        {/* Mobile — chaos compact + mini cockpit */}
        <div className="lg:hidden">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.3} className="mt-2">
            <ChaosCardsMobile />
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.4} className="mt-4">
            <CockpitMock compact reduceMotion={reduceMotion} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default PremiumLandingHero;

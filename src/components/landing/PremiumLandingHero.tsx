'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
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

const KPI_CARDS = [
  { label: 'CA potentiel', value: '5.8k €' },
  { label: 'Devis envoyés', value: '276 €' },
  { label: 'Chantiers gagnés', value: '276 €' },
  { label: 'Taux de conversion', value: '33.3 %' },
];

const OPPORTUNITIES = [
  { name: 'Rénovation complète maison', amount: '28 500 €', score: '88/100' },
  { name: 'Extension maison 40m²', amount: '24 000 €', score: '82/100' },
  { name: 'Dépannage plomberie', amount: '450 €', score: 'Nouveau' },
];

const REASSURANCE_ITEMS = [
  'Essai gratuit 7 jours',
  'Sans engagement',
  'Annulation en 1 clic',
  'Données sécurisées',
];

const SIDEBAR_ITEMS = [
  'Kadria',
  'Cockpit',
  'Demandes',
  'Dossiers',
  'Devis',
  'Relances',
  'Calendrier',
  'Contacts',
  'Reporting',
  'Paramètres',
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

const floatCardVariants = (delay: number): Variants => ({
  hidden: { opacity: 0, y: 24, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 120, damping: 16, delay },
  },
});

function FloatingCards({ reduceMotion }: { reduceMotion: boolean }) {
  const cards = [
    {
      key: 'hot',
      className: 'left-[-6%] top-[8%]',
      delay: 0.9,
      float: reduceMotion ? {} : { y: [0, -8, 0] },
      duration: 6,
      content: (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            Prospect chaud
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Rénovation complète</p>
          <p className="mt-0.5 text-xs text-zinc-400">28 500 € · 88/100</p>
        </>
      ),
    },
    {
      key: 'relance',
      className: 'right-[-8%] top-[2%]',
      delay: 1.1,
      float: reduceMotion ? {} : { y: [0, 9, 0] },
      duration: 7,
      content: (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            Relance aujourd&rsquo;hui
          </p>
          <p className="mt-1 text-sm font-semibold text-white">7 devis en attente</p>
          <p className="mt-0.5 text-xs text-zinc-400">Voir la liste</p>
        </>
      ),
    },
    {
      key: 'qualifie',
      className: 'left-[-4%] bottom-[16%]',
      delay: 1.3,
      float: reduceMotion ? {} : { y: [0, -7, 0] },
      duration: 6.5,
      content: (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            Dossier qualifié
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Extension maison</p>
          <p className="mt-0.5 text-xs text-zinc-400">24 000 € · 82/100</p>
        </>
      ),
    },
    {
      key: 'zone',
      className: 'right-[-4%] bottom-[4%]',
      delay: 1.5,
      float: reduceMotion ? {} : { y: [0, 8, 0] },
      duration: 7.5,
      content: (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            Zone active
          </p>
          <p className="mt-1 text-sm font-semibold text-white">3 dossiers autour de Rouen</p>
          <p className="mt-0.5 text-xs text-zinc-400">Voir sur la carte</p>
        </>
      ),
    },
  ];

  return (
    <>
      {cards.map((card) => (
        <motion.div
          key={card.key}
          variants={floatCardVariants(card.delay)}
          initial="hidden"
          animate="show"
          whileHover={reduceMotion ? undefined : { boxShadow: '0 0 44px rgba(34,197,94,0.35)' }}
          className={`absolute z-20 hidden w-[190px] rounded-xl border border-[rgba(74,222,128,0.25)] bg-[rgba(24,24,27,0.82)] p-3 shadow-[0_14px_44px_rgba(0,0,0,0.5),0_0_24px_rgba(34,197,94,0.12)] backdrop-blur-md lg:block ${card.className}`}
        >
          <motion.div animate={card.float} transition={{ duration: card.duration, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}>
            {card.content}
          </motion.div>
        </motion.div>
      ))}
    </>
  );
}

function GlowArcs() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full lg:block"
      viewBox="0 0 600 600"
      fill="none"
      aria-hidden="true"
    >
      <motion.circle
        cx="300"
        cy="300"
        r="260"
        stroke="rgba(34,197,94,0.28)"
        strokeWidth="1.5"
        strokeDasharray="6 10"
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: 0.8, rotate: 360 }}
        transition={{ opacity: { duration: 1.2 }, rotate: { duration: 90, repeat: Infinity, ease: 'linear' } }}
      />
      <motion.circle
        cx="300"
        cy="300"
        r="210"
        stroke="rgba(34,197,94,0.2)"
        strokeWidth="1.5"
        strokeDasharray="2 14"
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: 0.6, rotate: -360 }}
        transition={{ opacity: { duration: 1.4, delay: 0.2 }, rotate: { duration: 130, repeat: Infinity, ease: 'linear' } }}
      />
    </svg>
  );
}

function CockpitMock({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-[rgba(74,222,128,0.28)] bg-[var(--bg-elevated)]/[0.97] shadow-[0_30px_90px_rgba(0,0,0,0.6),0_0_60px_rgba(34,197,94,0.15),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl ${
        compact ? 'p-4' : 'p-6'
      }`}
    >
      <div className="flex gap-4">
        {!compact && (
          <div className="hidden w-32 shrink-0 flex-col gap-2 border-r border-zinc-800 pr-3 md:flex">
            {SIDEBAR_ITEMS.map((item, i) => (
              <div
                key={item}
                className={`rounded-md px-2 py-1.5 text-[11px] ${
                  i === 1
                    ? 'bg-[var(--accent-dim)] font-semibold text-[var(--accent)]'
                    : 'text-zinc-500'
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">Bonjour Julien 👋</p>
              <p className="text-[11px] text-zinc-500">Vue d&rsquo;ensemble de votre activité commerciale</p>
            </div>
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
              Cette semaine
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {KPI_CARDS.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-[rgba(113,113,122,0.3)] bg-[rgba(39,39,42,0.55)] p-2.5"
              >
                <p className="text-[10px] text-zinc-400">{kpi.label}</p>
                <p className="mt-1 text-base font-bold text-white">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-[rgba(113,113,122,0.3)] bg-[rgba(39,39,42,0.55)] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white">Actions à traiter</p>
              <span className="rounded-full bg-[var(--accent-dim)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                7 en attente
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              3 appels · 2 devis · 2 rendez-vous
            </p>
            <span className="mt-2 inline-block text-[11px] font-medium text-[var(--accent)]">Voir mes tâches</span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[rgba(113,113,122,0.3)] bg-[rgba(39,39,42,0.55)] p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">Santé commerciale</p>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_6px_rgba(34,197,94,0.9)]" />
              </div>
              <p className="mt-1 text-[11px] font-semibold text-[var(--accent)]">En excellente santé</p>
              <p className="mt-1 text-[11px] text-zinc-400">Maturité moyenne 82/100</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-[82%] rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(34,197,94,0.7)]" />
              </div>
            </div>

            <div className="rounded-lg border border-[rgba(113,113,122,0.3)] bg-[rgba(39,39,42,0.55)] p-3">
              <p className="text-xs font-semibold text-white">Zone active</p>
              <p className="mt-1 text-[11px] text-zinc-400">3 dossiers autour de Rouen</p>
              <div className="mt-2 grid grid-cols-6 gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-sm ${
                      [1, 4, 8].includes(i)
                        ? 'bg-[var(--accent)] shadow-[0_0_6px_rgba(34,197,94,0.7)]'
                        : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {!compact && (
            <div className="mt-3 rounded-lg border border-[rgba(113,113,122,0.3)] bg-[rgba(39,39,42,0.55)] p-3">
              <p className="text-xs font-semibold text-white">Opportunités prioritaires</p>
              <div className="mt-2 space-y-1.5">
                {OPPORTUNITIES.map((opp) => (
                  <div
                    key={opp.name}
                    className="flex items-center justify-between rounded-md bg-black/25 px-2 py-1.5 text-[11px]"
                  >
                    <span className="truncate text-zinc-300">{opp.name}</span>
                    <span className="shrink-0 text-zinc-400">
                      {opp.amount} ·{' '}
                      <span className="font-semibold text-[var(--accent)]">{opp.score}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {compact && (
            <div className="mt-3 rounded-lg border border-[rgba(113,113,122,0.3)] bg-[rgba(39,39,42,0.55)] p-3">
              <p className="text-xs font-semibold text-white">Opportunité prioritaire</p>
              <div className="mt-2 flex items-center justify-between rounded-md bg-black/25 px-2 py-1.5 text-[11px]">
                <span className="truncate text-zinc-300">{OPPORTUNITIES[0].name}</span>
                <span className="shrink-0 text-zinc-400">
                  {OPPORTUNITIES[0].amount} ·{' '}
                  <span className="font-semibold text-[var(--accent)]">{OPPORTUNITIES[0].score}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PremiumLandingHero({ onOpenTrial }: PremiumLandingHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[92dvh] w-full items-start overflow-hidden bg-zinc-950 pt-[88px] md:min-h-0">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 100%, transparent 40%, #09090b 80%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,197,94,0.18)_0%,transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_78%_45%,rgba(34,197,94,0.16)_0%,transparent_62%)]" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-4 py-6 sm:px-6 md:grid-cols-[0.95fr_1.05fr] md:items-center md:gap-10 md:py-8 lg:px-12">
        {/* Colonne gauche — texte */}
        <div>
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
            className="mt-4 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.3rem]"
          >
            Passez du chaos commercial à des{' '}
            <span className="font-extrabold text-[var(--accent)]">dossiers prêts à vendre.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.2}
            className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg"
          >
            Kadria centralise vos demandes, structure vos dossiers, suit vos devis et vous montre
            les meilleures opportunités à traiter en priorité.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.3}
            className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
          >
            <button
              type="button"
              onClick={onOpenTrial}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-7 py-3.5 text-base font-bold text-zinc-950 shadow-[0_8px_28px_rgba(34,197,94,0.4)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(34,197,94,0.55)] hover:brightness-110 sm:w-auto"
            >
              Essayer gratuitement <ArrowRight className="h-5 w-5" />
            </button>
            <Link
              href="/demo-request"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-zinc-800 px-6 py-3 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 sm:w-auto"
            >
              Demander un accès démo
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.4}
            className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400"
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
            className="mt-4 text-sm text-zinc-500"
          >
            Adopté par des artisans et petites entreprises du bâtiment
          </motion.p>
        </div>

        {/* Colonne droite — cockpit desktop */}
        <div className="relative hidden md:block">
          <GlowArcs />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, type: 'spring', stiffness: 90, damping: 18 }}
            className="relative"
          >
            <CockpitMock />
          </motion.div>
          <FloatingCards reduceMotion={!!reduceMotion} />
        </div>

        {/* Mini cockpit mobile */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.35}
          className="md:hidden"
        >
          <CockpitMock compact />
        </motion.div>
      </div>
    </section>
  );
}

export default PremiumLandingHero;

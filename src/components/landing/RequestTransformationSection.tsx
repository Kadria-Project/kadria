'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ClipboardCheck, ListChecks, Target } from 'lucide-react';
import { AssistantWebChatCard, type ChatMsg } from '@/src/components/landing/AssistantWebDemo';
import { VoiceAssistantCard } from '@/src/components/landing/AssistantVocalDemo';

/* ─────────────────────────────────────────────
   Stable reduced-motion preference. `useReducedMotion()` reads
   `window.matchMedia` synchronously on the client's first render while
   always returning `null` on the server, which makes the client's
   hydration-matching render diverge from the SSR output. Gate the real
   value behind a mounted flag so server + pre-hydration client render
   agree (false), then pick up the real preference right after mount.
   Same pattern as `useStableReducedMotion()` in LandingHero.tsx.
   ───────────────────────────────────────────── */
function useStableReducedMotion() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? Boolean(prefersReduced) : false;
}

const GREEN = 'oklch(0.86 0.19 145)';
const DARK_BG = 'oklch(0.16 0.008 260)';
const CARD_BG = 'oklch(0.215 0.008 260)';
const BORDER = 'oklch(1 0 0 / 0.09)';
const BORDER_STRONG = 'oklch(1 0 0 / 0.16)';
const TEXT = 'oklch(0.96 0.005 90)';
const TEXT_MUTED = 'oklch(0.7 0.01 260)';
const TEXT_DIM = 'oklch(0.55 0.01 260)';
const ORANGE = 'oklch(0.82 0.16 65)';

/* Dedicated, short conversation for this section — reuses the exact same
   AssistantWebChatCard component/animation/style as the "Deux assistants.
   Une seule plateforme." section, only the message content differs. */
const WEB_DEMO_MESSAGES: ChatMsg[] = [
  { role: 'user', text: 'Bonjour, je souhaite installer une borne de recharge à domicile.', delay: 0 },
  {
    role: 'assistant',
    text: 'Parfait ! Pour bien préparer votre projet, pouvez-vous me préciser où se situe le chantier ?',
    delay: 2200,
  },
  { role: 'user', text: 'À Lyon 3e.', delay: 4600 },
  {
    role: 'assistant',
    text: 'Merci ! Quel est votre délai idéal pour les travaux ?',
    delay: 6800,
  },
];

const WEB_COLLECTED_FIELDS = [
  { label: 'Projet', value: 'Borne de recharge' },
  { label: 'Localisation', value: 'Lyon (69003)' },
  { label: 'Photos', value: '3 ajoutées' },
  { label: 'Délai', value: 'Sous 2 semaines' },
];

const VOICE_DEMO_MESSAGES: { role: 'client' | 'kadria'; text: string; delay: number }[] = [
  { role: 'kadria', text: 'Bonjour, pour quel type de projet puis-je vous aider ?', delay: 0 },
  { role: 'client', text: 'Je souhaite installer une borne de recharge à la maison.', delay: 2400 },
  {
    role: 'kadria',
    text: 'Parfait. Où se situe le chantier et quand souhaitez-vous réaliser les travaux ?',
    delay: 4800,
  },
];

const BENEFITS = [
  {
    icon: ListChecks,
    title: 'Informations essentielles collectées',
    body: 'Projet, localisation, budget, délais et photos rassemblés automatiquement.',
  },
  {
    icon: ClipboardCheck,
    title: 'Dossier exploitable immédiatement',
    body: 'Un dossier complet, structuré et prêt à être traité sans ressaisie.',
  },
  {
    icon: Target,
    title: 'Prochaine action identifiée',
    body: "Kadria recommande l'action prioritaire pour convertir plus vite.",
  },
];

function DossierCard({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: 'easeOut', delay: reduce ? 0 : 0.3 }}
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl p-5 backdrop-blur-sm"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid color-mix(in oklab, ${GREEN} 30%, transparent)`,
        boxShadow: `0 0 0 1px color-mix(in oklab, ${GREEN} 10%, transparent), 0 0 60px -20px color-mix(in oklab, ${GREEN} 35%, transparent), 0 20px 40px -25px oklch(0 0 0 / 0.6)`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>
            Dossier prêt à traiter
          </p>
          <p className="text-[11px]" style={{ color: TEXT_DIM }}>
            Fiche projet · #LM-2481
          </p>
        </div>
        <motion.span
          className="rounded-full px-2 py-1 text-[10px] font-semibold"
          style={{ backgroundColor: `color-mix(in oklab, ${ORANGE} 18%, transparent)`, color: ORANGE }}
          initial={reduce ? false : { opacity: 0 }}
          whileInView={
            reduce
              ? { opacity: 1 }
              : {
                  opacity: 1,
                  boxShadow: [
                    '0 0 0 0 transparent',
                    `0 0 14px 2px color-mix(in oklab, ${ORANGE} 55%, transparent)`,
                    '0 0 0 0 transparent',
                  ],
                }
          }
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: reduce ? 0 : 0.6 }}
        >
          Prospect chaud
        </motion.span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12px]">
        <div>
          <dt style={{ color: TEXT_DIM }}>Type de projet</dt>
          <dd style={{ color: TEXT }}>Borne de recharge</dd>
        </div>
        <div>
          <dt style={{ color: TEXT_DIM }}>Localisation</dt>
          <dd style={{ color: TEXT }}>Lyon (69003)</dd>
        </div>
        <div>
          <dt style={{ color: TEXT_DIM }}>Budget estimé</dt>
          <dd style={{ color: TEXT }}>4 500 €</dd>
        </div>
        <div>
          <dt style={{ color: TEXT_DIM }}>Urgence</dt>
          <dd style={{ color: TEXT }}>Moyenne</dd>
        </div>
        <div>
          <dt style={{ color: TEXT_DIM }}>Délai souhaité</dt>
          <dd style={{ color: TEXT }}>Sous 2 semaines</dd>
        </div>
        <div>
          <dt style={{ color: TEXT_DIM }}>Photos ajoutées</dt>
          <dd style={{ color: TEXT }}>3 photos</dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px]" style={{ color: TEXT_DIM }}>
          <span>Complétude du dossier</span>
          <span style={{ color: TEXT }}>86 %</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'oklch(1 0 0 / 0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: GREEN }}
            initial={reduce ? false : { width: '0%' }}
            whileInView={{ width: '86%' }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: reduce ? 0 : 0.5 }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
            style={{ border: `2px solid ${GREEN}`, color: GREEN }}
          >
            88
          </div>
          <div>
            <p className="text-[11px]" style={{ color: TEXT_DIM }}>
              Score commercial
            </p>
            <p className="text-[12px] font-medium" style={{ color: TEXT }}>
              88/100
            </p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors"
          style={{ border: `1px solid ${BORDER_STRONG}`, color: TEXT_MUTED }}
        >
          Voir le dossier
        </button>
      </div>

      <div
        className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 10%, transparent)` }}
      >
        <ArrowRight size={13} style={{ color: GREEN, flexShrink: 0 }} />
        <p className="text-[11px] leading-snug" style={{ color: TEXT }}>
          Action recommandée : <span style={{ color: GREEN, fontWeight: 600 }}>Rappeler aujourd&apos;hui</span>
        </p>
      </div>
    </motion.div>
  );
}

/* Thin, sober connector lines from the two assistant cards down to the
   dossier card below — no big central "K" hub (that pattern belongs to
   `LandingChaosSection.tsx`, this section is deliberately different). */
function Connectors({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="relative mx-auto hidden h-10 w-full max-w-3xl lg:block">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
        <motion.path
          d="M 25 0 C 25 20, 50 20, 50 40"
          stroke={GREEN}
          strokeWidth="0.4"
          fill="none"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px color-mix(in oklab, ${GREEN} 60%, transparent))` }}
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.7 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: reduce ? 0 : 0.25 }}
        />
        <motion.path
          d="M 75 0 C 75 20, 50 20, 50 40"
          stroke={GREEN}
          strokeWidth="0.4"
          fill="none"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px color-mix(in oklab, ${GREEN} 60%, transparent))` }}
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.7 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: reduce ? 0 : 0.35 }}
        />
      </svg>
    </div>
  );
}

/* Simple, dependency-free swipeable carousel using native CSS scroll-snap.
   Points are synced via `onScroll` so no JS carousel library is required. */
function MobileAssistantCarousel({ reduce }: { reduce: boolean }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.min(1, Math.max(0, index)));
  };

  return (
    <div className="lg:hidden">
      <p className="mb-2 text-center text-[11px]" style={{ color: TEXT_DIM }}>
        Glissez pour voir les assistants →
      </p>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="w-full shrink-0 snap-center">
          <AssistantCard reduce={reduce} kind="web" />
        </div>
        <div className="w-full shrink-0 snap-center">
          <AssistantCard reduce={reduce} kind="voice" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? 20 : 6,
              backgroundColor: i === activeIndex ? GREEN : 'oklch(1 0 0 / 0.2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AssistantCard({ reduce, kind }: { reduce: boolean; kind: 'web' | 'voice' }) {
  const label = kind === 'web' ? 'Assistant web' : 'Assistant vocal';
  const subtitle = kind === 'web' ? 'Qualification 24h/24 via chat' : 'Qualification par téléphone';
  const channel = kind === 'web' ? 'Visiteur sur votre site' : 'Appel entrant';

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: GREEN }}>
          {label}
        </p>
        <span className="text-[10px]" style={{ color: TEXT_DIM }}>
          {channel}
        </span>
      </div>
      <p className="mb-3 text-[12px]" style={{ color: TEXT_MUTED }}>
        {subtitle}
      </p>
      <div
        className="h-[360px] flex-1 overflow-hidden rounded-[18px]"
        style={{
          border: `1px solid ${BORDER}`,
          background: 'oklch(0.12 0.006 260)',
          boxShadow:
            kind === 'web'
              ? '0 0 40px rgba(34,197,94,0.08)'
              : '0 0 40px rgba(96,165,250,0.08)',
        }}
      >
        {kind === 'web' ? (
          <AssistantWebChatCard
            reduceMotion={reduce}
            messages={WEB_DEMO_MESSAGES}
            headerTitle="LM Elec ⚡"
            headerSubtitle="Visiteur sur votre site"
            collectedFields={WEB_COLLECTED_FIELDS}
          />
        ) : (
          <VoiceAssistantCard
            reduceMotion={reduce}
            messages={VOICE_DEMO_MESSAGES}
            headerTitle="LM Elec ⚡"
            headerSubtitle="Appel entrant"
            scoreLabel="Score: 88/100"
            collectedSummary="Projet, localisation, délai, photos"
          />
        )}
      </div>
    </div>
  );
}

export default function RequestTransformationSection() {
  const reduce = useStableReducedMotion();

  const fadeUp = reduce
    ? { initial: false, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.6, ease: 'easeOut' as const },
      };

  return (
    <section
      style={{ backgroundColor: DARK_BG, color: TEXT }}
      className="relative overflow-hidden py-14 sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.05) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-0 h-[380px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklab, ${GREEN} 14%, transparent), transparent 70%)`,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{
              color: GREEN,
              backgroundColor: `color-mix(in oklab, ${GREEN} 12%, transparent)`,
              border: `1px solid color-mix(in oklab, ${GREEN} 30%, transparent)`,
            }}
          >
            Demande transformée
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em] sm:text-4xl md:text-5xl">
            Chaque demande devient un{' '}
            <span style={{ color: GREEN }}>dossier clair, complet et exploitable.</span>
          </h2>
          <p className="mt-3 text-base sm:text-lg" style={{ color: TEXT_MUTED }}>
            Kadria collecte les informations essentielles par chat ou téléphone avant votre premier rappel.
          </p>
        </motion.div>

        {/* Desktop: two cards, same height, side by side */}
        <div className="mt-10 hidden items-stretch gap-6 lg:flex">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="flex-1"
          >
            <AssistantCard reduce={reduce} kind="web" />
          </motion.div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: reduce ? 0 : 0.15 }}
            className="flex-1"
          >
            <AssistantCard reduce={reduce} kind="voice" />
          </motion.div>
        </div>

        <Connectors reduce={reduce} />

        <div className="mt-6 lg:mt-2">
          <DossierCard reduce={reduce} />
        </div>

        {/* Mobile: swipeable carousel */}
        <div className="mt-8 lg:hidden">
          <MobileAssistantCarousel reduce={reduce} />
        </div>

        <div
          aria-hidden
          className="mx-auto mt-6 h-6 w-px lg:hidden"
          style={{
            background: `linear-gradient(to bottom, color-mix(in oklab, ${GREEN} 55%, transparent), color-mix(in oklab, ${GREEN} 20%, transparent))`,
          }}
        />

        {/* Benefits */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: reduce ? 0 : 0.1 * i }}
                className="rounded-xl p-5"
                style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 15%, transparent)`, color: GREEN }}
                >
                  <Icon size={15} />
                </span>
                <p className="mt-3 text-sm font-semibold" style={{ color: TEXT }}>
                  {b.title}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
                  {b.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

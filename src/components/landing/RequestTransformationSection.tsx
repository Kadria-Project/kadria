'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeftRight,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
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
   Une seule plateforme." section, only the message content differs.
   Scenario: "AD Elec ⚡" — installation d'une borne de recharge 7 kW. */
const WEB_DEMO_MESSAGES: ChatMsg[] = [
  { role: 'user', text: 'Bonjour, je souhaite installer une borne de recharge pour ma voiture électrique.', delay: 0 },
  {
    role: 'assistant',
    text: 'Parfait ! Pour bien préparer votre projet, quelle puissance de borne envisagez-vous ?',
    delay: 2200,
  },
  { role: 'user', text: '7 kW.', delay: 4600 },
  {
    role: 'assistant',
    text: 'Merci ! Quel budget avez-vous prévu pour cette installation ?',
    delay: 6800,
  },
  { role: 'user', text: 'Entre 1 000 et 1 500 €.', delay: 9200 },
  {
    role: 'assistant',
    text: 'Très bien. Quel est votre délai souhaité pour les travaux ?',
    delay: 11400,
  },
  { role: 'user', text: 'Dès que possible.', delay: 13800 },
  {
    role: 'assistant',
    text: "Parfait, votre projet semble prêt à démarrer. Quelle est l'adresse du chantier ?",
    delay: 16000,
  },
  { role: 'user', text: '24 Rue de la Mairie, 76520 Saint-Aubin-Celloville', delay: 18600 },
  {
    role: 'assistant',
    text: 'Pour finaliser votre dossier, renseignez vos coordonnées ci-dessous.',
    delay: 20800,
  },
  {
    role: 'user',
    text: 'Jean Dupont, 06 21 45 77 XX, jean@emailkadria.fr',
    delay: 23400,
    isContactCard: true,
    contactName: 'Jean Dupont',
    contactPhone: '06 21 45 77 XX',
    contactEmail: 'jean@emailkadria.fr',
  },
];

const WEB_COLLECTED_FIELDS = [
  { label: 'Projet', value: 'Borne de recharge 7 kW' },
  { label: 'Budget', value: '1 000 à 1 500 €' },
  { label: 'Délai', value: 'Dès que possible' },
  { label: 'Maturité', value: 'Prêt à démarrer' },
  { label: 'Contact', value: 'Collecté' },
];

const VOICE_DEMO_MESSAGES: { role: 'client' | 'kadria'; text: string; delay: number }[] = [
  { role: 'kadria', text: "Bonjour, je suis l'assistant de Kadria. Pour quel type de projet puis-je vous aider ?", delay: 0 },
  { role: 'client', text: 'Bonjour, je souhaite faire installer une borne de recharge 7 kW dans ma maison individuelle.', delay: 2600 },
  {
    role: 'kadria',
    text: 'Très bien. Sous quel délai souhaitez-vous réaliser les travaux ?',
    delay: 5200,
  },
  { role: 'client', text: "D'ici trois semaines si possible.", delay: 7800 },
  {
    role: 'kadria',
    text: 'Parfait. Avez-vous une idée de votre budget pour cette installation ?',
    delay: 10200,
  },
  { role: 'client', text: 'Entre 1 500 et 2 000 euros.', delay: 12800 },
  {
    role: 'kadria',
    text: 'Merci, votre dossier est créé automatiquement et transmis à un artisan qualifié.',
    delay: 15200,
  },
];

const BENEFITS = [
  {
    icon: ListChecks,
    title: 'Informations essentielles collectées',
    body: 'Budget, urgence, localisation, contact et besoin sont structurés avant votre premier rappel.',
  },
  {
    icon: ClipboardCheck,
    title: 'Dossier exploitable immédiatement',
    body: 'Vous voyez le contexte, la priorité, le score et l\'action à mener sans ressaisie.',
  },
  {
    icon: Bell,
    title: 'Artisan notifié instantanément',
    body: 'Une nouvelle opportunité qualifiée est signalée dès que le dossier est prêt.',
  },
  {
    icon: UserCheck,
    title: 'Portail client activé',
    body: 'Le client peut compléter ou suivre sa demande depuis son espace projet.',
  },
];

const PIPELINE_STEPS = [
  { label: 'Reçu', done: true },
  { label: 'Qualifié', done: true },
  { label: 'Préparé', done: false },
  { label: 'Rendez-vous', done: false },
  { label: 'Décision', done: false },
];

const PROJECT_FIELDS = [
  { label: 'Type', value: 'Borne de recharge 7 kW' },
  { label: 'Adresse', value: '24 Rue de la Mairie, 76520' },
  { label: 'Budget', value: '1 000 à 1 500 €' },
  { label: 'Délai', value: 'Dès que possible' },
];

const ANALYSIS_COLUMNS: { heading: string; tone: 'good' | 'warn' | 'neutral'; items: string[] }[] = [
  {
    heading: 'Forces',
    tone: 'good',
    items: ['Besoin clair', 'Budget renseigné', 'Prêt à démarrer'],
  },
  {
    heading: 'Infos manquantes',
    tone: 'warn',
    items: ['Photos du tableau électrique'],
  },
  {
    heading: 'Risques',
    tone: 'neutral',
    items: ['Aucun risque identifié'],
  },
];

function DossierBadge({
  children,
  tone,
  reduce,
  delay,
}: {
  children: React.ReactNode;
  tone: 'orange' | 'green' | 'muted';
  reduce: boolean;
  delay: number;
}) {
  const colors =
    tone === 'orange'
      ? { bg: `color-mix(in oklab, ${ORANGE} 18%, transparent)`, fg: ORANGE }
      : tone === 'green'
        ? { bg: `color-mix(in oklab, ${GREEN} 16%, transparent)`, fg: GREEN }
        : { bg: 'oklch(1 0 0 / 0.06)', fg: TEXT_MUTED };
  return (
    <motion.span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : delay }}
    >
      {children}
    </motion.span>
  );
}

function DossierCard({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: 'easeOut', delay: reduce ? 0 : 0.3 }}
      className="relative mx-auto w-full overflow-hidden rounded-2xl p-5 backdrop-blur-md sm:p-6 lg:w-[75%] lg:p-6"
      style={{
        backgroundColor: `color-mix(in oklab, ${CARD_BG} 88%, transparent)`,
        border: `1px solid color-mix(in oklab, ${GREEN} 32%, transparent)`,
        boxShadow: `0 0 0 1px color-mix(in oklab, ${GREEN} 10%, transparent), 0 0 90px -20px color-mix(in oklab, ${GREEN} 40%, transparent), 0 30px 60px -30px oklch(0 0 0 / 0.65)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${GREEN} 20%, transparent), transparent 70%)` }}
      />

      {/* A. Header dossier */}
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold sm:text-base" style={{ color: TEXT }}>
            Installation d&apos;une borne de recharge 7 kW
          </p>
          <p className="mt-0.5 text-[11.5px]" style={{ color: TEXT_DIM }}>
            Jean Dupont · électricité · Saint-Aubin-Celloville · Widget Kadria
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DossierBadge tone="orange" reduce={reduce} delay={0.4}>
            À traiter
          </DossierBadge>
          <DossierBadge tone="green" reduce={reduce} delay={0.48}>
            Score 88/100
          </DossierBadge>
          <DossierBadge tone="orange" reduce={reduce} delay={0.56}>
            Chaud
          </DossierBadge>
        </div>
      </div>

      {/* 3 chips */}
      <div className="relative mt-3 flex flex-wrap gap-2">
        <DossierBadge tone="muted" reduce={reduce} delay={0.62}>
          Budget 1 000 à 1 500 €
        </DossierBadge>
        <DossierBadge tone="muted" reduce={reduce} delay={0.68}>
          Délai dès que possible
        </DossierBadge>
        <DossierBadge tone="muted" reduce={reduce} delay={0.74}>
          Source Widget Kadria
        </DossierBadge>
      </div>

      {/* B. Contact / localisation */}
      <div
        className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl px-3.5 py-2.5 text-[11.5px]"
        style={{ backgroundColor: 'oklch(1 0 0 / 0.03)', border: `1px solid ${BORDER}`, color: TEXT_MUTED }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Phone size={12} style={{ color: GREEN }} /> 06 21 45 77 XX
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Mail size={12} style={{ color: GREEN }} /> jean@emailkadria.fr
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={12} style={{ color: GREEN }} /> 24 Rue de la Mairie, 76520
        </span>
      </div>

      {/* C. Pilotage commercial — 3 colonnes horizontales */}
      <div className="relative mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: GREEN }}>
          Pilotage commercial
        </p>
        <div className="mt-2.5 grid gap-3 lg:grid-cols-3">
          {/* Projet */}
          <div className="rounded-xl p-3.5" style={{ backgroundColor: 'oklch(1 0 0 / 0.03)', border: `1px solid ${BORDER}` }}>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
              Projet
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {PROJECT_FIELDS.map((f) => (
                <div key={f.label}>
                  <dt className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                    {f.label}
                  </dt>
                  <dd className="text-[11.5px] font-medium" style={{ color: TEXT }}>
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Action recommandée */}
          <div className="rounded-xl p-3.5" style={{ backgroundColor: 'oklch(1 0 0 / 0.03)', border: `1px solid ${BORDER}` }}>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
              Action recommandée
            </p>
            <p className="mt-1.5 text-[13px] font-semibold" style={{ color: TEXT }}>
              Planifier un rendez-vous
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
              Le dossier est qualifié et prêt à être traité.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <DossierBadge tone="muted" reduce={reduce} delay={0.8}>
                Priorité élevée
              </DossierBadge>
              <DossierBadge tone="muted" reduce={reduce} delay={0.85}>
                Impact commercial
              </DossierBadge>
              <DossierBadge tone="muted" reduce={reduce} delay={0.9}>
                ~5 min
              </DossierBadge>
            </div>
            <button
              type="button"
              className="mt-3 rounded-md px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors"
              style={{
                backgroundColor: `color-mix(in oklab, ${GREEN} 14%, transparent)`,
                color: GREEN,
                border: `1px solid color-mix(in oklab, ${GREEN} 40%, transparent)`,
              }}
            >
              Planifier
            </button>
          </div>

          {/* Avancement commercial — timeline compacte 5 étapes */}
          <div className="rounded-xl p-3.5" style={{ backgroundColor: 'oklch(1 0 0 / 0.03)', border: `1px solid ${BORDER}` }}>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
              Avancement
            </p>
            <div className="mt-2.5 flex items-start justify-between gap-1">
              {PIPELINE_STEPS.map((step, i) => (
                <motion.div
                  key={step.label}
                  className="flex flex-1 flex-col items-center gap-1 text-center"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: reduce ? 0 : 0.5 + i * 0.09 }}
                >
                  <span
                    className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: step.done
                        ? `color-mix(in oklab, ${GREEN} 22%, transparent)`
                        : 'oklch(1 0 0 / 0.06)',
                      border: step.done ? `1px solid ${GREEN}` : `1px solid ${BORDER}`,
                    }}
                  >
                    {step.done && <Check size={10} style={{ color: GREEN }} />}
                  </span>
                  <span
                    className="text-[10px] leading-tight"
                    style={{ color: step.done ? TEXT : TEXT_DIM, fontWeight: step.done ? 600 : 400 }}
                  >
                    {step.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* D. Analyse Kadria */}
      <motion.div
        className="relative mt-4"
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: reduce ? 0 : 0.65 }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: GREEN }}>
          Analyse Kadria
        </p>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
          {ANALYSIS_COLUMNS.map((col) => (
            <div
              key={col.heading}
              className="rounded-xl p-3"
              style={{ backgroundColor: 'oklch(1 0 0 / 0.03)', border: `1px solid ${BORDER}` }}
            >
              <p className="text-[11px] font-semibold" style={{ color: TEXT_DIM }}>
                {col.heading}
              </p>
              <ul className="mt-1.5 space-y-1">
                {col.items.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-[11px]" style={{ color: TEXT_MUTED }}>
                    {col.tone === 'good' ? (
                      <CheckCircle2 size={12} style={{ color: GREEN, flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <ShieldCheck size={12} style={{ color: col.tone === 'warn' ? ORANGE : TEXT_DIM, flexShrink: 0, marginTop: 1 }} />
                    )}
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.div>

      {/* E. Synthèse finale */}
      <div
        className="relative mt-4 rounded-xl px-3.5 py-2.5 text-[11.5px] leading-relaxed"
        style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 8%, transparent)`, border: `1px solid color-mix(in oklab, ${GREEN} 22%, transparent)`, color: TEXT }}
      >
        Projet de borne de recharge 7 kW qualifié : budget, adresse et délai déjà collectés. Rendez-vous à planifier rapidement.
      </div>

      {/* F. CTA final */}
      <div className="relative mt-4 flex justify-end">
        <button
          type="button"
          className="shrink-0 rounded-md px-4 py-2 text-[12px] font-semibold transition-colors"
          style={{ backgroundColor: GREEN, color: DARK_BG }}
        >
          Voir le dossier
        </button>
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
          d="M 25 0 C 25 20, 34 20, 34 40"
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
          d="M 75 0 C 75 20, 66 20, 66 40"
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
      <div className="mb-3 flex justify-center">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold backdrop-blur-md"
          style={{
            color: TEXT,
            backgroundColor: `color-mix(in oklab, ${DARK_BG} 78%, transparent)`,
            border: `1px solid color-mix(in oklab, ${GREEN} 45%, transparent)`,
            boxShadow: `0 0 0 1px color-mix(in oklab, ${GREEN} 12%, transparent), 0 4px 16px -6px color-mix(in oklab, ${GREEN} 45%, transparent)`,
          }}
        >
          <ArrowLeftRight size={13} style={{ color: GREEN, flexShrink: 0 }} />
          Glissez pour comparer les deux assistants
        </span>
      </div>
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

/* Fixed height shared by both assistant cards — must stay strictly
   identical between web and voice, and must never change while the
   message animation plays (the translateY scroll mechanism keeps this
   container's height constant). */
const ASSISTANT_CARD_HEIGHT = 400;

function AssistantCard({ reduce, kind }: { reduce: boolean; kind: 'web' | 'voice' }) {
  const label = kind === 'web' ? 'ASSISTANT WEB' : 'ASSISTANT VOCAL';
  const subtitle = kind === 'web' ? 'Qualification 24h/24 via chat' : 'Qualification par téléphone';
  const channel = kind === 'web' ? 'Widget Kadria' : 'Appel entrant';

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
        className="max-h-[400px] min-h-0 flex-shrink-0 overflow-hidden rounded-[18px]"
        style={{
          height: ASSISTANT_CARD_HEIGHT,
          maxHeight: ASSISTANT_CARD_HEIGHT,
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
            headerTitle="AD Elec ⚡"
            headerSubtitle="Réponse en 3 min"
            collectedFields={WEB_COLLECTED_FIELDS}
            scrollMode="translate"
          />
        ) : (
          <VoiceAssistantCard
            reduceMotion={reduce}
            messages={VOICE_DEMO_MESSAGES}
            headerTitle="AD Elec ⚡"
            headerSubtitle="Appel entrant"
            scoreLabel="Score: 88/100"
            collectedSummary="Projet: Borne de recharge 7 kW · Lieu: Maison individuelle · Délai: D'ici 3 semaines · Budget: 1 500 à 2 000 €"
            scrollMode="translate"
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

        {/* Desktop-only dossier placement, directly under the two side-by-side
           assistant cards + connector lines above. Mobile has its own dossier
           instance below the carousel (see order-preserving mobile block
           further down) so it never renders above the assistants on mobile. */}
        <div className="hidden lg:mt-2 lg:block">
          <DossierCard reduce={reduce} />
        </div>

        {/* Mobile: swipeable carousel, then connector, then dossier — in that
           exact DOM order, so the project sheet always appears below the
           assistants on mobile (never above). */}
        <div className="mt-8 lg:hidden">
          <MobileAssistantCarousel reduce={reduce} />
          <div
            aria-hidden
            className="mx-auto mt-6 h-6 w-px"
            style={{
              background: `linear-gradient(to bottom, color-mix(in oklab, ${GREEN} 55%, transparent), color-mix(in oklab, ${GREEN} 20%, transparent))`,
            }}
          />
          <div className="mt-6">
            <DossierCard reduce={reduce} />
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

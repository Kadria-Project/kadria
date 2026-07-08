'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion, useInView } from 'motion/react';
import { useRef } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Flame,
  Gauge,
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Stable reduced-motion preference — same hydration-safe pattern used in
   RequestTransformationSection.tsx / LandingHero.tsx. `useReducedMotion()`
   returns `null` on the server and the real value synchronously on the
   client's first render, which breaks hydration matching. Gate behind a
   mounted flag so SSR and pre-hydration client render agree (false).
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
const CARD_BG_2 = 'oklch(0.245 0.008 260)';
const ROW = 'oklch(0.235 0.008 260)';
const BORDER = 'oklch(1 0 0 / 0.09)';
const BORDER_STRONG = 'oklch(1 0 0 / 0.16)';
const TEXT = 'oklch(0.96 0.005 90)';
const TEXT_MUTED = 'oklch(0.7 0.01 260)';
const TEXT_DIM = 'oklch(0.55 0.01 260)';
const ORANGE = 'oklch(0.82 0.16 65)';
const RED = 'oklch(0.72 0.19 25)';
const BLUE = 'oklch(0.78 0.14 235)';
const LIME = 'oklch(0.84 0.18 125)';

/* Score → color mapping used across the section (circles, bar values,
   progress bars): >=80 green, 71–79 lime, 56–70 orange, <=55 orange/red. */
function getScoreColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 71) return LIME;
  if (score > 55) return ORANGE;
  return RED;
}

type Tone = 'hot' | 'blue' | 'warn' | 'muted' | 'red';

const TONE_COLORS: Record<Tone, string> = {
  hot: ORANGE,
  blue: BLUE,
  warn: ORANGE,
  muted: TEXT_DIM,
  red: RED,
};

type Dossier = {
  title: string;
  contact: string;
  score: number;
  badge: string;
  tone: Tone;
  chips: string[];
};

const DOSSIERS: Dossier[] = [
  {
    title: 'Installation borne de recharge',
    contact: 'Jean Dupont · Saint-Aubin-Celloville',
    score: 88,
    badge: 'Chaud',
    tone: 'hot',
    chips: ['Budget 1 000 – 1 500 €', 'Délai dès que possible'],
  },
  {
    title: 'Rénovation salle de bain',
    contact: 'Marie Martin · Rouen',
    score: 82,
    badge: 'À chiffrer',
    tone: 'blue',
    chips: ['Budget 5 000 – 8 000 €', 'Photos ajoutées'],
  },
  {
    title: 'Dépannage tableau électrique',
    contact: 'Pierre Durand · Déville-lès-Rouen',
    score: 76,
    badge: 'À rappeler',
    tone: 'warn',
    chips: ['Urgent', 'Budget renseigné'],
  },
  {
    title: 'Extension maison',
    contact: 'Sophie Leroy · Mont-Saint-Aignan',
    score: 64,
    badge: 'À qualifier',
    tone: 'muted',
    chips: ['Budget non renseigné', 'À qualifier'],
  },
  {
    title: 'Remplacement chauffe-eau',
    contact: 'Lucas Bernard · Bois-Guillaume',
    score: 52,
    badge: 'En retard',
    tone: 'red',
    chips: ['Budget non renseigné', 'Relance en retard'],
  },
];

const WHY_ITEMS = [
  'Projet clair et bien défini',
  'Budget renseigné',
  'Client prêt à démarrer',
  'Délai court',
  'Coordonnées complètes',
  'Aucune relance en cours',
];

const ANALYSIS_CRITERIA = [
  { label: 'Complétude du dossier', score: 92, desc: 'Informations collectées et cohérence' },
  { label: 'Budget déclaré', score: 85, desc: 'Montant renseigné et réaliste' },
  { label: 'Urgence / Délai', score: 80, desc: 'Délai souhaité par le client' },
  { label: 'Maturité du client', score: 90, desc: 'Prêt à démarrer ou en réflexion' },
  { label: 'Statut commercial', score: 75, desc: 'Étape actuelle dans le cycle' },
  { label: 'Relance à effectuer', score: 70, desc: 'Dernière interaction / relance' },
  { label: 'Proximité', score: 65, desc: "Zone d'intervention" },
];

/* Subtle per-avatar gradient rotation so the 5 client rows read as
   distinct people at a glance without pulling in external images. */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, oklch(0.72 0.17 145), oklch(0.5 0.14 165))',
  'linear-gradient(135deg, oklch(0.72 0.14 235), oklch(0.5 0.13 255))',
  'linear-gradient(135deg, oklch(0.8 0.15 65), oklch(0.58 0.15 45))',
  'linear-gradient(135deg, oklch(0.75 0.12 300), oklch(0.5 0.13 280))',
  'linear-gradient(135deg, oklch(0.72 0.17 25), oklch(0.5 0.15 10))',
];

/* Simple geometric "persona" avatar: colored circle + inline SVG
   silhouette (head/shoulders + a hair variant). No external images,
   no photos — just enough shape variation to read as distinct people. */
function PersonaAvatar({ contact, index, size = 32 }: { contact: string; index: number; size?: number }) {
  const hairVariant = index % 3;
  return (
    <span
      className="relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
        boxShadow: '0 0 0 1px oklch(1 0 0 / 0.14)',
      }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width="88%" height="88%">
        <path
          d="M4.5 22 C4.5 16 7.8 13 12 13 C16.2 13 19.5 16 19.5 22 Z"
          fill="oklch(1 0 0 / 0.9)"
        />
        <circle cx="12" cy="9.2" r="4.3" fill="oklch(1 0 0 / 0.9)" />
        {hairVariant === 0 && (
          <path
            d="M7.7 8.4 C7.7 4.6 9.9 3 12 3 C14.1 3 16.3 4.6 16.3 8.4 C16.3 6.4 14.4 5.3 12 5.3 C9.6 5.3 7.7 6.4 7.7 8.4 Z"
            fill="oklch(0.22 0.01 260 / 0.55)"
          />
        )}
        {hairVariant === 1 && (
          <path
            d="M7.6 8.8 C7.2 4.9 9.6 2.8 12 2.8 C14.6 2.8 16.9 5 16.4 9 C15.7 6.8 14 6.2 12 6.6 C10.2 7 8.3 7.2 7.6 8.8 Z"
            fill="oklch(0.22 0.01 260 / 0.55)"
          />
        )}
        {hairVariant === 2 && (
          <path
            d="M7.7 7.8 C8 4.4 10 3 12 3 C14.3 3 16.4 4.9 16.2 8.6 C15.5 7.3 13.8 6.5 12 6.5 C10.4 6.5 8.6 6.9 7.7 7.8 Z"
            fill="oklch(0.22 0.01 260 / 0.55)"
          />
        )}
      </svg>
    </span>
  );
}

const BENEFITS = [
  { icon: Clock, title: 'Gagnez du temps', body: 'Concentrez-vous sur les dossiers qui ont le plus de chances d’aboutir.' },
  { icon: TrendingUp, title: 'Augmentez votre taux de transformation', body: 'Traitez les bons projets au bon moment.' },
  { icon: Zap, title: 'Ne laissez rien passer', body: 'Kadria vous alerte sur les relances et les opportunités chaudes.' },
  { icon: Gauge, title: 'Pilotez votre activité', body: 'Suivez vos performances et votre pipeline en temps réel.' },
];

function ScoreCircle({
  value,
  size = 40,
  strokeWidth = 4,
  reduce,
  delay = 0,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  reduce: boolean;
  delay?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    let raf: number;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, value]);

  const progress = reduce ? value : display;
  const color = getScoreColor(value);

  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={BORDER} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress / 100) }}
          transition={{ duration: reduce ? 0 : 0.9, ease: 'easeOut', delay: reduce ? 0 : delay }}
        />
      </svg>
      <span className="absolute text-[11px] font-bold" style={{ color }}>
        {display}
      </span>
    </span>
  );
}

function AnalysisBar({ label, desc, score, reduce, delay }: { label: string; desc: string; score: number; reduce: boolean; delay: number }) {
  const color = getScoreColor(score);
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: 12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: reduce ? 0 : delay }}
    >
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium" style={{ color: TEXT }}>
          {label}
        </span>
        <span className="font-semibold" style={{ color }}>
          {score}
          <span style={{ color: TEXT_DIM }}>/100</span>
        </span>
      </div>
      <p className="mt-0.5 text-[10.5px]" style={{ color: TEXT_DIM }}>
        {desc}
      </p>
      <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'oklch(1 0 0 / 0.12)' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${score}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px -1px color-mix(in oklab, ${color} 70%, transparent)`,
          }}
        />
      </div>
    </motion.div>
  );
}

function DossierRow({ dossier, index, selected, reduce }: { dossier: Dossier; index: number; selected: boolean; reduce: boolean }) {
  const tone = TONE_COLORS[dossier.tone];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : 0.08 * index }}
      className="relative rounded-xl p-3"
      style={{
        backgroundColor: selected ? `color-mix(in oklab, ${GREEN} 9%, transparent)` : ROW,
        border: selected ? `1px solid color-mix(in oklab, ${GREEN} 45%, transparent)` : `1px solid ${BORDER}`,
        boxShadow: selected ? `0 0 0 1px color-mix(in oklab, ${GREEN} 12%, transparent), 0 0 24px -6px color-mix(in oklab, ${GREEN} 55%, transparent)` : undefined,
      }}
    >
      {selected && (
        <span
          className="absolute -top-2 left-3 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
          style={{ color: DARK_BG, backgroundColor: GREEN }}
        >
          Priorité détectée
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <PersonaAvatar contact={dossier.contact} index={index} />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold" style={{ color: TEXT }}>
              {dossier.title}
            </p>
            <p className="truncate text-[11px]" style={{ color: TEXT_MUTED }}>
              {dossier.contact}
            </p>
          </div>
        </div>
        <ScoreCircle value={dossier.score} size={34} strokeWidth={3.5} reduce={reduce} delay={0.1 * index} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ color: tone, backgroundColor: `color-mix(in oklab, ${tone} 16%, transparent)`, border: `1px solid color-mix(in oklab, ${tone} 35%, transparent)` }}
        >
          {dossier.tone === 'hot' && <Flame size={9} />}
          {dossier.badge}
        </span>
        {dossier.chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ color: TEXT_MUTED, backgroundColor: 'oklch(1 0 0 / 0.05)', border: `1px solid ${BORDER}` }}
          >
            {chip}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function PriorityCard({ reduce }: { reduce: boolean }) {
  const top = DOSSIERS[0];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: reduce ? 0 : 0.15 }}
      className="relative flex h-full flex-col overflow-hidden rounded-2xl p-4 backdrop-blur-md sm:p-5 lg:justify-center"
      style={{
        backgroundColor: `color-mix(in oklab, ${CARD_BG} 90%, transparent)`,
        border: `1px solid color-mix(in oklab, ${GREEN} 42%, transparent)`,
        boxShadow: `0 0 0 1px color-mix(in oklab, ${GREEN} 12%, transparent), 0 0 100px -18px color-mix(in oklab, ${GREEN} 55%, transparent), 0 30px 60px -30px oklch(0 0 0 / 0.7)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${GREEN} 24%, transparent), transparent 70%)` }}
      />

      <div className="relative flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide"
          style={{ color: GREEN, backgroundColor: `color-mix(in oklab, ${GREEN} 16%, transparent)`, border: `1px solid color-mix(in oklab, ${GREEN} 40%, transparent)` }}
        >
          À traiter maintenant
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
          style={{ color: ORANGE, backgroundColor: `color-mix(in oklab, ${ORANGE} 16%, transparent)`, border: `1px solid color-mix(in oklab, ${ORANGE} 35%, transparent)` }}
        >
          🔥 Priorité haute
        </span>
      </div>

      <p className="relative mt-4 text-sm font-semibold uppercase tracking-widest" style={{ color: GREEN }}>
        Votre priorité du jour
      </p>

      <div className="relative mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold sm:text-lg" style={{ color: TEXT }}>
            {top.title}
          </p>
          <p className="mt-0.5 text-[12.5px]" style={{ color: TEXT_MUTED }}>
            {top.contact}
          </p>
        </div>
        <div className="relative flex flex-shrink-0 items-center justify-center">
          <ScoreCircle value={top.score} size={64} strokeWidth={6} reduce={reduce} delay={0.25} />
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { icon: TrendingUp, label: 'Budget', value: '1 000 à 1 500 €' },
          { icon: Clock, label: 'Délai', value: 'Dès que possible' },
          { icon: Target, label: 'Maturité', value: 'Prêt à démarrer' },
          { icon: Sparkles, label: 'Source', value: 'Widget Kadria' },
        ].map((info) => {
          const Icon = info.icon;
          return (
            <div key={info.label} className="rounded-lg p-2.5" style={{ backgroundColor: 'oklch(1 0 0 / 0.03)', border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                <Icon size={11} style={{ color: GREEN }} />
                {info.label}
              </div>
              <p className="mt-1 text-[11.5px] font-medium" style={{ color: TEXT }}>
                {info.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="relative mt-4 rounded-xl p-3.5" style={{ backgroundColor: 'oklch(1 0 0 / 0.03)', border: `1px solid ${BORDER}` }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: GREEN }}>
          Pourquoi ce dossier remonte
        </p>
        <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {WHY_ITEMS.map((item, i) => (
            <motion.li
              key={item}
              className="flex items-start gap-1.5 text-[11.5px]"
              style={{ color: TEXT_MUTED }}
              initial={reduce ? false : { opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: reduce ? 0 : 0.4 + i * 0.07 }}
            >
              <Check size={12} style={{ color: GREEN, flexShrink: 0, marginTop: 2 }} />
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 sm:w-auto"
        style={{ backgroundColor: GREEN, color: DARK_BG, boxShadow: `0 6px 22px -8px color-mix(in oklab, ${GREEN} 45%, transparent)` }}
      >
        Planifier un rendez-vous <ArrowRight size={15} />
      </button>
    </motion.div>
  );
}

function QualifiedListCard({ reduce, dossiers }: { reduce: boolean; dossiers: Dossier[] }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="flex flex-col rounded-2xl p-4 sm:p-5 lg:h-full"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: TEXT }}>
            Vos dossiers qualifiés
          </p>
          <span
            className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
            style={{ color: GREEN, backgroundColor: `color-mix(in oklab, ${GREEN} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${GREEN} 30%, transparent)` }}
          >
            24
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
          style={{ color: TEXT_MUTED, backgroundColor: CARD_BG_2, border: `1px solid ${BORDER}` }}
        >
          Trier par priorité <ChevronDown size={12} />
        </span>
      </div>

      <div className="relative mt-3 flex flex-1 flex-col justify-between gap-2">
        {dossiers.map((d, i) => (
          <DossierRow key={d.title} dossier={d} index={i} selected={i === 0} reduce={reduce} />
        ))}
      </div>

      <button type="button" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: GREEN }}>
        Voir tous les dossiers <ArrowRight size={12} />
      </button>
    </motion.div>
  );
}

function AnalysisCard({ reduce, criteria }: { reduce: boolean; criteria: typeof ANALYSIS_CRITERIA }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: 'easeOut', delay: reduce ? 0 : 0.15 }}
      className="flex flex-col rounded-2xl p-4 sm:p-5 lg:h-full"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <p className="text-sm font-semibold" style={{ color: TEXT }}>
        Ce que Kadria analyse
      </p>
      <div className="mt-3 flex flex-1 flex-col justify-between gap-3.5">
        {criteria.map((c, i) => (
          <AnalysisBar key={c.label} label={c.label} desc={c.desc} score={c.score} reduce={reduce} delay={0.06 * i} />
        ))}
      </div>
      <div className="mt-4 rounded-xl p-3" style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 8%, transparent)`, border: `1px solid color-mix(in oklab, ${GREEN} 22%, transparent)` }}>
        <p className="text-[12px] font-semibold" style={{ color: TEXT }}>
          Score global calculé en temps réel
        </p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_MUTED }}>
          Plus le score est élevé, plus le potentiel de conversion est fort.
        </p>
      </div>
    </motion.div>
  );
}

/* Two connectors that narrate the flow "liste qualifiée → priorité du
   jour → critères analysés". Each connector occupies its own dedicated
   grid-column gutter track (never overlaps a card, never crosses into
   the central card's content) and is vertically centered on the row via
   `items-stretch` + flex centering, so its position is robust to layout
   changes rather than relying on percentage-based absolute offsets. */
function FlowConnector({ reduce, delay }: { reduce: boolean; delay: number }) {
  return (
    <div aria-hidden className="pointer-events-none relative hidden h-full lg:flex lg:items-center lg:justify-center">
      <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none" className="overflow-visible">
        <motion.path
          d="M 2 14 L 84 14"
          stroke={GREEN}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 6px color-mix(in oklab, ${GREEN} 85%, transparent)) drop-shadow(0 0 2px ${GREEN})` }}
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: reduce ? 0 : delay }}
        />
        <motion.path
          d="M 76 6 L 92 14 L 76 22"
          stroke={GREEN}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 4px color-mix(in oklab, ${GREEN} 80%, transparent))` }}
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : delay + 0.5 }}
        />
      </svg>
    </div>
  );
}

/* Discrete vertical connector shown only on mobile/tablet between the
   stacked cards, to narrate the flow the way `FlowConnector` does
   horizontally on desktop. Small trait + glowing dot + chevron, no SVG
   path-drawing — a simple fade/scale is enough and respects reduced
   motion. */
function VerticalFlowConnector({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none flex items-center justify-center py-1 lg:hidden"
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span
          className="h-6 w-[2px] rounded-full"
          style={{
            background: `linear-gradient(to bottom, transparent, ${GREEN})`,
            boxShadow: `0 0 8px color-mix(in oklab, ${GREEN} 70%, transparent)`,
          }}
        />
        <ChevronDown size={13} style={{ color: GREEN, filter: `drop-shadow(0 0 4px color-mix(in oklab, ${GREEN} 70%, transparent))` }} />
      </div>
    </motion.div>
  );
}

export default function PriorityProspectsSection() {
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
    <section style={{ backgroundColor: DARK_BG, color: TEXT }} className="relative overflow-hidden pb-14 pt-20 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.05) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-0 -z-0 h-[380px] w-[600px] -translate-y-1/3 rounded-full blur-3xl"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${GREEN} 15%, transparent), transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-1/4 bottom-0 -z-0 h-[380px] w-[600px] translate-y-1/3 rounded-full blur-3xl"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${GREEN} 12%, transparent), transparent 70%)` }}
      />

      <div className="relative mx-auto max-w-[1760px] px-6 lg:px-10">
        {/* Header */}
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{ color: GREEN, backgroundColor: `color-mix(in oklab, ${GREEN} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${GREEN} 30%, transparent)` }}
          >
            Priorisez les bons prospects
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em] sm:text-4xl md:text-5xl">
            Tous les prospects ne se valent pas.
            <br />
            <span style={{ color: GREEN }}>Kadria vous montre où agir.</span>
          </h2>
          <p className="mt-3 text-base sm:text-lg" style={{ color: TEXT_MUTED }}>
            Budget, urgence, délai, maturité, complétude et relances&nbsp;: Kadria fait remonter les dossiers qui
            peuvent vraiment devenir des chantiers.
          </p>
        </motion.div>

        {/* Desktop: 3 card columns separated by two dedicated connector-gutter
            columns, stretched to equal height. The gutter tracks give the
            flow arrows a clear lane that never overlaps a card. */}
        <div className="relative mt-10 hidden lg:grid lg:grid-cols-[34fr_72px_30fr_72px_34fr] lg:items-stretch lg:gap-0">
          <div className="lg:h-full">
            <QualifiedListCard reduce={reduce} dossiers={DOSSIERS} />
          </div>
          <FlowConnector reduce={reduce} delay={0.35} />
          <div className="lg:h-full">
            <PriorityCard reduce={reduce} />
          </div>
          <FlowConnector reduce={reduce} delay={0.55} />
          <div className="lg:h-full">
            <AnalysisCard reduce={reduce} criteria={ANALYSIS_CRITERIA} />
          </div>
        </div>

        {/* Mobile: priority card first, then compact list, then analysis,
            each separated by a short vertical connector that narrates the
            flow (mirrors the desktop FlowConnector, but vertical). */}
        <div className="mt-10 flex flex-col gap-8 lg:hidden">
          <PriorityCard reduce={reduce} />
          <VerticalFlowConnector reduce={reduce} />
          <QualifiedListCard reduce={reduce} dossiers={DOSSIERS.slice(0, 3)} />
          <VerticalFlowConnector reduce={reduce} />
          <AnalysisCard reduce={reduce} criteria={ANALYSIS_CRITERIA.slice(0, 5)} />
        </div>

        {/* Benefits */}
        <VerticalFlowConnector reduce={reduce} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:mt-12 lg:gap-4 lg:grid-cols-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: reduce ? 0 : 0.1 * i }}
                className="rounded-xl p-3.5 sm:p-4 lg:p-5"
                style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg lg:h-8 lg:w-8"
                  style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 15%, transparent)`, color: GREEN }}
                >
                  <Icon size={14} className="lg:hidden" />
                  <Icon size={15} className="hidden lg:block" />
                </span>
                <p className="mt-2 text-sm font-semibold lg:mt-3" style={{ color: TEXT }}>
                  {b.title}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed lg:mt-1.5" style={{ color: TEXT_MUTED }}>
                  {b.body}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: reduce ? 0 : 0.3 }}
          className="mx-auto mt-8 max-w-2xl text-center text-sm"
          style={{ color: 'oklch(1 0 0 / 0.58)' }}
        >
          Kadria analyse, score et priorise pour que vous puissiez agir là où ça compte vraiment.
        </motion.p>
      </div>
    </section>
  );
}

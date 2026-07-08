'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useInView } from 'motion/react';
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Euro,
  FileText,
  MessageSquare,
  Phone,
  Send,
  Settings2,
  Sparkles,
} from 'lucide-react';

/* ---------------------------------------------------------------------- */
/* Design tokens (mirrored from PriorityProspectsSection for consistency) */
/* ---------------------------------------------------------------------- */

const GREEN = 'oklch(0.86 0.19 145)';
const DARK_BG = 'oklch(0.16 0.008 260)';
const CARD_BG = 'oklch(0.215 0.008 260)';
const CARD_BG_2 = 'oklch(0.245 0.008 260)';
const BORDER = 'oklch(1 0 0 / 0.09)';
const TEXT = 'oklch(0.96 0.005 90)';
const TEXT_MUTED = 'oklch(0.7 0.01 260)';
const TEXT_DIM = 'oklch(0.55 0.01 260)';
const ORANGE = 'oklch(0.82 0.16 65)';

/* ---------------------------------------------------------------------- */
/* Hooks                                                                   */
/* ---------------------------------------------------------------------- */

function useStableReducedMotion() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? Boolean(prefersReduced) : false;
}

/* ---------------------------------------------------------------------- */
/* Connectors                                                              */
/* ---------------------------------------------------------------------- */

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

/* ---------------------------------------------------------------------- */
/* Score circle (fixed pattern: label as separate absolutely-positioned    */
/* span, never overlapping the rotated SVG arc)                            */
/* ---------------------------------------------------------------------- */

function ScoreCircle({
  value,
  size = 88,
  strokeWidth = 7,
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

  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={BORDER} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ORANGE}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress / 100) }}
          transition={{ duration: reduce ? 0 : 0.9, ease: 'easeOut', delay: reduce ? 0 : delay }}
        />
      </svg>
      <span className="absolute text-[22px] font-bold" style={{ color: ORANGE }}>
        {display}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------------- */
/* Response-rate gauge (robust static inline width, no whileInView width)  */
/* ---------------------------------------------------------------------- */

function ResponseRateGauge({ value, reduce, delay }: { value: number; reduce: boolean; delay: number }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: reduce ? 0 : delay }}
    >
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium" style={{ color: TEXT }}>
          Taux de r&eacute;ponse actuel
        </span>
        <span className="font-semibold" style={{ color: GREEN }}>
          {value}&nbsp;%
        </span>
      </div>
      <div
        data-testid="response-rate-gauge"
        className="relative mt-2 h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: 'oklch(1 0 0 / 0.12)' }}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: GREEN,
            boxShadow: `0 0 6px -1px color-mix(in oklab, ${GREEN} 70%, transparent)`,
          }}
        />
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Timeline data                                                           */
/* ---------------------------------------------------------------------- */

type TimelineStep = {
  title: string;
  detail: string;
  date: string;
  badge: string;
  icon: typeof Check;
  tone: 'green' | 'orange' | 'grey';
};

const TIMELINE_STEPS: TimelineStep[] = [
  { title: 'Dossier priorisé', detail: 'Installation borne de recharge', date: '10 juin', badge: 'Terminé', icon: Check, tone: 'green' },
  { title: 'Devis préparé', detail: 'Devis #DEV-2024-0412', date: '11 juin', badge: 'Terminé', icon: FileText, tone: 'green' },
  { title: 'Devis envoyé', detail: 'Envoyé par email au client', date: '12 juin', badge: 'Terminé', icon: Send, tone: 'green' },
  { title: 'Relance recommandée', detail: 'Client inactif depuis 6 jours', date: '18 juin', badge: 'À faire', icon: Bell, tone: 'orange' },
  { title: 'Décision client', detail: 'En attente de réponse', date: '—', badge: 'En attente', icon: Clock, tone: 'grey' },
];

function toneColor(tone: TimelineStep['tone']) {
  if (tone === 'green') return GREEN;
  if (tone === 'orange') return ORANGE;
  return TEXT_DIM;
}

/* ---------------------------------------------------------------------- */
/* KPI data                                                                 */
/* ---------------------------------------------------------------------- */

const KPIS = [
  { value: '3', label: 'Devis envoyés', sub: 'cette semaine', icon: FileText, tone: 'green' as const },
  { value: '8 500 €', label: 'Montant en attente', sub: 'de réponse', icon: Euro, tone: 'green' as const },
  { value: '1', label: 'Relance urgente', sub: "aujourd'hui", icon: Bell, tone: 'orange' as const },
  { value: '1', label: 'Devis accepté', sub: 'cette semaine', icon: Check, tone: 'green' as const },
];

/* ---------------------------------------------------------------------- */
/* Mode de relance data                                                    */
/* ---------------------------------------------------------------------- */

const MODES = [
  { label: 'Manuelle', sub: 'Vous gardez la main', icon: Phone, selected: false },
  { label: 'Assistée', sub: 'Kadria prépare le message', icon: MessageSquare, selected: true },
  { label: 'Automatisée', sub: 'Selon vos règles et votre ton', icon: Settings2, selected: false },
];

/* ---------------------------------------------------------------------- */
/* Benefits data                                                           */
/* ---------------------------------------------------------------------- */

const BENEFITS = [
  { title: 'Relances au bon moment', desc: 'Kadria détecte le bon timing pour relancer sans être intrusif.' },
  { title: 'Plus de réponses', desc: 'Des relances pertinentes pour augmenter votre taux de réponse.' },
  { title: 'Charge mentale réduite', desc: 'Tous vos suivis sont centralisés. Plus rien ne repose sur votre mémoire.' },
  { title: 'Conversion maximisée', desc: 'Chaque devis garde une vraie chance de devenir un chantier signé.' },
];

/* ---------------------------------------------------------------------- */
/* Center card (shared between desktop + mobile order)                     */
/* ---------------------------------------------------------------------- */

function CenterCard({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid color-mix(in oklab, ${ORANGE} 35%, ${BORDER})`,
        boxShadow: `0 0 0 1px color-mix(in oklab, ${ORANGE} 12%, transparent), 0 20px 60px -20px color-mix(in oklab, ${GREEN} 25%, transparent), 0 0 40px -10px color-mix(in oklab, ${ORANGE} 20%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${ORANGE} 20%, transparent), transparent 70%)` }}
      />

      <div className="relative">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide"
          style={{
            backgroundColor: 'color-mix(in oklab, ' + ORANGE + ' 16%, transparent)',
            color: ORANGE,
            border: `1px solid color-mix(in oklab, ${ORANGE} 40%, transparent)`,
          }}
        >
          <Bell size={12} />
          À RELANCER AUJOURD&apos;HUI
        </span>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold" style={{ color: TEXT }}>
              1 devis prioritaire à relancer
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: TEXT_MUTED }}>
              Ce prospect ne vous a pas répondu depuis 6 jours. Une relance augmente fortement vos chances de réponse.
            </p>
          </div>
          <ScoreCircle value={88} reduce={reduce} delay={0.15} />
        </div>

        {/* record card */}
        <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: CARD_BG_2, border: `1px solid ${BORDER}` }}>
          <div className="grid grid-cols-2 gap-y-2 text-[12.5px]">
            <span style={{ color: TEXT_DIM }}>Client</span>
            <span className="text-right font-medium" style={{ color: TEXT }}>
              Jean Dupont
            </span>
            <span style={{ color: TEXT_DIM }}>Projet</span>
            <span className="text-right font-medium" style={{ color: TEXT }}>
              Installation borne de recharge
            </span>
            <span style={{ color: TEXT_DIM }}>Montant</span>
            <span className="text-right font-medium" style={{ color: TEXT }}>
              1 500 €
            </span>
            <span style={{ color: TEXT_DIM }}>Référence</span>
            <span className="text-right font-medium" style={{ color: TEXT }}>
              Devis #DEV-2024-0412
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Inactif depuis 6 jours', 'Envoyé le 12 juin', 'Aucune réponse'].map((t) => (
              <span
                key={t}
                className="rounded-full px-2.5 py-1 text-[10.5px] font-medium"
                style={{ backgroundColor: 'oklch(1 0 0 / 0.05)', color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* recommendation */}
        <div
          className="mt-4 rounded-xl p-3.5"
          style={{ backgroundColor: 'color-mix(in oklab, ' + GREEN + ' 8%, transparent)', border: `1px solid color-mix(in oklab, ${GREEN} 28%, transparent)` }}
        >
          <div className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: GREEN }}>
            <Sparkles size={13} />
            Recommandation Kadria
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            Relancez maintenant par email ou SMS. Le bon timing peut faire la différence.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13.5px] font-semibold transition-transform hover:scale-[1.01]"
          style={{
            backgroundColor: GREEN,
            color: 'oklch(0.16 0.008 260)',
            boxShadow: `0 8px 24px -8px color-mix(in oklab, ${GREEN} 60%, transparent)`,
          }}
        >
          Relancer maintenant
          <ArrowRight size={15} />
        </button>

        {/* mode de relance */}
        <div className="mt-4">
          <p className="text-[11.5px] font-semibold" style={{ color: TEXT_DIM }}>
            Mode de relance
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {MODES.map((mode, i) => (
              <motion.div
                key={mode.label}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: reduce ? 0 : 0.1 * i }}
                className="rounded-lg px-2 py-2.5 text-center"
                style={{
                  backgroundColor: mode.selected ? 'color-mix(in oklab, ' + GREEN + ' 14%, transparent)' : CARD_BG_2,
                  border: mode.selected ? `1px solid color-mix(in oklab, ${GREEN} 45%, transparent)` : `1px solid ${BORDER}`,
                }}
              >
                <mode.icon size={15} style={{ color: mode.selected ? GREEN : TEXT_MUTED, margin: '0 auto' }} />
                <p className="mt-1 text-[11px] font-semibold" style={{ color: mode.selected ? GREEN : TEXT }}>
                  {mode.label}
                </p>
                <p className="mt-0.5 text-[9.5px] leading-tight" style={{ color: TEXT_DIM }}>
                  {mode.sub}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Desktop timeline card                                                   */
/* ---------------------------------------------------------------------- */

function TimelineCard({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex h-full flex-col rounded-2xl p-6"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <h3 className="text-base font-bold" style={{ color: TEXT }}>
        Cycle de vos devis
      </h3>
      <p className="mt-0.5 text-[12.5px]" style={{ color: TEXT_DIM }}>
        De la priorité à la décision client
      </p>

      <div className="relative mt-5 flex-1">
        {TIMELINE_STEPS.map((step, i) => {
          const color = toneColor(step.tone);
          const isLast = i === TIMELINE_STEPS.length - 1;
          const isFollowUp = step.title === 'Relance recommandée';
          return (
            <motion.div
              key={step.title}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : 0.12 * i }}
              className="relative flex gap-3 pb-5 last:pb-0"
            >
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[13px] top-7 w-[2px]"
                  style={{
                    height: 'calc(100% - 4px)',
                    background: `linear-gradient(to bottom, ${color}, ${toneColor(TIMELINE_STEPS[i + 1].tone)})`,
                    opacity: 0.5,
                  }}
                />
              )}
              <span
                className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'color-mix(in oklab, ' + color + ' 18%, transparent)',
                  border: `1.5px solid ${color}`,
                  boxShadow: isFollowUp ? `0 0 14px 2px color-mix(in oklab, ${ORANGE} 55%, transparent)` : undefined,
                }}
              >
                <step.icon size={13} style={{ color }} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold" style={{ color: TEXT }}>
                    {step.title}
                  </p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: 'color-mix(in oklab, ' + color + ' 16%, transparent)', color }}
                  >
                    {step.badge}
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px]" style={{ color: TEXT_MUTED }}>
                  {step.detail}
                </p>
                <p className="mt-0.5 text-[10.5px]" style={{ color: TEXT_DIM }}>
                  {step.date}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <button
        type="button"
        className="mt-2 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12.5px] font-semibold transition-colors"
        style={{ backgroundColor: CARD_BG_2, color: GREEN, border: `1px solid ${BORDER}` }}
      >
        Voir tous les devis
        <ArrowRight size={13} />
      </button>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* KPI card                                                                 */
/* ---------------------------------------------------------------------- */

function KpiCard({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex h-full flex-col rounded-2xl p-6"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <h3 className="text-base font-bold" style={{ color: TEXT }}>
        Vos devis en cours
      </h3>
      <p className="mt-0.5 text-[12.5px]" style={{ color: TEXT_DIM }}>
        Vue d&apos;ensemble
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {KPIS.map((kpi, i) => {
          const color = kpi.tone === 'orange' ? ORANGE : GREEN;
          return (
            <motion.div
              key={kpi.label}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : 0.1 * i }}
              className="rounded-xl p-3.5"
              style={{ backgroundColor: CARD_BG_2, border: `1px solid ${BORDER}` }}
            >
              <kpi.icon size={16} style={{ color }} />
              <p className="mt-2 text-xl font-bold" style={{ color: TEXT }}>
                {kpi.value}
              </p>
              <p className="mt-0.5 text-[11.5px] font-medium" style={{ color: TEXT_MUTED }}>
                {kpi.label}
              </p>
              <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                {kpi.sub}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        <ResponseRateGauge value={28} reduce={reduce} delay={0.3} />
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Mobile compact timeline                                                 */
/* ---------------------------------------------------------------------- */

function CompactTimeline({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="rounded-2xl p-4"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <h3 className="text-[13.5px] font-bold" style={{ color: TEXT }}>
        Cycle de vos devis
      </h3>
      <div className="mt-3 flex flex-col gap-2">
        {TIMELINE_STEPS.map((step, i) => {
          const color = toneColor(step.tone);
          const isFollowUp = step.title === 'Relance recommandée';
          return (
            <motion.div
              key={step.title}
              initial={reduce ? false : { opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: reduce ? 0 : 0.08 * i }}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
              style={{
                backgroundColor: isFollowUp ? 'color-mix(in oklab, ' + ORANGE + ' 10%, transparent)' : 'transparent',
              }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: 'color-mix(in oklab, ' + color + ' 18%, transparent)', border: `1.5px solid ${color}` }}
              >
                <step.icon size={11} style={{ color }} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium" style={{ color: TEXT }}>
                {step.title}
              </span>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-medium" style={{ backgroundColor: 'color-mix(in oklab, ' + color + ' 16%, transparent)', color }}>
                {step.badge}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Mobile compact KPI                                                      */
/* ---------------------------------------------------------------------- */

function CompactKpi({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="rounded-2xl p-4"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <h3 className="text-[13.5px] font-bold" style={{ color: TEXT }}>
        Vos devis en cours
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {KPIS.map((kpi) => {
          const color = kpi.tone === 'orange' ? ORANGE : GREEN;
          return (
            <div key={kpi.label} className="rounded-lg p-2.5" style={{ backgroundColor: CARD_BG_2, border: `1px solid ${BORDER}` }}>
              <kpi.icon size={14} style={{ color }} />
              <p className="mt-1 text-base font-bold" style={{ color: TEXT }}>
                {kpi.value}
              </p>
              <p className="text-[10px]" style={{ color: TEXT_MUTED }}>
                {kpi.label}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3.5">
        <ResponseRateGauge value={28} reduce={reduce} delay={0.15} />
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main section                                                            */
/* ---------------------------------------------------------------------- */

export default function QuoteFollowUpSection() {
  const reduce = useStableReducedMotion();

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
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${ORANGE} 12%, transparent), transparent 70%)` }}
      />

      <div className="relative mx-auto max-w-[1760px] px-6 lg:px-10">
        {/* header */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide"
            style={{ backgroundColor: 'color-mix(in oklab, ' + GREEN + ' 14%, transparent)', color: GREEN, border: `1px solid color-mix(in oklab, ${GREEN} 35%, transparent)` }}
          >
            SUIVEZ VOS DEVIS JUSQU&apos;À LA RÉPONSE CLIENT
          </motion.span>

          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: reduce ? 0 : 0.08 }}
            className="mt-4 text-2xl font-bold sm:text-3xl"
            style={{ color: TEXT }}
          >
            Un devis envoyé ne doit plus <span style={{ color: GREEN }}>disparaître dans le silence.</span>
          </motion.h2>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: reduce ? 0 : 0.16 }}
            className="mt-3 text-[13.5px] leading-relaxed"
            style={{ color: TEXT_MUTED }}
          >
            Kadria suit vos devis, détecte les relances utiles et vous aide à transformer plus d&apos;opportunités en chantiers signés, sans alourdir votre quotidien.
          </motion.p>
        </div>

        {/* DESKTOP grid */}
        <div className="mt-10 hidden lg:grid lg:grid-cols-[1fr_72px_1.15fr_72px_1fr] lg:items-stretch">
          <div className="h-full">
            <TimelineCard reduce={reduce} />
          </div>
          <FlowConnector reduce={reduce} delay={0.2} />
          <div className="self-center">
            <CenterCard reduce={reduce} />
          </div>
          <FlowConnector reduce={reduce} delay={0.4} />
          <div className="h-full">
            <KpiCard reduce={reduce} />
          </div>
        </div>

        {/* MOBILE order */}
        <div className="mt-8 flex flex-col gap-1 lg:hidden">
          <CenterCard reduce={reduce} />
          <VerticalFlowConnector reduce={reduce} />
          <CompactTimeline reduce={reduce} />
          <VerticalFlowConnector reduce={reduce} />
          <CompactKpi reduce={reduce} />
        </div>

        {/* benefits */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-4">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : 0.08 * i }}
              className="rounded-xl p-4"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
            >
              <CheckCircle2 size={16} style={{ color: GREEN }} />
              <p className="mt-2 text-[13px] font-semibold" style={{ color: TEXT }}>
                {b.title}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: TEXT_MUTED }}>
                {b.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* tagline */}
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: reduce ? 0 : 0.3 }}
          className="mx-auto mt-8 max-w-2xl text-center text-sm"
          style={{ color: 'oklch(1 0 0 / 0.58)' }}
        >
          Kadria ne laisse aucun devis sans suivi, pour que chaque opportunité ait sa chance.
        </motion.p>
      </div>
    </section>
  );
}

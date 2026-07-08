'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Link2,
  Phone,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

/* ---------------------------------------------------------------------- */
/* Design tokens (mirrored from QuoteFollowUpSection / PriorityProspectsSection) */
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
const BLUE = 'oklch(0.72 0.13 250)';
const VIOLET = 'oklch(0.72 0.15 310)';

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
/* Data                                                                    */
/* ---------------------------------------------------------------------- */

const ACTIONS = [
  { title: 'Planifier un rendez-vous', sub: 'Client : Mme Martin', status: 'Aujourd’hui', icon: Calendar, color: GREEN },
  { title: 'Relancer Jean Dupont', sub: 'Devis #DEV-2024-0412', status: 'Urgent', icon: Phone, color: ORANGE },
  { title: 'Préparer un devis', sub: 'Salle de bain complète', status: 'Aujourd’hui', icon: FileText, color: BLUE },
  { title: 'Envoyer le lien portail client', sub: 'M. et Mme Leroy', status: 'Aujourd’hui', icon: Link2, color: VIOLET },
];

const VALUE_ITEMS = [
  { title: 'CA potentiel', value: '11 600 €', sub: 'En attente de réponse', delta: '+18% vs semaine dernière', icon: TrendingUp },
  { title: 'Devis acceptés', value: '7 450 €', sub: 'Ce mois-ci', delta: '+2 devis', icon: CheckCircle2 },
  { title: 'Taux de conversion', value: '23 %', sub: '30 derniers jours', delta: '+5 pts', icon: Target },
  { title: 'Temps gagné', value: '5h30', sub: 'Cette semaine', delta: '+1h20', icon: Clock },
];

type KpiTone = 'green' | 'orange' | 'blue' | 'red';

function toneColor(tone: KpiTone) {
  if (tone === 'green') return GREEN;
  if (tone === 'orange') return ORANGE;
  if (tone === 'blue') return BLUE;
  return 'oklch(0.72 0.19 25)';
}

const KPIS: { value: string; label: string; sub: string; tone: KpiTone; points: number[] }[] = [
  { value: '11 600 €', label: 'En attente', sub: '+2 300 € vs semaine dernière', tone: 'green', points: [3, 4, 3.5, 5, 6, 5.5, 7] },
  { value: '3', label: 'Dossiers chauds', sub: '+1 nouveau', tone: 'orange', points: [2, 2, 3, 2.5, 3, 3.5, 4] },
  { value: '2', label: 'Devis à envoyer', sub: '-1 depuis hier', tone: 'blue', points: [5, 4.5, 4, 3.5, 3, 2.5, 2] },
  { value: '1', label: 'Relance urgente', sub: 'À traiter aujourd’hui', tone: 'red', points: [1, 2, 1.5, 2, 3, 2.5, 3] },
];

const CHART_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const CHART_VALUES = [14, 16, 15.5, 19, 21, 24, 28.45];

/* ---------------------------------------------------------------------- */
/* Sparkline                                                               */
/* ---------------------------------------------------------------------- */

function Sparkline({ points, color, reduce, delay = 0 }: { points: number[]; color: string; reduce: boolean; delay?: number }) {
  const path = useMemo(() => {
    const w = 64;
    const h = 22;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    return points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((p - min) / range) * h;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [points]);

  return (
    <svg width="64" height="22" viewBox="0 0 64 22" className="overflow-visible" aria-hidden>
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: reduce ? 0 : 0.8, ease: 'easeOut', delay: reduce ? 0 : delay }}
      />
    </svg>
  );
}

/* ---------------------------------------------------------------------- */
/* Revenue chart                                                           */
/* ---------------------------------------------------------------------- */

function RevenueChart({ reduce }: { reduce: boolean }) {
  const w = 560;
  const h = 140;

  const { linePath, areaPath, points } = useMemo(() => {
    const min = Math.min(...CHART_VALUES);
    const max = Math.max(...CHART_VALUES);
    const range = max - min || 1;
    const pad = 10;
    const pts = CHART_VALUES.map((v, i) => {
      const x = (i / (CHART_VALUES.length - 1)) * w;
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return [x, y] as const;
    });
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const area = `${line} L ${w} ${h} L 0 ${h} Z`;
    return { linePath: line, areaPath: area, points: pts };
  }, []);

  return (
    <div className="relative w-full" style={{ height: h }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="cockpit-revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.28" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke={BORDER} strokeWidth="1" />
        ))}
        <motion.path
          d={areaPath}
          fill="url(#cockpit-revenue-fill)"
          stroke="none"
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: reduce ? 0 : 0.4 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke={GREEN}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 6px color-mix(in oklab, ${GREEN} 60%, transparent))` }}
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: reduce ? 0 : 1.1, ease: 'easeOut', delay: reduce ? 0 : 0.1 }}
        />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill={GREEN} />
        ))}
      </svg>
      <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: TEXT_DIM }}>
        {CHART_DAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Left card: Ce qui demande votre attention                               */
/* ---------------------------------------------------------------------- */

function AttentionCard({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex h-full flex-col rounded-2xl p-5 lg:p-6"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <h3 className="text-base font-bold" style={{ color: TEXT }}>
        Ce qui demande votre attention
      </h3>

      <div className="mt-4 flex flex-1 flex-col gap-1">
        {ACTIONS.map((a, i) => (
          <motion.div
            key={a.title}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : 0.1 * i }}
            className="flex items-center gap-3 rounded-xl px-2.5 py-3"
            style={{ borderTop: i === 0 ? 'none' : `1px solid ${BORDER}` }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'color-mix(in oklab, ' + a.color + ' 16%, transparent)' }}
            >
              <a.icon size={16} style={{ color: a.color }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold" style={{ color: TEXT }}>
                {a.title}
              </p>
              <p className="truncate text-[11.5px]" style={{ color: TEXT_MUTED }}>
                {a.sub}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
              style={{
                backgroundColor: a.status === 'Urgent' ? 'color-mix(in oklab, ' + ORANGE + ' 16%, transparent)' : 'oklch(1 0 0 / 0.05)',
                color: a.status === 'Urgent' ? ORANGE : TEXT_MUTED,
                border: `1px solid ${a.status === 'Urgent' ? 'color-mix(in oklab, ' + ORANGE + ' 40%, transparent)' : BORDER}`,
              }}
            >
              {a.status}
            </span>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12.5px] font-semibold transition-colors"
        style={{ backgroundColor: CARD_BG_2, color: GREEN, border: `1px solid ${BORDER}` }}
      >
        Voir toutes mes actions
        <ArrowRight size={13} />
      </button>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Right card: Ce qui génère de la valeur                                  */
/* ---------------------------------------------------------------------- */

function ValueCard({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: reduce ? 0 : 0.1 }}
      className="flex h-full flex-col rounded-2xl p-5 lg:p-6"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <h3 className="text-base font-bold" style={{ color: TEXT }}>
        Ce qui g&eacute;n&egrave;re de la valeur
      </h3>

      <div className="mt-4 flex flex-1 flex-col gap-1">
        {VALUE_ITEMS.map((v, i) => (
          <motion.div
            key={v.title}
            initial={reduce ? false : { opacity: 0, x: 8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : 0.1 * i }}
            className="flex items-center gap-3 rounded-xl px-2.5 py-3"
            style={{ borderTop: i === 0 ? 'none' : `1px solid ${BORDER}` }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'color-mix(in oklab, ' + GREEN + ' 16%, transparent)' }}
            >
              <v.icon size={16} style={{ color: GREEN }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold" style={{ color: TEXT }}>
                {v.title}
              </p>
              <p className="truncate text-[11px]" style={{ color: TEXT_DIM }}>
                {v.sub}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[13.5px] font-bold" style={{ color: TEXT }}>
                {v.value}
              </p>
              <p className="text-[10.5px] font-semibold" style={{ color: GREEN }}>
                {v.delta}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12.5px] font-semibold transition-colors"
        style={{ backgroundColor: CARD_BG_2, color: GREEN, border: `1px solid ${BORDER}` }}
      >
        Voir mes performances
        <ArrowRight size={13} />
      </button>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Center card: Vue d'ensemble                                             */
/* ---------------------------------------------------------------------- */

function OverviewCard({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl p-5 lg:p-6"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid color-mix(in oklab, ${GREEN} 30%, ${BORDER})`,
        boxShadow: `0 20px 60px -20px color-mix(in oklab, ${GREEN} 25%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${GREEN} 18%, transparent), transparent 70%)` }}
      />

      <div className="relative flex items-center justify-between">
        <h3 className="text-base font-bold lg:text-lg" style={{ color: TEXT }}>
          Vue d&apos;ensemble
        </h3>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ backgroundColor: CARD_BG_2, color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
        >
          Cette semaine
          <span aria-hidden>&#8964;</span>
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5 lg:gap-3">
        {KPIS.map((kpi, i) => {
          const color = toneColor(kpi.tone);
          return (
            <motion.div
              key={kpi.label}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : 0.08 * i }}
              className="rounded-xl p-3"
              style={{ backgroundColor: CARD_BG_2, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-base font-bold lg:text-xl" style={{ color: TEXT }}>
                    {kpi.value}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium" style={{ color: TEXT_MUTED }}>
                    {kpi.label}
                  </p>
                </div>
                <span className="shrink-0">
                  <Sparkline points={kpi.points} color={color} reduce={reduce} delay={0.2 + i * 0.08} />
                </span>
              </div>
              <p className="mt-1.5 text-[10px]" style={{ color: TEXT_DIM }}>
                {kpi.sub}
              </p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: reduce ? 0 : 0.35 }}
        className="relative mt-3 rounded-xl p-3.5 lg:mt-4 lg:p-4"
        style={{ backgroundColor: CARD_BG_2, border: `1px solid ${BORDER}` }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[12px] font-semibold" style={{ color: TEXT_MUTED }}>
              &Eacute;volution du chiffre d&apos;affaires potentiel
            </p>
            <p className="mt-1 text-xl font-bold" style={{ color: TEXT }}>
              28 450 &euro;
            </p>
            <p className="text-[11px] font-semibold" style={{ color: GREEN }}>
              +4 650 &euro; vs semaine derni&egrave;re
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-medium"
            style={{ backgroundColor: CARD_BG, color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
          >
            7 derniers jours
            <span aria-hidden>&#8964;</span>
          </span>
        </div>
        <div className="mt-3">
          <RevenueChart reduce={reduce} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Final banner                                                            */
/* ---------------------------------------------------------------------- */

function FinalBanner({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="relative mt-8 overflow-hidden rounded-2xl px-6 py-8 text-center sm:mt-10 lg:mt-12 lg:px-10 lg:py-10"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid color-mix(in oklab, ${GREEN} 30%, ${BORDER})`,
        boxShadow: `0 0 60px -15px color-mix(in oklab, ${GREEN} 25%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${GREEN} 20%, transparent), transparent 70%)` }}
      />
      <div className="relative flex flex-col items-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'color-mix(in oklab, ' + GREEN + ' 16%, transparent)',
            boxShadow: `0 0 24px color-mix(in oklab, ${GREEN} 55%, transparent)`,
          }}
        >
          <Sparkles size={22} style={{ color: GREEN }} />
        </span>
        <h3 className="mt-4 text-xl font-bold sm:text-2xl" style={{ color: TEXT }}>
          Tout est centralis&eacute;. Vous gardez le contr&ocirc;le.
        </h3>
        <p className="mt-2 max-w-md text-[13.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
          Moins de stress, plus d&apos;actions, plus de clients.
        </p>
        <button
          type="button"
          className="mt-5 flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[13.5px] font-semibold transition-transform hover:scale-[1.02]"
          style={{
            backgroundColor: GREEN,
            color: DARK_BG,
            boxShadow: `0 8px 24px -8px color-mix(in oklab, ${GREEN} 60%, transparent)`,
          }}
        >
          D&eacute;couvrir le cockpit Kadria
          <ArrowRight size={15} />
        </button>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main section                                                            */
/* ---------------------------------------------------------------------- */

export default function BusinessCockpitSection() {
  const reduce = useStableReducedMotion();

  return (
    <section style={{ backgroundColor: DARK_BG, color: TEXT }} className="relative overflow-hidden py-20 lg:py-28">
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
        className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${GREEN} 14%, transparent), transparent 70%)` }}
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
            PILOTEZ VOTRE ACTIVIT&Eacute;
          </motion.span>

          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: reduce ? 0 : 0.08 }}
            className="mt-4 text-2xl font-bold sm:text-3xl"
            style={{ color: TEXT }}
          >
            Pilotez votre activit&eacute; <span style={{ color: GREEN }}>sans tableur</span>{' '}
            ni m&eacute;moire.
          </motion.h2>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: reduce ? 0 : 0.16 }}
            className="mt-3 text-[13.5px] leading-relaxed"
            style={{ color: TEXT_MUTED }}
          >
            Kadria centralise vos dossiers, devis et relances pour vous donner une vision claire de ce qui avance, de ce qui bloque et de ce qui peut rapporter.
          </motion.p>
        </div>

        {/* DESKTOP grid: 3 columns, center dominant */}
        <div className="mt-10 hidden lg:grid lg:grid-cols-[1fr_1.3fr_1fr] lg:items-stretch lg:gap-5">
          <div className="h-full">
            <AttentionCard reduce={reduce} />
          </div>
          <div className="self-center">
            <OverviewCard reduce={reduce} />
          </div>
          <div className="h-full">
            <ValueCard reduce={reduce} />
          </div>
        </div>

        {/* MOBILE order: overview first, then attention, then value */}
        <div className="mt-8 flex flex-col gap-4 lg:hidden">
          <OverviewCard reduce={reduce} />
          <AttentionCard reduce={reduce} />
          <ValueCard reduce={reduce} />
        </div>

        {/* final banner */}
        <FinalBanner reduce={reduce} />
      </div>
    </section>
  );
}

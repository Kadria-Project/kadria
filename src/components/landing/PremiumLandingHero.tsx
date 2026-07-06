'use client';

import Link from 'next/link';
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Clock, Database, FileCheck } from 'lucide-react';
import { DashboardPreview } from './DashboardPreview';
import { FloatingCards } from './FloatingCards';

function useStableReducedMotion() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? prefersReduced : false;
}

/* ─────────────────────────────────────────────
   Subtle cursor aura
   ───────────────────────────────────────────── */
function GlowCursor() {
  const shouldReduce = useStableReducedMotion();
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const sx = useSpring(mx, { stiffness: 60, damping: 22 });
  const sy = useSpring(my, { stiffness: 60, damping: 22 });

  useEffect(() => {
    if (shouldReduce) return;
    const h = (e: MouseEvent) => { mx.set(e.clientX); my.set(e.clientY); };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, [mx, my, shouldReduce]);

  if (shouldReduce) return null;
  return (
    <motion.div
      className="fixed pointer-events-none z-50 rounded-full"
      style={{
        x: sx, y: sy,
        translateX: '-50%', translateY: '-50%',
        width: 380, height: 380,
        background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.048) 0%, transparent 68%)',
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   Mouse parallax
   ───────────────────────────────────────────── */
function useMouseParallax(strength = 0.007) {
  const shouldReduce = useStableReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 50, damping: 20 });
  const sy = useSpring(ry, { stiffness: 50, damping: 20 });

  useEffect(() => {
    if (shouldReduce) return;
    const h = (e: MouseEvent) => {
      rx.set((e.clientX - window.innerWidth / 2) * strength);
      ry.set((e.clientY - window.innerHeight / 2) * strength);
    };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, [rx, ry, strength, shouldReduce]);
  return { x: sx, y: sy };
}

/* ─────────────────────────────────────────────
   Particle field — tiny dots drifting toward convergence
   ───────────────────────────────────────────── */
function ParticleField({ count = 18 }: { count?: number }) {
  const shouldReduce = useStableReducedMotion();
  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 220 + 10,
      y: Math.random() * 520 + 20,
      size: Math.random() * 1.6 + 0.4,
      delay: Math.random() * 2.2 + 0.5,
      duration: Math.random() * 2.5 + 2.0,
      opacity: Math.random() * 0.45 + 0.08,
    }))
  );

  if (shouldReduce) return null;
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%', zIndex: 0 }}
      aria-hidden
    >
      {particles.map((p) => (
        <motion.circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={p.size}
          fill="rgba(34,197,94,0.7)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, p.opacity, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 1.5 + 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Convergence connector — fan of animated SVG curves
   ───────────────────────────────────────────── */
function ConvergenceConnector({ shouldReduce }: { shouldReduce: boolean | null }) {
  /*
   * Cinematic aspiration effect: a wide fan of glowing green streaks
   * that originate across the full height of the card canvas and pull
   * inward to a single bright focal point on the dashboard's left edge.
   * Streaks brighten dramatically as they approach the focal point.
   */
  const H = 560;
  const W = 90;
  const FOCAL_Y = H / 2;
  // 14 origins spread across the canvas height
  const ORIGINS = Array.from({ length: 14 }, (_, i) => 20 + (i * (H - 40)) / 13);

  return (
    <div className="relative flex-shrink-0 flex items-center" style={{ width: W, alignSelf: 'stretch' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        fill="none"
        className="w-full"
        style={{ height: '100%', minHeight: 460, overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Dim at origin → very bright at focal point */}
          <linearGradient id="cgDim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.02" />
            <stop offset="60%" stopColor="#22c55e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="cgBright" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.05" />
            <stop offset="55%" stopColor="#4ade80" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#86efac" stopOpacity="1" />
          </linearGradient>
          <filter id="streakGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {ORIGINS.map((y, i) => {
          const isMid = Math.abs(y - FOCAL_Y) < 120;
          return (
            <motion.path
              key={i}
              d={`M 0 ${y} C ${W * 0.55} ${y}, ${W * 0.55} ${FOCAL_Y}, ${W} ${FOCAL_Y}`}
              stroke={isMid ? 'url(#cgBright)' : 'url(#cgDim)'}
              strokeWidth={isMid ? 1.8 : 1.1}
              fill="none"
              filter="url(#streakGlow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: isMid ? 1 : 0.72 }}
              transition={{
                duration: 0.85,
                delay: shouldReduce ? 0 : 1.0 + i * 0.05,
                ease: 'easeOut',
              }}
            />
          );
        })}

        {/* Traveling light pulses along the brightest central streaks */}
        {!shouldReduce &&
          ORIGINS.filter((y) => Math.abs(y - FOCAL_Y) < 120).map((y, i) => (
            <circle key={`pulse-${i}`} r={1.8} fill="#d9fbe5">
              <animateMotion
                dur="1.4s"
                begin={`${2 + i * 0.25}s`}
                repeatCount="indefinite"
                path={`M 0 ${y} C ${W * 0.55} ${y}, ${W * 0.55} ${FOCAL_Y}, ${W} ${FOCAL_Y}`}
              />
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur="1.4s"
                begin={`${2 + i * 0.25}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

        {/* Focal convergence core — layered glow */}
        <motion.circle
          cx={W} cy={FOCAL_Y} r={12}
          fill="rgba(34,197,94,0.22)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0.6, 1, 0.6], scale: 1 }}
          transition={{ opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' }, scale: { delay: shouldReduce ? 0 : 1.8, duration: 0.5, ease: 'backOut' } }}
          style={{ filter: 'blur(4px)' }}
        />
        <motion.circle
          cx={W} cy={FOCAL_Y} r={4}
          fill="#86efac"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: shouldReduce ? 0 : 1.95, duration: 0.35, ease: 'backOut' }}
        />
      </svg>

      {/* Strong convergence bloom — bright radial on focal point */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: -70,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 240,
          height: 240,
          background: 'radial-gradient(circle, rgba(74,222,128,0.32) 0%, rgba(34,197,94,0.12) 32%, transparent 68%)',
          filter: 'blur(24px)',
          borderRadius: '50%',
          zIndex: 2,
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Benefit metrics — 3 concrete outcomes (no fake social proof)
   ───────────────────────────────────────────── */
function BenefitMetrics() {
  const METRICS = [
    { icon: Clock, value: '≈45 min', label: 'économisées par dossier' },
    { icon: Database, value: '100 %', label: 'des informations centralisées avant votre rappel' },
    { icon: FileCheck, value: '1 dossier', label: 'prêt à chiffrer dès le premier échange' },
  ];
  return (
    <div
      className="grid grid-cols-3 gap-5 pt-5"
      style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
    >
      {METRICS.map(({ icon: Icon, value, label }) => (
        <div key={value} className="flex flex-col gap-1.5">
          <Icon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          <div className="text-[19px] font-black leading-none tracking-tight" style={{ color: 'var(--accent)' }}>
            {value}
          </div>
          <div className="text-[11px] leading-[1.35] text-zinc-400">{label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────── */
type PremiumLandingHeroProps = { onOpenTrial: () => void };

export function PremiumLandingHero({ onOpenTrial }: PremiumLandingHeroProps) {
  const shouldReduce = useStableReducedMotion();
  const parallax = useMouseParallax(0.007);

  const fadeUp = (delay: number) => ({
    initial: shouldReduce ? { opacity: 0 } : { opacity: 0, y: 20 },
    animate: shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 },
    transition: { duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <>
      <GlowCursor />

      <section
        className="relative flex flex-col overflow-hidden pt-[88px]"
        style={{ minHeight: '92dvh' }}
      >
        {/* ══════════════════════════════
            BACKGROUND LAYER
        ══════════════════════════════ */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          {/* True near-black base */}
          <div className="absolute inset-0" style={{ background: '#080b10' }} />

          {/* Subtle noise texture */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
              backgroundSize: '160px 160px',
              opacity: 0.6,
            }}
          />

          {/* Primary green halo — upper right, breathes */}
          <motion.div
            className="absolute"
            style={{
              top: '-20%', right: '-10%',
              width: '65%', height: '80%',
              background: 'radial-gradient(ellipse at 65% 30%, rgba(34,197,94,0.085) 0%, transparent 58%)',
            }}
            animate={shouldReduce ? {} : { opacity: [0.65, 1, 0.65], scale: [1, 1.05, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Secondary ambient halo — lower left */}
          <div
            className="absolute"
            style={{
              bottom: '-8%', left: '-8%',
              width: '42%', height: '55%',
              background: 'radial-gradient(ellipse at 28% 72%, rgba(34,197,94,0.038) 0%, transparent 62%)',
            }}
          />

          {/* Horizontal light vignette — bottom edge */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.18) 35%, rgba(34,197,94,0.08) 65%, transparent 100%)',
            }}
          />
        </div>

        {/* ══════════════════════════════
            HERO CONTENT
        ══════════════════════════════ */}
        <div className="relative z-10 flex-1 flex items-center px-6 lg:px-10 xl:px-12 max-w-[1900px] mx-auto w-full py-10 md:py-0">
          <div className="w-full grid grid-cols-1 lg:grid-cols-[0.62fr_1fr] gap-6 lg:gap-10 xl:gap-14 items-center">

            {/* ══════════════════════════════
                LEFT — headline & CTAs
            ══════════════════════════════ */}
            <div className="flex flex-col gap-5">

              {/* Badge */}
              <motion.div {...fadeUp(0.12)}>
                <div
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold tracking-wide"
                  style={{
                    background: 'rgba(34,197,94,0.07)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    color: '#4ade80',
                  }}
                >
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: '#22c55e' }}
                    animate={shouldReduce ? {} : { opacity: [1, 0.28, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                  />
                  Assistant commercial 24/7
                </div>
              </motion.div>

              {/* Headline — 4 lines, last two green, final underlined */}
              <div className="flex flex-col" style={{ gap: '2px' }}>
                {[
                  { text: 'Passez du', green: false, underline: false, delay: 0.20 },
                  { text: 'chaos commercial', green: false, underline: false, delay: 0.30 },
                  { text: 'à des dossiers', green: true, underline: false, delay: 0.40 },
                  { text: 'prêts à vendre.', green: true, underline: true, delay: 0.50 },
                ].map(({ text, green, underline, delay }) => (
                  <motion.h1
                    key={text}
                    {...fadeUp(delay)}
                    className="leading-[1.04] tracking-[-0.035em] text-balance font-black"
                    style={{
                      fontSize: 'clamp(30px, 3.6vw, 52px)',
                      color: green ? '#22c55e' : 'white',
                      ...(underline && {
                        textDecoration: 'underline',
                        textDecorationColor: 'rgba(34,197,94,0.28)',
                        textDecorationThickness: '3px',
                        textUnderlineOffset: '8px',
                      }),
                    }}
                  >
                    {text}
                  </motion.h1>
                ))}
              </div>

              {/* Subtitle */}
              <motion.p
                {...fadeUp(0.58)}
                className="text-[14px] leading-[1.65] text-zinc-400 max-w-[400px] font-sans"
              >
                Appels, messages, formulaires, photos et devis à relancer&nbsp;: Kadria remet de
                l&rsquo;ordre dans votre activité commerciale et vous aide à prioriser les bonnes
                opportunités.
              </motion.p>

              {/* CTAs */}
              <motion.div {...fadeUp(0.68)} className="flex flex-wrap items-center gap-3">
                <motion.button
                  type="button"
                  onClick={onOpenTrial}
                  whileHover={shouldReduce ? {} : { scale: 1.025, y: -2 }}
                  whileTap={shouldReduce ? {} : { scale: 0.975 }}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-[14px] font-bold"
                  style={{
                    background: '#22c55e',
                    color: '#041410',
                    boxShadow: '0 0 32px rgba(34,197,94,0.32), 0 2px 12px rgba(0,0,0,0.35)',
                    letterSpacing: '-0.01em',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 0 52px rgba(34,197,94,0.48), 0 2px 12px rgba(0,0,0,0.35)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 0 32px rgba(34,197,94,0.32), 0 2px 12px rgba(0,0,0,0.35)';
                  }}
                >
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </motion.button>

                <motion.div whileHover={shouldReduce ? {} : { scale: 1.02, y: -1 }} whileTap={shouldReduce ? {} : { scale: 0.975 }}>
                  <Link
                    href="/demo-request"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-medium"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.88)',
                      letterSpacing: '-0.01em',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.2)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <circle cx="7" cy="7" r="5.5" stroke="#22c55e" strokeWidth="1.5" />
                      <path d="M5.5 5.2v3.6l3.5-1.8-3.5-1.8z" fill="#22c55e" />
                    </svg>
                    Demander une démo
                  </Link>
                </motion.div>
              </motion.div>

              {/* Reassurance — stacked, matching reference */}
              <motion.div {...fadeUp(0.76)} className="flex flex-col gap-2 text-[12.5px] text-zinc-300">
                {['Essai gratuit 7 jours', 'Mise en service en moins de 10 minutes', 'Pensé pour les artisans'].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    {item}
                  </span>
                ))}
              </motion.div>

              {/* Benefit metrics */}
              <motion.div {...fadeUp(0.84)}>
                <BenefitMetrics />
              </motion.div>

            </div>

            {/* ══════════════════════════════
                RIGHT — cinematic composition
            ══════════════════════════════ */}
            <motion.div
              className="relative hidden lg:flex items-stretch"
              style={{ x: parallax.x, y: parallax.y, gap: 0, minHeight: 580 }}
            >
              {/* Global behind-scene bloom */}
              <div
                className="absolute pointer-events-none"
                style={{
                  inset: '-60px',
                  background: 'radial-gradient(ellipse at 52% 48%, rgba(34,197,94,0.07) 0%, transparent 60%)',
                  filter: 'blur(30px)',
                  borderRadius: 48,
                  zIndex: 0,
                }}
              />

              {/* Drifting particles across the chaos zone */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
                <ParticleField count={24} />
              </div>

              {/* Floating cards column */}
              <motion.div
                className="flex-shrink-0 flex items-center"
                style={{ position: 'relative', zIndex: 3 }}
                initial={{ opacity: 0, x: -22 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.65, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <FloatingCards />
              </motion.div>

              {/* Convergence connector */}
              <ConvergenceConnector shouldReduce={shouldReduce} />

              {/* Dashboard — larger, full remaining width */}
              <div className="flex-1 min-w-0" style={{ position: 'relative', zIndex: 3 }}>
                <DashboardPreview />
              </div>
            </motion.div>

            {/* Mobile fallback */}
            <div className="lg:hidden">
              <DashboardPreview />
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

export default PremiumLandingHero;

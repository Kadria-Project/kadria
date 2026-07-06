'use client';

import Link from 'next/link';
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  animate,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Star } from 'lucide-react';
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
   Animated counter
   ───────────────────────────────────────────── */
function Counter({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const shouldReduce = useStableReducedMotion();
  useEffect(() => {
    if (shouldReduce) { setVal(to); return; }
    const c = animate(0, to, { duration: 1.8, ease: 'easeOut', onUpdate: (v) => setVal(Math.round(v)) });
    return () => c.stop();
  }, [to, shouldReduce]);
  return <>{prefix}{val}{suffix}</>;
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
   * 6 fan curves from left (card strip) to right (dashboard entry).
   * Each curve originates at a Y position matching the vertical center
   * of each floating card (approximate), converges to a single focal
   * point at (24, 280). Brightness increases as we approach focal pt.
   */
  const ORIGINS = [42, 122, 206, 294, 376, 460];
  const FOCAL_Y = 280;
  const W = 40;

  return (
    <div className="relative flex-shrink-0 flex items-center" style={{ width: W, alignSelf: 'stretch' }}>
      {/* Particle field within connector */}
      <ParticleField count={14} />

      <svg
        viewBox={`0 0 ${W} 560`}
        fill="none"
        className="w-full"
        style={{ height: '100%', minHeight: 440 }}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Gradient: dim at origin → bright at focal point */}
          <linearGradient id="cg0" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="cg1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.65" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {ORIGINS.map((y, i) => {
          const isMid = i === 2 || i === 3;
          return (
            <motion.path
              key={i}
              d={`M 0 ${y} C ${W * 0.5} ${y}, ${W * 0.5} ${FOCAL_Y}, ${W} ${FOCAL_Y}`}
              stroke={isMid ? 'url(#cg1)' : 'url(#cg0)'}
              strokeWidth={isMid ? '1.4' : '0.9'}
              strokeDasharray={isMid ? 'none' : '2 3.5'}
              fill="none"
              filter={isMid ? 'url(#glow)' : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 0.75,
                delay: shouldReduce ? 0 : 1.05 + i * 0.09,
                ease: 'easeOut',
              }}
            />
          );
        })}

        {/* Focal convergence dot — glowing */}
        <motion.circle
          cx={W}
          cy={FOCAL_Y}
          r={5}
          fill="rgba(34,197,94,0.18)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: shouldReduce ? 0 : 1.85, duration: 0.4, ease: 'backOut' }}
          style={{ filter: 'blur(2px)' }}
        />
        <motion.circle
          cx={W}
          cy={FOCAL_Y}
          r={2.5}
          fill="#22c55e"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: shouldReduce ? 0 : 1.95, duration: 0.3, ease: 'backOut' }}
        />
      </svg>

      {/* Large convergence bloom — tight radial on focal point */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: -40,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 160,
          height: 160,
          background: 'radial-gradient(circle, rgba(34,197,94,0.24) 0%, rgba(34,197,94,0.06) 35%, transparent 70%)',
          filter: 'blur(22px)',
          borderRadius: '50%',
          zIndex: 2,
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Social proof block
   ───────────────────────────────────────────── */
function SocialProof() {
  return (
    <div className="flex items-start gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Overlapping avatars */}
      <div className="flex flex-shrink-0" style={{ marginRight: -4 }}>
        {[
          { bg: '#1e3a2f', text: 'AD' },
          { bg: '#1a2a3a', text: 'ML' },
          { bg: '#2a1e1e', text: 'PB' },
        ].map((a, i) => (
          <div
            key={a.text}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[7.5px] font-bold border-2 flex-shrink-0"
            style={{
              background: a.bg,
              borderColor: '#0a0d12',
              color: 'rgba(255,255,255,0.7)',
              marginLeft: i > 0 ? -8 : 0,
              zIndex: 3 - i,
              position: 'relative',
            }}
          >
            {a.text}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-0.5">
        {/* Stars + score */}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-white">4,9/5</span>
          <span className="text-[9px] text-zinc-500">· 120+ avis artisans</span>
        </div>
        {/* Quote */}
        <p className="text-[9px] leading-[1.4] text-zinc-400" style={{ fontStyle: 'italic', maxWidth: 240 }}>
          &ldquo;Un outil qui me fait gagner du temps et me rapporte plus de chantiers.&rdquo;
        </p>
      </div>
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

              {/* Headline — 3 lines, each on its own motion */}
              <div className="flex flex-col" style={{ gap: '2px' }}>
                {[
                  { text: 'Passez du chaos commercial', green: false, delay: 0.22 },
                  { text: 'à des dossiers', green: false, delay: 0.34 },
                  { text: 'prêts à vendre.', green: true, delay: 0.46 },
                ].map(({ text, green, delay }) => (
                  <motion.h1
                    key={text}
                    {...fadeUp(delay)}
                    className="leading-[1.06] tracking-[-0.035em] text-balance font-black"
                    style={{
                      fontSize: 'clamp(28px, 3.4vw, 48px)',
                      color: green ? '#22c55e' : 'white',
                      ...(green && {
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
                    Demander un accès démo
                  </Link>
                </motion.div>
              </motion.div>

              {/* Reassurance */}
              <motion.div {...fadeUp(0.76)} className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-zinc-400">
                {['Essai gratuit 7 jours', 'Avec ou sans site', 'Pensé pour les artisans du bâtiment'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    {item}
                  </span>
                ))}
              </motion.div>

              {/* Social proof */}
              <motion.div {...fadeUp(0.84)}>
                <SocialProof />
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

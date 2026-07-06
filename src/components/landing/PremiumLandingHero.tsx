'use client';

/**
 * Migrated from _v0-kadria-hero/components/kadria/hero-section.tsx
 *
 * Layout, composition and animations copied as-is from the prototype
 * (GlowCursor, mouse parallax, headline rhythm, CTA row, social proof +
 * metrics row, floating-cards / connector / dashboard right column).
 *
 * Adapted:
 * - imports: relative v0 paths -> Kadria internal paths (`./DashboardPreview`,
 *   `./FloatingCards`); `framer-motion` stays `motion/react` (already used
 *   by the prototype and already installed in this project).
 * - color token: `var(--kadria)` (undefined in this project) -> `var(--accent)`
 *   / `var(--accent-dim)` / `var(--accent-border)`, already defined in
 *   app/globals.css with the same green.
 * - copywriting: replaced by the Kadria copy already validated for this
 *   landing (badge, headline, subtitle, CTAs, reassurance) instead of the
 *   v0 placeholder text.
 * - data: reassurance/metrics copy aligned with the rest of the product.
 * - CTA #1 triggers the existing trial modal (`onOpenTrial` prop) instead of
 *   a plain anchor, CTA #2 uses Next's `Link` to `/demo-request` — both
 *   required to keep this Hero wired into KadriaPages.tsx.
 */

import Link from 'next/link';
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  animate,
} from 'motion/react';
import { useEffect, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { DashboardPreview } from './DashboardPreview';
import { FloatingCards } from './FloatingCards';

/* ─────────────────────────────────────────────
   Stable reduced-motion preference.
   `useReducedMotion()` reads `window.matchMedia` synchronously on the
   client's first render (not gated by `useEffect`), while it always
   returns `null` on the server. For visitors/browsers with
   `prefers-reduced-motion` set (common in headless/CI browsers), this
   makes the client's hydration-matching render diverge from the SSR
   output ("Hydration failed"). Gate the real value behind a mounted
   flag so both the server render and the client's pre-hydration render
   agree (false), then pick up the real preference right after mount.
   ───────────────────────────────────────────── */
function useStableReducedMotion() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? prefersReduced : false;
}

/* ─────────────────────────────────────────────
   Glowing cursor follower
   ───────────────────────────────────────────── */
function GlowCursor() {
  const shouldReduce = useStableReducedMotion();
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });

  useEffect(() => {
    if (shouldReduce) return;
    const handler = (e: MouseEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [mx, my, shouldReduce]);

  if (shouldReduce) return null;

  return (
    <motion.div
      className="fixed pointer-events-none z-50 rounded-full"
      style={{
        x: sx,
        y: sy,
        translateX: '-50%',
        translateY: '-50%',
        width: 320,
        height: 320,
        background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.055) 0%, transparent 70%)',
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   Mouse parallax for right column
   ───────────────────────────────────────────── */
function useMouseParallax(strength = 0.012) {
  const shouldReduce = useStableReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const springX = useSpring(rx, { stiffness: 60, damping: 18 });
  const springY = useSpring(ry, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (shouldReduce) return;
    const handler = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      rx.set((e.clientX - cx) * strength);
      ry.set((e.clientY - cy) * strength);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [rx, ry, strength, shouldReduce]);

  return { x: springX, y: springY };
}

/* ─────────────────────────────────────────────
   Animated number counter
   ───────────────────────────────────────────── */
function Counter({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const shouldReduce = useStableReducedMotion();
  useEffect(() => {
    if (shouldReduce) {
      setVal(to);
      return;
    }
    const ctrl = animate(0, to, {
      duration: 1.8,
      ease: 'easeOut',
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [to, shouldReduce]);
  return (
    <>
      {prefix}
      {val}
      {suffix}
    </>
  );
}

type PremiumLandingHeroProps = {
  onOpenTrial: () => void;
};

/* ─────────────────────────────────────────────
   Main hero
   ───────────────────────────────────────────── */
export function PremiumLandingHero({ onOpenTrial }: PremiumLandingHeroProps) {
  const shouldReduce = useStableReducedMotion();
  const parallax = useMouseParallax(0.008);

  const fadeUp = (delay: number, extra?: object) => ({
    initial: shouldReduce ? { opacity: 0 } : { opacity: 0, y: 22 },
    animate: shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const, ...extra },
  });

  return (
    <>
      <GlowCursor />

      <section className="relative flex min-h-[92dvh] flex-col overflow-hidden pt-[88px] md:min-h-0 md:h-screen">
        {/* ── Atmospheric background ── */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          {/* Base */}
          <div className="absolute inset-0" style={{ background: '#0a0d12' }} />

          {/* Subtle dot grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(ellipse at 60% 40%, black 20%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 60% 40%, black 20%, transparent 70%)',
            }}
          />

          {/* Primary green halo — top right */}
          <motion.div
            className="absolute"
            style={{
              top: '-15%',
              right: '-8%',
              width: '60%',
              height: '75%',
              background: 'radial-gradient(ellipse at 65% 35%, rgba(34,197,94,0.09) 0%, transparent 60%)',
            }}
            animate={
              shouldReduce
                ? {}
                : {
                    opacity: [0.7, 1, 0.7],
                    scale: [1, 1.04, 1],
                  }
            }
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Secondary ambient halo — bottom left */}
          <div
            className="absolute"
            style={{
              bottom: '-5%',
              left: '-5%',
              width: '40%',
              height: '55%',
              background: 'radial-gradient(ellipse at 30% 75%, rgba(34,197,94,0.045) 0%, transparent 65%)',
            }}
          />

          {/* Horizontal separator glow */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: 1,
              background:
                'linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.2) 40%, rgba(34,197,94,0.1) 60%, transparent 100%)',
            }}
          />
        </div>

        {/* ── Hero content ── */}
        <div className="relative z-10 flex-1 flex items-center px-6 lg:px-8 max-w-[1800px] mx-auto w-full py-8 md:py-0">
          <div className="w-full grid grid-cols-1 lg:grid-cols-[0.72fr_1.85fr] gap-6 lg:gap-8 xl:gap-10 items-center">
            {/* ════════════════════════════
                LEFT COLUMN
            ════════════════════════════ */}
            <div className="flex flex-col gap-3">
              {/* Badge */}
              <motion.div {...fadeUp(0.1)}>
                <div
                  className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full"
                  style={{
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}
                >
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: '#22c55e' }}
                    animate={shouldReduce ? {} : { opacity: [1, 0.35, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-[11.5px] font-semibold tracking-wide" style={{ color: '#4ade80' }}>
                    Assistant commercial 24/7
                  </span>
                </div>
              </motion.div>

              {/* Headline — 3 lines with rhythm */}
              <div className="flex flex-col gap-0.5">
                {[
                  { text: 'Passez du chaos commercial', delay: 0.2, green: false },
                  { text: 'à des dossiers', delay: 0.32, green: false },
                  { text: 'prêts à vendre.', delay: 0.44, green: true },
                ].map(({ text, delay, green }) => (
                  <motion.h1
                    key={text}
                    {...fadeUp(delay)}
                    className="text-[29px] lg:text-[36px] xl:text-[42px] font-bold leading-[1.08] tracking-[-0.03em] text-balance"
                    style={{
                      color: green ? 'var(--accent)' : 'white',
                      ...(green && {
                        textDecoration: 'underline',
                        textDecorationColor: 'rgba(34,197,94,0.35)',
                        textDecorationThickness: '3px',
                        textUnderlineOffset: '7px',
                      }),
                    }}
                  >
                    {text}
                  </motion.h1>
                ))}
              </div>

              {/* Sub — tight, purposeful */}
              <motion.p {...fadeUp(0.56)} className="text-[13px] leading-[1.55] max-w-[380px] font-sans text-zinc-400">
                Appels, messages, formulaires, photos et devis à relancer&nbsp;: Kadria remet de
                l&rsquo;ordre dans votre activité commerciale et vous aide à prioriser les bonnes
                opportunités.
              </motion.p>

              {/* CTAs */}
              <motion.div {...fadeUp(0.66)} className="flex flex-wrap items-center gap-3">
                <motion.button
                  type="button"
                  onClick={onOpenTrial}
                  whileHover={shouldReduce ? {} : { scale: 1.025, y: -1.5 }}
                  whileTap={shouldReduce ? {} : { scale: 0.975 }}
                  className="inline-flex items-center gap-2 px-5 py-[11px] rounded-xl text-[13.5px] font-semibold"
                  style={{
                    background: '#22c55e',
                    color: '#061410',
                    boxShadow: '0 0 28px rgba(34,197,94,0.28), 0 2px 8px rgba(0,0,0,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 0 44px rgba(34,197,94,0.45), 0 2px 8px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 0 28px rgba(34,197,94,0.28), 0 2px 8px rgba(0,0,0,0.3)';
                  }}
                >
                  Essayer gratuitement
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.button>

                <motion.div
                  whileHover={shouldReduce ? {} : { scale: 1.02, y: -1 }}
                  whileTap={shouldReduce ? {} : { scale: 0.975 }}
                >
                  <Link
                    href="/demo-request"
                    className="inline-flex items-center gap-2 px-5 py-[11px] rounded-xl text-[13.5px] font-medium transition-colors"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.22)',
                      color: 'white',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.32)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.22)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="#22c55e" strokeWidth="1.5" />
                      <path d="M5.5 5.2v3.6l3.5-1.8-3.5-1.8z" fill="#22c55e" />
                    </svg>
                    Demander un accès démo
                  </Link>
                </motion.div>
              </motion.div>

              {/* Reassurance */}
              <motion.div {...fadeUp(0.72)} className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-zinc-400">
                {['Essai gratuit 7 jours', 'Mise en service en moins de 10 minutes', 'Pensé pour les artisans'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} />
                    {item}
                  </span>
                ))}
              </motion.div>

              {/* Metrics row */}
              <motion.div
                {...fadeUp(0.76)}
                className="flex items-center gap-5 pt-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                {[
                  { value: <Counter to={45} suffix=" min" prefix="≈" />, label: 'économisées par dossier' },
                  { value: '100 %', label: 'des informations centralisées avant votre rappel' },
                  { value: '1 dossier', label: 'prêt à chiffrer dès le premier échange' },
                ].map(({ value, label }) => (
                  <div key={label} className="flex flex-col gap-0 max-w-[110px]">
                    <div className="text-[13px] font-black leading-none tracking-tight text-white">{value}</div>
                    <div className="text-[9.5px] mt-0.5 leading-snug text-zinc-500">{label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ════════════════════════════
                RIGHT COLUMN
            ════════════════════════════ */}
            <motion.div
              className="relative hidden lg:block"
              style={{
                x: parallax.x,
                y: parallax.y,
              }}
            >
              {/* Volumetric glow behind dashboard */}
              <div
                className="absolute pointer-events-none"
                style={{
                  inset: '-48px',
                  background: 'radial-gradient(ellipse at 55% 45%, rgba(34,197,94,0.08) 0%, transparent 65%)',
                  borderRadius: '40px',
                  filter: 'blur(20px)',
                }}
              />

              {/* Concentrated convergence bloom — tight light source at connector focal point */}
              <div
                className="absolute pointer-events-none"
                style={{
                  /* Position at the connector focal point: left edge of the dashboard, vertical center */
                  left: 'calc(224px + 24px)',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 220,
                  height: 220,
                  background: 'radial-gradient(circle, rgba(34,197,94,0.22) 0%, rgba(34,197,94,0.08) 30%, transparent 70%)',
                  filter: 'blur(28px)',
                  borderRadius: '50%',
                  zIndex: 1,
                }}
              />

              {/* Layout: cards | connector | dashboard */}
              <div className="flex items-stretch gap-3 xl:gap-4">
                {/* Floating cards — flow narrative */}
                <motion.div
                  className="flex-shrink-0 w-[224px] xl:w-[240px] flex flex-col justify-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
                >
                  <FloatingCards />
                </motion.div>

                {/* Connector — animated lines */}
                <div className="flex-shrink-0 flex items-center" style={{ width: 24 }}>
                  <svg
                    viewBox="0 0 24 560"
                    fill="none"
                    className="w-full"
                    style={{ height: '100%', minHeight: 420 }}
                    preserveAspectRatio="none"
                  >
                    {[48, 130, 212, 294, 376, 458].map((y, i) => (
                      <motion.path
                        key={i}
                        d={`M 0 ${y} C 12 ${y}, 12 280, 24 280`}
                        stroke="rgba(34,197,94,0.22)"
                        strokeWidth="1.2"
                        strokeDasharray="2.5 3.5"
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{
                          duration: 0.7,
                          delay: shouldReduce ? 0 : 1.1 + i * 0.1,
                          ease: 'easeOut',
                        }}
                      />
                    ))}
                    {/* Center convergence dot */}
                    <motion.circle
                      cx="24"
                      cy="280"
                      r="3"
                      fill="rgba(34,197,94,0.6)"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: shouldReduce ? 0 : 1.8, duration: 0.3 }}
                    />
                  </svg>
                </div>

                {/* Dashboard */}
                <div className="flex-1 min-w-0">
                  <DashboardPreview />
                </div>
              </div>
            </motion.div>

            {/* Mobile — simplified, no floating cards */}
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

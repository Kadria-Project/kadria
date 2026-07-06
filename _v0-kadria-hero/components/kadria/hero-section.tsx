'use client'

import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
} from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { DashboardPreview } from './dashboard-preview'
import { FloatingCards } from './floating-cards'

/* ─────────────────────────────────────────────
   Glowing cursor follower
   ───────────────────────────────────────────── */
function GlowCursor() {
  const shouldReduce = useReducedMotion()
  const mx = useMotionValue(-200)
  const my = useMotionValue(-200)
  const sx = useSpring(mx, { stiffness: 80, damping: 20 })
  const sy = useSpring(my, { stiffness: 80, damping: 20 })

  useEffect(() => {
    if (shouldReduce) return
    const handler = (e: MouseEvent) => {
      mx.set(e.clientX)
      my.set(e.clientY)
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [mx, my, shouldReduce])

  if (shouldReduce) return null

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
        background:
          'radial-gradient(ellipse at center, rgba(45,212,160,0.055) 0%, transparent 70%)',
      }}
    />
  )
}

/* ─────────────────────────────────────────────
   Mouse parallax for right column
   ───────────────────────────────────────────── */
function useMouseParallax(strength = 0.012) {
  const shouldReduce = useReducedMotion()
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const springX = useSpring(rx, { stiffness: 60, damping: 18 })
  const springY = useSpring(ry, { stiffness: 60, damping: 18 })

  useEffect(() => {
    if (shouldReduce) return
    const handler = (e: MouseEvent) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      rx.set((e.clientX - cx) * strength)
      ry.set((e.clientY - cy) * strength)
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [rx, ry, strength, shouldReduce])

  return { x: springX, y: springY }
}

/* ─────────────────────────────────────────────
   Animated number counter
   ───────────────────────────────────────────── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const shouldReduce = useReducedMotion()
  useEffect(() => {
    if (shouldReduce) { setVal(to); return }
    const ctrl = animate(0, to, {
      duration: 1.8,
      ease: 'easeOut',
      onUpdate: (v) => setVal(Math.round(v)),
    })
    return () => ctrl.stop()
  }, [to, shouldReduce])
  return <>{val}{suffix}</>
}

/* ─────────────────────────────────────────────
   Social proof avatars
   ───────────────────────────────────────────── */
const AVATARS = [
  { initials: 'MB', color: '#2dd4a0' },
  { initials: 'AL', color: '#3b82f6' },
  { initials: 'TF', color: '#a78bfa' },
  { initials: 'SR', color: '#f59e0b' },
  { initials: 'PD', color: '#ec4899' },
]

/* ─────────────────────────────────────────────
   Main hero
   ───────────────────────────────────────────── */
export function HeroSection() {
  const shouldReduce = useReducedMotion()
  const parallax = useMouseParallax(0.008)

  const fadeUp = (delay: number, extra?: object) => ({
    initial: shouldReduce ? { opacity: 0 } : { opacity: 0, y: 22 },
    animate: shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1], ...extra },
  })

  return (
    <>
      <GlowCursor />

      <section className="relative h-screen flex flex-col overflow-hidden">

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
              background: 'radial-gradient(ellipse at 65% 35%, rgba(45,212,160,0.09) 0%, transparent 60%)',
            }}
            animate={shouldReduce ? {} : {
              opacity: [0.7, 1, 0.7],
              scale: [1, 1.04, 1],
            }}
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
              background: 'radial-gradient(ellipse at 30% 75%, rgba(45,212,160,0.045) 0%, transparent 65%)',
            }}
          />

          {/* Horizontal separator glow */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(45,212,160,0.2) 40%, rgba(45,212,160,0.1) 60%, transparent 100%)',
            }}
          />
        </div>

        {/* ── Hero content ── */}
        <div className="relative z-10 flex-1 flex items-center px-6 lg:px-10 max-w-[1600px] mx-auto w-full" style={{ paddingTop: 64 }}>
          <div className="w-full grid grid-cols-1 lg:grid-cols-[0.75fr_1.8fr] gap-6 lg:gap-8 xl:gap-10 items-center">

            {/* ════════════════════════════
                LEFT COLUMN
            ════════════════════════════ */}
            <div className="flex flex-col gap-3">

              {/* Badge */}
              <motion.div {...fadeUp(0.1)}>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full" style={{
                  background: 'rgba(45,212,160,0.08)',
                  border: '1px solid rgba(45,212,160,0.2)',
                }}>
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--kadria)' }}
                    animate={shouldReduce ? {} : { opacity: [1, 0.35, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-[11.5px] font-semibold tracking-wide" style={{ color: 'var(--kadria)' }}>
                    Pensé pour les artisans exigeants
                  </span>
                </div>
              </motion.div>

              {/* Headline — 3 lines with rhythm */}
              <div className="flex flex-col gap-0.5">
                {[
                  { text: 'Chaque demande client', delay: 0.2, green: false },
                  { text: 'devient un dossier clair,', delay: 0.32, green: false },
                  { text: 'prêt à vendre.', delay: 0.44, green: true },
                ].map(({ text, delay, green }) => (
                  <motion.h1
                    key={text}
                    {...fadeUp(delay)}
                    className="text-[26px] lg:text-[33px] xl:text-[38px] font-bold leading-[1.08] tracking-[-0.03em] text-balance"
                    style={{
                      color: green ? 'var(--kadria)' : 'var(--foreground)',
                      ...(green && {
                        textDecoration: 'underline',
                        textDecorationColor: 'rgba(45,212,160,0.35)',
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
              <motion.p
                {...fadeUp(0.56)}
                className="text-[13px] leading-[1.55] max-w-[380px] font-sans"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Kadria qualifie vos demandes, centralise vos dossiers,
                prépare vos relances et vous aide à suivre vos
                opportunités — sans perdre de temps.
              </motion.p>

              {/* CTAs */}
              <motion.div {...fadeUp(0.66)} className="flex flex-wrap items-center gap-3">
                <motion.a
                  href="#"
                  whileHover={shouldReduce ? {} : { scale: 1.025, y: -1.5 }}
                  whileTap={shouldReduce ? {} : { scale: 0.975 }}
                  className="inline-flex items-center gap-2 px-5 py-[11px] rounded-xl text-[13.5px] font-semibold"
                  style={{
                    background: 'var(--kadria)',
                    color: '#061410',
                    boxShadow: '0 0 28px rgba(45,212,160,0.28), 0 2px 8px rgba(0,0,0,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLAnchorElement).style.boxShadow =
                      '0 0 44px rgba(45,212,160,0.45), 0 2px 8px rgba(0,0,0,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLAnchorElement).style.boxShadow =
                      '0 0 28px rgba(45,212,160,0.28), 0 2px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  Demander une démo
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" />
                  </svg>
                </motion.a>

                <motion.a
                  href="#"
                  whileHover={shouldReduce ? {} : { scale: 1.02, y: -1 }}
                  whileTap={shouldReduce ? {} : { scale: 0.975 }}
                  className="inline-flex items-center gap-2 px-5 py-[11px] rounded-xl text-[13.5px] font-medium transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--foreground)',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.08)'
                    ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.16)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'
                    ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="#2dd4a0" strokeWidth="1.5" />
                    <path d="M5.5 5.2v3.6l3.5-1.8-3.5-1.8z" fill="#2dd4a0" />
                  </svg>
                  Voir le fonctionnement
                </motion.a>
              </motion.div>

              {/* Social proof + metrics — single compact row */}
              <motion.div
                {...fadeUp(0.76)}
                className="flex items-center gap-4 pt-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Avatars */}
                <div className="flex -space-x-2 flex-shrink-0">
                  {AVATARS.slice(0, 4).map(({ initials, color }) => (
                    <div
                      key={initials}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[8.5px] font-bold"
                      style={{
                        background: `${color}20`,
                        color,
                        border: '2px solid #0a0d12',
                      }}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                {/* Stars + rating */}
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="9" height="9" viewBox="0 0 10 10" fill="var(--kadria)">
                      <path d="M5 0l1.23 3.8H10l-3.09 2.24 1.18 3.63L5 7.44 1.91 9.67l1.18-3.63L0 3.8h3.77z" />
                    </svg>
                  ))}
                  <span className="text-[11px] font-bold ml-1" style={{ color: 'var(--foreground)' }}>4,9/5</span>
                  <span className="text-[10px] ml-1" style={{ color: 'var(--muted-foreground)' }}>· +400 artisans en France</span>
                </div>
              </motion.div>

              {/* Metrics row */}
              <motion.div {...fadeUp(0.84)} className="flex items-center gap-5">
                {[
                  { value: <><Counter to={400} suffix="+" /></>, label: 'artisans actifs' },
                  { value: <><Counter to={29} suffix=" min" /></>, label: 'économisées / mois' },
                  { value: <>BATI PRO · Artisan+ · PROBAT</>, label: 'ils nous font confiance' },
                ].map(({ value, label }) => (
                  <div key={label} className="flex flex-col gap-0">
                    <div className="text-[13px] font-black leading-none tracking-tight" style={{ color: 'var(--foreground)' }}>
                      {value}
                    </div>
                    <div className="text-[9.5px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
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
                  background:
                    'radial-gradient(ellipse at 55% 45%, rgba(45,212,160,0.08) 0%, transparent 65%)',
                  borderRadius: '40px',
                  filter: 'blur(20px)',
                }}
              />

              {/* Layout: cards | connector | dashboard */}
              <div className="flex items-stretch gap-3 xl:gap-4">

                {/* Floating cards — flow narrative */}
                <motion.div
                  className="flex-shrink-0 w-[200px] xl:w-[214px] flex flex-col justify-center"
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
                        stroke="rgba(45,212,160,0.22)"
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
                      cx="24" cy="280" r="3"
                      fill="rgba(45,212,160,0.6)"
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
  )
}

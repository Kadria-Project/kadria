'use client'

import { motion, useReducedMotion } from 'motion/react'

/* ── Icon primitives ── */
const Icons = {
  Plus: () => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5.5 2v7M2 5.5h7" />
    </svg>
  ),
  Euro: () => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M8 3a3.5 3.5 0 100 5M1.5 4.5h4.5M1.5 6.5h4.5" />
    </svg>
  ),
  Image: () => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="9" height="7" rx="1.2" />
      <circle cx="3.8" cy="4.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M1 7.5l2.5-2.5 2 2 1.5-1.5 2.5 2.5" />
    </svg>
  ),
  Bell: () => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 1.5a3 3 0 013 3v2l.8 1.5H1.7L2.5 6.5v-2a3 3 0 013-3z" />
      <path d="M4.2 8.5a1.3 1.3 0 002.6 0" />
    </svg>
  ),
  Star: () => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
      <path d="M5.5 1l1.1 3.4H10L7.2 6.5l1.1 3.4L5.5 8 2.7 9.9 3.8 6.5 1 4.4h3.4z" />
    </svg>
  ),
  File: () => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 1.5h4l2.5 2.5v7h-6.5z" />
      <path d="M6.5 1.5v2.5H9" />
      <path d="M3.5 6h4M3.5 7.8h2.5" />
    </svg>
  ),
}

/* ── Live badge ── */
function LiveBadge() {
  const shouldReduce = useReducedMotion()
  return (
    <div
      className="flex items-center gap-1 flex-shrink-0 ml-auto"
      style={{
        background: 'rgba(45,212,160,0.1)',
        border: '1px solid rgba(45,212,160,0.2)',
        borderRadius: 6,
        padding: '1px 5px',
      }}
    >
      <motion.div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: 'var(--kadria)' }}
        animate={shouldReduce ? {} : { opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <span className="text-[7.5px] font-bold" style={{ color: 'var(--kadria)' }}>Live</span>
    </div>
  )
}

/* ── Single card ── */
interface CardData {
  label: string
  detail: string
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  delay: number
  floatY?: number
  floatDuration?: number
  accent?: boolean
}

function FloatingCard({ label, detail, icon, iconColor, iconBg, delay, floatY = 4, floatDuration = 3.8, accent }: CardData) {
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, x: -24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        animate={shouldReduce ? {} : { y: [0, -floatY, 0] }}
        transition={{ duration: floatDuration, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.6 }}
        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl"
        style={{
          background: accent ? 'rgba(45,212,160,0.07)' : 'rgba(16,20,26,0.97)',
          border: `1px solid ${accent ? 'rgba(45,212,160,0.22)' : 'rgba(255,255,255,0.08)'}`,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Icon */}
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>

        {/* Text */}
        <div className="flex flex-col min-w-0 flex-1 gap-0">
          <span className="text-[9.5px] font-semibold leading-tight truncate" style={{ color: 'var(--foreground)' }}>
            {label}
          </span>
          <span className="text-[8px] truncate leading-tight" style={{ color: 'var(--muted-foreground)' }}>
            {detail}
          </span>
        </div>

        <LiveBadge />
      </motion.div>
    </motion.div>
  )
}

/* ── Connector between cards ── */
function FlowConnector({ delay }: { delay: number }) {
  const shouldReduce = useReducedMotion()
  return (
    <div className="flex justify-center" style={{ padding: '1px 0' }}>
      <div className="relative" style={{ width: 1, height: 7 }}>
        <div className="absolute inset-0" style={{ background: 'rgba(45,212,160,0.12)' }} />
        <motion.div
          className="absolute top-0 left-0 right-0"
          style={{ background: 'rgba(45,212,160,0.45)', transformOrigin: 'top' }}
          initial={{ scaleY: 0, height: '100%' }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.35, delay: shouldReduce ? 0 : delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

const CARDS: CardData[] = [
  {
    label: 'Nouvelle demande',
    detail: 'Carrelage salle de bain · Bordeaux',
    icon: <Icons.Plus />,
    iconColor: 'var(--kadria)',
    iconBg: 'rgba(45,212,160,0.14)',
    delay: 0.9,
    floatY: 3,
    floatDuration: 4.2,
  },
  {
    label: 'Budget détecté',
    detail: '8 000 – 12 000€ · Live',
    icon: <Icons.Euro />,
    iconColor: '#f59e0b',
    iconBg: 'rgba(245,158,11,0.12)',
    delay: 1.05,
    floatY: 5,
    floatDuration: 3.6,
  },
  {
    label: 'Photos reçues',
    detail: '4 photos attachées · Live',
    icon: <Icons.Image />,
    iconColor: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.12)',
    delay: 1.2,
    floatY: 4,
    floatDuration: 4.0,
  },
  {
    label: 'Relance conseillée',
    detail: 'Dans 2 jours · Live',
    icon: <Icons.Bell />,
    iconColor: 'var(--kadria)',
    iconBg: 'rgba(45,212,160,0.14)',
    delay: 1.35,
    floatY: 5,
    floatDuration: 3.7,
    accent: true,
  },
  {
    label: 'Score IA : 88/100',
    detail: 'Priorité haute · Live',
    icon: <Icons.Star />,
    iconColor: 'var(--kadria)',
    iconBg: 'rgba(45,212,160,0.14)',
    delay: 1.5,
    floatY: 4,
    floatDuration: 4.4,
    accent: true,
  },
  {
    label: 'Devis à préparer',
    detail: 'Prochaine étape · Live',
    icon: <Icons.File />,
    iconColor: '#a78bfa',
    iconBg: 'rgba(167,139,250,0.12)',
    delay: 1.65,
    floatY: 5,
    floatDuration: 3.9,
  },
]

export function FloatingCards() {
  return (
    <div className="flex flex-col w-full select-none" aria-hidden>
      {CARDS.map((card, i) => (
        <div key={card.label}>
          <FloatingCard {...card} />
          {i < CARDS.length - 1 && <FlowConnector delay={card.delay + 0.45} />}
        </div>
      ))}
    </div>
  )
}

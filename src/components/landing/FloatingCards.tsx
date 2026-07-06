'use client';

/**
 * Migrated from _v0-kadria-hero/components/kadria/floating-cards.tsx
 * Layout, composition and animation copied as-is; only the data (signals),
 * icon set (lucide-react, already used across Kadria) and color token
 * (`var(--kadria)` -> `var(--accent)`, already defined in app/globals.css)
 * were adapted.
 */

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { MessageCircle, Phone, FileText, Camera, Bell, Sparkles } from 'lucide-react';

/* ── Live badge ──
   `useReducedMotion()` reads `window.matchMedia` synchronously on the
   client's first render (not gated by `useEffect`), while it always
   returns `null` on the server. This can make the client's
   hydration-matching render diverge from the SSR output for visitors
   with `prefers-reduced-motion` set. Gate the real value behind a
   mounted flag so SSR and the client's pre-hydration render agree
   (false), then pick up the real preference right after mount. */
function useStableReducedMotion() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? prefersReduced : false;
}

function LiveBadge() {
  const shouldReduce = useStableReducedMotion();
  return (
    <div
      className="flex items-center gap-1 flex-shrink-0 ml-auto"
      style={{
        background: 'var(--accent-dim)',
        border: '1px solid var(--accent-border)',
        borderRadius: 6,
        padding: '1px 5px',
      }}
    >
      <motion.div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: 'var(--accent)' }}
        animate={shouldReduce ? {} : { opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <span className="text-[7.5px] font-bold" style={{ color: 'var(--accent)' }}>Live</span>
    </div>
  );
}

/* ── Single card ── */
interface CardData {
  label: string;
  detail: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  delay: number;
  floatY?: number;
  floatDuration?: number;
  accent?: boolean;
}

function FloatingCard({ label, detail, icon, iconColor, iconBg, delay, floatY = 4, floatDuration = 3.8, accent }: CardData) {
  const shouldReduce = useStableReducedMotion();

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
          background: accent ? 'rgba(34,197,94,0.08)' : 'rgba(16,20,26,0.97)',
          border: `1px solid ${accent ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}`,
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
          <span className="text-[9.5px] font-semibold leading-tight truncate text-white">
            {label}
          </span>
          <span className="text-[8px] truncate leading-tight text-zinc-500">
            {detail}
          </span>
        </div>

        <LiveBadge />
      </motion.div>
    </motion.div>
  );
}

/* ── Connector between cards ── */
function FlowConnector({ delay }: { delay: number }) {
  const shouldReduce = useStableReducedMotion();
  return (
    <div className="flex justify-center" style={{ padding: '1px 0' }}>
      <div className="relative" style={{ width: 1, height: 7 }}>
        <div className="absolute inset-0" style={{ background: 'var(--accent-dim)' }} />
        <motion.div
          className="absolute top-0 left-0 right-0"
          style={{ background: 'rgba(34,197,94,0.45)', transformOrigin: 'top' }}
          initial={{ scaleY: 0, height: '100%' }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.35, delay: shouldReduce ? 0 : delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Signals fictifs Kadria — équivalents des données du prototype v0, en
// cohérence avec les prospects/villes/montants déjà utilisés côté dashboard.
const CARDS: CardData[] = [
  {
    label: 'Nouvelle demande',
    detail: 'Carrelage salle de bain · Rouen',
    icon: <MessageCircle className="h-3 w-3" />,
    iconColor: 'var(--accent)',
    iconBg: 'var(--accent-dim)',
    delay: 0.9,
    floatY: 3,
    floatDuration: 4.2,
  },
  {
    label: 'Budget détecté',
    detail: '8 000 – 12 000€ · Live',
    icon: <Phone className="h-3 w-3" />,
    iconColor: '#f59e0b',
    iconBg: 'rgba(245,158,11,0.12)',
    delay: 1.05,
    floatY: 5,
    floatDuration: 3.6,
  },
  {
    label: 'Photos reçues',
    detail: '4 photos attachées · Live',
    icon: <Camera className="h-3 w-3" />,
    iconColor: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.12)',
    delay: 1.2,
    floatY: 4,
    floatDuration: 4.0,
  },
  {
    label: 'Relance conseillée',
    detail: 'Dans 2 jours · Live',
    icon: <Bell className="h-3 w-3" />,
    iconColor: '#22c55e',
    iconBg: 'rgba(34,197,94,0.08)',
    delay: 1.35,
    floatY: 5,
    floatDuration: 3.7,
    accent: true,
  },
  {
    label: 'Score IA : 88/100',
    detail: 'Priorité haute · Live',
    icon: <Sparkles className="h-3 w-3" />,
    iconColor: '#22c55e',
    iconBg: 'rgba(34,197,94,0.08)',
    delay: 1.5,
    floatY: 4,
    floatDuration: 4.4,
    accent: true,
  },
  {
    label: 'Devis à préparer',
    detail: 'Prochaine étape · Live',
    icon: <FileText className="h-3 w-3" />,
    iconColor: '#a78bfa',
    iconBg: 'rgba(167,139,250,0.12)',
    delay: 1.65,
    floatY: 5,
    floatDuration: 3.9,
  },
];

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
  );
}

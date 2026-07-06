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
import { PhoneMissed, MessageCircle, FileWarning, Camera, FileClock } from 'lucide-react';

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
        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl"
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
          className="w-[22px] h-[22px] rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>

        {/* Text */}
        <div className="flex flex-col min-w-0 flex-1 gap-0">
          <span className="text-[10.5px] font-semibold leading-tight truncate text-white">
            {label}
          </span>
          <span className="text-[9px] truncate leading-tight text-zinc-500">
            {detail}
          </span>
        </div>

        <LiveBadge />
      </motion.div>
    </motion.div>
  );
}

// Signaux "chaos entrant" — les 5 sources de désordre que Kadria centralise,
// en cohérence avec les prospects/villes/montants déjà utilisés côté dashboard.
const CARDS: CardData[] = [
  {
    label: 'Appel manqué',
    detail: 'M. Bernard · il y a 12 min',
    icon: <PhoneMissed className="h-3.5 w-3.5" />,
    iconColor: '#f87171',
    iconBg: 'rgba(248,113,113,0.12)',
    delay: 0.9,
    floatY: 4,
    floatDuration: 4.2,
  },
  {
    label: 'Message WhatsApp',
    detail: 'Carrelage salle de bain · Rouen',
    icon: <MessageCircle className="h-3.5 w-3.5" />,
    iconColor: '#4ade80',
    iconBg: 'rgba(34,197,94,0.1)',
    delay: 1.05,
    floatY: 5,
    floatDuration: 3.8,
  },
  {
    label: 'Formulaire incomplet',
    detail: 'Budget manquant · Live',
    icon: <FileWarning className="h-3.5 w-3.5" />,
    iconColor: '#f59e0b',
    iconBg: 'rgba(245,158,11,0.12)',
    delay: 1.2,
    floatY: 4,
    floatDuration: 4.0,
  },
  {
    label: 'Photo reçue',
    detail: '4 photos attachées · Live',
    icon: <Camera className="h-3.5 w-3.5" />,
    iconColor: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.12)',
    delay: 1.35,
    floatY: 5,
    floatDuration: 3.6,
  },
  {
    label: 'Devis à relancer',
    detail: 'Dans 2 jours · M. Petit',
    icon: <FileClock className="h-3.5 w-3.5" />,
    iconColor: '#22c55e',
    iconBg: 'rgba(34,197,94,0.08)',
    delay: 1.5,
    floatY: 4,
    floatDuration: 4.4,
    accent: true,
  },
];

export function FloatingCards() {
  return (
    <div className="flex h-full flex-col justify-between select-none" aria-hidden>
      {CARDS.map((card) => (
        <FloatingCard key={card.label} {...card} />
      ))}
    </div>
  );
}

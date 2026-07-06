'use client';

/**
 * Migrated from _v0-kadria-hero/components/kadria/dashboard-preview.tsx
 * Structure, proportions, animations and widget composition copied as-is.
 * Adapted: `var(--kadria)` -> `var(--accent)` / `var(--accent-dim)` (already
 * defined in app/globals.css), user/date strings, and the fictitious data
 * (clients, villes, montants) aligned with names already used elsewhere in
 * Kadria (M. Durand, Mme Martin, M. Bernard...).
 */

import { motion, useReducedMotion, animate } from 'motion/react';
import { useEffect, useState } from 'react';
import { Euro, Send, Flag, Target as TargetIcon, TrendingUp, Bell, Search } from 'lucide-react';

/* ─────────────────────────────────────────────
   Animated counter
   ───────────────────────────────────────────── */
function useCounter(target: number, delay: number, duration = 1.1) {
  const [value, setValue] = useState(0);
  const shouldReduce = useReducedMotion();
  useEffect(() => {
    if (shouldReduce) {
      setValue(target);
      return;
    }
    const timeout = setTimeout(() => {
      const ctrl = animate(0, target, {
        duration,
        ease: 'easeOut',
        onUpdate: (v) => setValue(Math.round(v)),
      });
      return () => ctrl.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [target, delay, duration, shouldReduce]);
  return value;
}

/* ─────────────────────────────────────────────
   CA line chart — croissance exponentielle vers 5,8k€
   ───────────────────────────────────────────── */
function CaChart() {
  const shouldReduce = useReducedMotion();
  const pts: [number, number][] = [
    [0, 58], [18, 57], [36, 56], [54, 55], [72, 53], [90, 50],
    [108, 44], [126, 35], [144, 22], [162, 10], [180, 3],
  ];
  const W = 180;
  const H = 62;
  const polyStr = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const areaPath = `M ${pts.map(([x, y]) => `${x},${y}`).join(' L ')} L ${W},${H} L 0,${H} Z`;

  return (
    <div className="relative w-full" style={{ height: 66 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full" style={{ height: 62 }}>
        <defs>
          <linearGradient id="cagrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
          <clipPath id="cac2">
            <motion.rect
              x="0"
              y="0"
              height={H + 2}
              initial={{ width: 0 }}
              animate={{ width: W }}
              transition={{ duration: shouldReduce ? 0 : 1.5, delay: 1.2, ease: 'easeOut' }}
            />
          </clipPath>
        </defs>
        <path d={areaPath} fill="url(#cagrad)" clipPath="url(#cac2)" />
        <polyline
          points={polyStr}
          stroke="#22c55e"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath="url(#cac2)"
        />
        <motion.circle
          cx={W}
          cy={3}
          r="2.5"
          fill="#22c55e"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.6, duration: 0.25 }}
        />
      </svg>
      {/* Label balloon */}
      <motion.div
        className="absolute flex items-center gap-1 px-1.5 py-0.5 rounded"
        style={{
          right: 2,
          top: 0,
          background: 'var(--accent-dim)',
          border: '1px solid var(--accent-border)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.7 }}
      >
        <span className="text-[7.5px] font-bold" style={{ color: 'var(--accent)' }}>5,8k€ sur la période</span>
      </motion.div>
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between">
        {['5 juin', '19 juin', '5 juil.'].map((l) => (
          <span key={l} className="text-[7px] text-zinc-500">{l}</span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Live pulse dot
   ───────────────────────────────────────────── */
function LiveDot({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const shouldReduce = useReducedMotion();
  const s = size === 'md' ? 10 : 7;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: s, height: s }}>
      <motion.div
        className="absolute rounded-full"
        style={{ width: s, height: s, background: 'var(--accent)', opacity: 0.25 }}
        animate={shouldReduce ? {} : { scale: [1, 2.4, 1], opacity: [0.25, 0, 0.25] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
      <div className="rounded-full" style={{ width: s * 0.65, height: s * 0.65, background: 'var(--accent)' }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   KPI strip card
   ───────────────────────────────────────────── */
function KpiStrip({
  label,
  value,
  delta,
  deltaColor = 'var(--accent)',
  icon,
  accent,
  delay,
}: {
  label: string;
  value: string;
  delta: string;
  deltaColor?: string;
  icon: React.ReactNode;
  accent?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col gap-0.5 p-2 rounded-xl flex-1"
      style={{
        background: accent ? 'var(--accent-dim)' : 'rgba(255,255,255,0.028)',
        border: `1px solid ${accent ? 'var(--accent-border)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[7.5px] font-medium uppercase tracking-wide truncate text-zinc-500">{label}</span>
        <div className="text-zinc-500" style={{ opacity: 0.7 }}>{icon}</div>
      </div>
      <div className="text-[13px] font-bold leading-none tracking-tight text-white">{value}</div>
      <div className="text-[7.5px] font-medium leading-tight" style={{ color: deltaColor }}>{delta}</div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Section label
   ───────────────────────────────────────────── */
function SL({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[9px] font-semibold text-white">{children}</span>
      {right && <span className="text-[7.5px]" style={{ color: 'var(--accent)' }}>{right}</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card wrapper
   ───────────────────────────────────────────── */
function DCard({
  children,
  delay = 0,
  accent = false,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  accent?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={`rounded-xl p-2 ${className}`}
      style={{
        background: accent ? 'var(--accent-dim)' : 'rgba(255,255,255,0.028)',
        border: `1px solid ${accent ? 'var(--accent-border)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Pipeline column bar
   ───────────────────────────────────────────── */
const PIPELINE = [
  { label: 'Nouveaux', count: 12, value: '16,2k€', color: '#3b82f6', pct: 100 },
  { label: 'Qualifiés', count: 7, value: '14,6k€', color: '#22c55e', pct: 58 },
  { label: 'Devis envoyés', count: 4, value: '7,6k€', color: '#f59e0b', pct: 33 },
  { label: 'Gagnés', count: 2, value: '5,8k€', color: '#a78bfa', pct: 16 },
];

/* ─────────────────────────────────────────────
   Agenda
   ───────────────────────────────────────────── */
const AGENDA = [
  { time: '09:00', label: 'Appel de qualification', name: 'M. Durand', color: '#3b82f6', type: 'Appel' },
  { time: '11:30', label: 'Visite chantier', name: 'Mme Martin', color: '#22c55e', type: 'RDV' },
  { time: '14:00', label: 'Relance devis carrelage', name: 'M. Bernard', color: '#f59e0b', type: 'Relance' },
  { time: '16:30', label: 'RDV devis électricité', name: 'M. Petit', color: '#a78bfa', type: 'Devis' },
];

/* ─────────────────────────────────────────────
   Dernières demandes
   ───────────────────────────────────────────── */
const LATEST = [
  { initials: 'CS', label: 'Carrelage salle de bain', sub: 'Rouen · 9 000€', time: 'il y a 2h', color: '#3b82f6' },
  { initials: 'RC', label: 'Rénovation complète', sub: 'Lyon · 18 000€', time: 'il y a 4h', color: '#22c55e' },
  { initials: 'IC', label: 'Installation clim', sub: 'Toulouse · 7 500€', time: 'il y a 6h', color: '#f59e0b' },
];

/* ─────────────────────────────────────────────
   Recommandations IA
   ───────────────────────────────────────────── */
const AI_RECOS = [
  { label: 'Relancer M. Bernard', sub: 'Maintenant · 276€ · Devis envoyé il y a 3j', urgency: 'high' },
  { label: 'Compléter le dossier Martin', sub: 'Photos manquantes · score 81/100', urgency: 'med' },
  { label: 'Relancer M. Petit', sub: 'Dans 2 jours · Aucune activité depuis 5 jours', urgency: 'low' },
];

/* ─────────────────────────────────────────────
   Activité
   ───────────────────────────────────────────── */
const ACTIVITY = [
  { label: 'M. Durand a ouvert le devis', sub: 'Carrelage salle de bain', time: 'il y a 1h', dot: '#22c55e' },
  { label: 'Nouveau projet qualifié', sub: 'Carrelage salle de bain', time: 'il y a 2h', dot: '#3b82f6' },
  { label: 'Devis accepté', sub: 'M. Bernard · 5 200€', time: 'il y a 5h', dot: '#a78bfa' },
];

/* ─────────────────────────────────────────────
   Objectifs
   ───────────────────────────────────────────── */
const OBJECTIVES = [
  { label: 'Devis à envoyer', done: 1, total: 3 },
  { label: 'Appels de qualification', done: 2, total: 4 },
  { label: 'Chantiers à sécuriser', done: 1, total: 2 },
];

/* ─────────────────────────────────────────────
   Notifications
   ───────────────────────────────────────────── */
const NOTIFS = [
  { label: '2 relances à faire aujourd’hui', dot: '#ef4444' },
  { label: '1 devis en attente depuis 3 jours', dot: '#f59e0b' },
  { label: 'Photos manquantes sur 1 dossier', dot: '#3b82f6' },
];

/* ─────────────────────────────────────────────
   Main dashboard
   ───────────────────────────────────────────── */
export function DashboardPreview() {
  const shouldReduce = useReducedMotion();
  const [activeTab, setActiveTab] = useState(1);
  const dossiers = useCounter(34, 0.9);
  const opps = useCounter(11, 0.95);
  const devisAtt = useCounter(6, 1.0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: '#0c0f14',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 0 0 1px rgba(34,197,94,0.04), 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(34,197,94,0.05)',
      }}
    >
      {/* ── macOS window chrome ── */}
      <div
        className="flex items-center gap-0 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,11,16,0.98)' }}
      >
        {/* Traffic lights */}
        <div className="flex gap-1.5 mr-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
        </div>
        {/* Search bar */}
        <div
          className="flex-1 flex items-center gap-1.5 px-2.5 py-1 rounded-md mx-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', maxWidth: 220 }}
        >
          <Search className="h-2.5 w-2.5 text-white/30" />
          <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.28)' }}>Rechercher un projet, un client...</span>
        </div>
        <div className="flex-1" />
        {/* Right icons */}
        <div className="flex items-center gap-2">
          <LiveDot size="sm" />
          {/* Bell with badge */}
          <div className="relative">
            <div className="text-zinc-500"><Bell className="h-2.5 w-2.5" /></div>
            <div
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full flex items-center justify-center"
              style={{ background: '#ef4444' }}
            />
          </div>
          {/* Avatar */}
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
          >
            AD
          </div>
        </div>
      </div>

      {/* ── App shell ── */}
      <div className="flex" style={{ height: 540, overflow: 'hidden' }}>
        {/* ── Sidebar ── */}
        <div
          className="flex flex-col flex-shrink-0 py-2"
          style={{ width: 88, borderRight: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,9,13,0.9)' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-1.5 px-2.5 pb-2 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-[8.5px] font-black flex-shrink-0"
              style={{ background: 'var(--accent)', color: '#041410' }}
            >
              K
            </div>
            <span className="text-[10px] font-bold text-white">Kadria</span>
            <span
              className="text-[5.5px] font-black px-0.5 py-0.5 rounded ml-auto"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              PRO
            </span>
          </div>

          {/* User */}
          <div className="px-2.5 py-1 mb-0.5">
            <div className="text-[9px] font-semibold leading-tight text-white">Bonjour Antonin</div>
            <div className="text-[7.5px] text-zinc-500">Dim. 5 juillet 2026</div>
          </div>

          {/* Nav */}
          {[
            { label: 'Valeur générée', active: false },
            { label: 'Suivi commercial', active: true },
            { label: 'Calendrier', active: false },
            { label: 'Mes clients', active: false },
            { label: 'Mes tâches', active: false },
          ].map((item) => (
            <div
              key={item.label}
              className="mx-1 mb-0.5 px-2 py-1.5 rounded-md text-[8px] font-medium leading-tight"
              style={{
                background: item.active ? 'var(--accent-dim)' : 'transparent',
                color: item.active ? 'var(--accent)' : undefined,
                borderLeft: item.active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <span className={item.active ? '' : 'text-zinc-500'}>{item.label}</span>
            </div>
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom actions */}
          <div className="px-2.5 pt-2 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {['Changer d’offre', 'Thème clair', 'Mon profil', 'Déconnexion'].map((l) => (
              <div key={l} className="text-[7.5px] py-0.5 text-zinc-500">{l}</div>
            ))}
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Period + tabs bar */}
          <div
            className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className="text-[7.5px] text-zinc-500">
              Période : Du 5 juin au 5 juillet 2026
            </span>
            <div className="flex gap-0.5">
              {['7 jours', 'Ce mois', '3 mois', 'Cette année'].map((t, i) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(i)}
                  className="px-1.5 py-0.5 rounded text-[7.5px] font-medium transition-all"
                  style={{
                    background: activeTab === i ? 'var(--accent-dim)' : 'transparent',
                    color: activeTab === i ? 'var(--accent)' : undefined,
                    border: activeTab === i ? '1px solid var(--accent-border)' : '1px solid transparent',
                  }}
                >
                  <span className={activeTab === i ? '' : 'text-zinc-500'}>{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Full-width KPI strip ── */}
          <div className="flex gap-1.5 px-2.5 pt-2 pb-0 flex-shrink-0">
            <KpiStrip label="Dossiers qualifiés" value={`${dossiers}`} delta="+9 ce mois" icon={<Flag className="h-2.5 w-2.5" />} delay={0.75} />
            <KpiStrip
              label="Opportunités chaudes"
              value={`${opps}`}
              delta="+3 cette semaine"
              deltaColor="#ef4444"
              icon={<TargetIcon className="h-2.5 w-2.5" />}
              delay={0.82}
            />
            <KpiStrip
              label="Devis en attente"
              value={`${devisAtt}`}
              delta="2 urgents"
              deltaColor="#f59e0b"
              icon={<Send className="h-2.5 w-2.5" />}
              delay={0.89}
            />
            <KpiStrip label="CA potentiel" value="5,8k€" delta="+1,9k€ ce mois" icon={<Euro className="h-2.5 w-2.5" />} accent delay={0.96} />
            <KpiStrip label="Taux de conversion" value="33,3%" delta="+6,5% vs préc." icon={<TrendingUp className="h-2.5 w-2.5" />} delay={1.03} />
          </div>

          {/* ── 3-column grid ── */}
          <div className="flex-1 overflow-y-hidden px-2.5 py-2" style={{ scrollbarWidth: 'none' }}>
            <div className="grid grid-cols-[1fr_1.1fr_0.9fr] gap-2 h-full content-start">
              {/* ═══════════ COLONNE 1 — Pipeline + Agenda ═══════════ */}
              <div className="flex flex-col gap-2">
                {/* Pipeline commercial */}
                <DCard delay={1.05}>
                  <SL right="Vue pipeline">Pipeline commercial</SL>
                  <div className="flex gap-1 mb-2 flex-wrap">
                    {PIPELINE.map((p) => (
                      <span
                        key={p.label}
                        className="text-[7px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}
                      >
                        {p.label} ×
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {PIPELINE.map((p, i) => (
                      <div key={p.label}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold leading-none" style={{ color: p.color }}>{p.count}</span>
                            <span className="text-[8.5px] font-semibold text-white">{p.value}</span>
                          </div>
                          <span className="text-[7px] text-zinc-500">{p.label}</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: p.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${p.pct}%` }}
                            transition={{ duration: 0.6, delay: 1.1 + i * 0.07, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </DCard>

                {/* Agenda du jour */}
                <DCard delay={1.12}>
                  <SL right="Voir calendrier">Agenda du jour</SL>
                  <div className="space-y-1.5">
                    {AGENDA.map((item, i) => (
                      <motion.div
                        key={item.time}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.18 + i * 0.055 }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-[7px] font-mono w-7 flex-shrink-0 text-zinc-500">{item.time}</span>
                        <div className="w-0.5 h-5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[8px] font-medium leading-tight truncate text-white">{item.label}</div>
                          <div className="text-[7px] truncate text-zinc-500">{item.name}</div>
                        </div>
                        <span
                          className="text-[6.5px] font-semibold px-1 py-0.5 rounded flex-shrink-0"
                          style={{ background: `${item.color}18`, color: item.color }}
                        >
                          {item.type}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </DCard>
              </div>

              {/* ═══════════ COLONNE 2 — Dernières demandes + Chart + Activité ═══════════ */}
              <div className="flex flex-col gap-2">
                {/* Dernières demandes */}
                <DCard delay={1.08}>
                  <SL right="Voir tout">Dernières demandes</SL>
                  <div className="space-y-1.5">
                    {LATEST.map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.14 + i * 0.06 }}
                        className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[7.5px] font-bold flex-shrink-0"
                          style={{ background: `${item.color}18`, color: item.color }}
                        >
                          {item.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[8.5px] font-medium leading-tight truncate text-white">{item.label}</div>
                          <div className="text-[7px] truncate text-zinc-500">{item.sub}</div>
                        </div>
                        <span className="text-[6.5px] flex-shrink-0 text-zinc-500">{item.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </DCard>

                {/* CA chart */}
                <DCard delay={1.14}>
                  <SL>Évolution du CA potentiel</SL>
                  <div className="text-[7.5px] mb-2 text-zinc-500">Sur les 30 derniers jours</div>
                  <CaChart />
                </DCard>

                {/* Activité récente */}
                <DCard delay={1.2}>
                  <SL>Activité récente</SL>
                  <div className="space-y-1.5">
                    {ACTIVITY.map((a, i) => (
                      <motion.div
                        key={a.label}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.26 + i * 0.05 }}
                        className="flex items-start gap-2"
                      >
                        <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: a.dot }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[8px] font-medium leading-tight text-white">{a.label}</div>
                          <div className="text-[7px] truncate text-zinc-500">{a.sub}</div>
                        </div>
                        <span className="text-[6.5px] flex-shrink-0 pt-0.5 text-zinc-500">{a.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </DCard>
              </div>

              {/* ═══════════ COLONNE 3 — Recos IA + Score + Objectifs + Notifs ═══════════ */}
              <div className="flex flex-col gap-2">
                {/* Recommandations IA */}
                <DCard delay={1.1} accent>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-dim)' }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="var(--accent)">
                        <path d="M4 0a4 4 0 100 8A4 4 0 004 0zm.4 6H3.6V3.8h.8zm0-2.8H3.6V2.4h.8z" />
                      </svg>
                    </div>
                    <span className="text-[8.5px] font-semibold text-white">Recommandations IA</span>
                    <motion.div
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--accent)' }}
                      animate={shouldReduce ? {} : { opacity: [1, 0.25, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    {AI_RECOS.map((r, i) => (
                      <motion.div
                        key={r.label}
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.16 + i * 0.07 }}
                        className="flex items-start gap-1.5 rounded-lg p-1.5"
                        style={{
                          background: 'rgba(255,255,255,0.032)',
                          border: `1px solid ${r.urgency === 'high' ? 'var(--accent-border)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                          style={{
                            background: r.urgency === 'high' ? 'var(--accent)' : r.urgency === 'med' ? '#f59e0b' : '#7c8490',
                          }}
                        />
                        <div>
                          <div className="text-[8px] font-medium leading-tight text-white">{r.label}</div>
                          <div className="text-[7px] mt-0.5 leading-tight text-zinc-500">{r.sub}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div
                    className="mt-2 text-center text-[7.5px] font-medium py-1 rounded-lg"
                    style={{ color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
                  >
                    Voir toutes les recommandations
                  </div>
                </DCard>

                {/* Score commercial — donut */}
                <DCard delay={1.18}>
                  <SL>Score commercial</SL>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0" style={{ width: 52, height: 52 }}>
                      <svg viewBox="0 0 52 52" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                        <motion.circle
                          cx="26"
                          cy="26"
                          r="20"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - 84 / 100) }}
                          transition={{ duration: 1.2, delay: 1.4, ease: 'easeOut' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[13px] font-black leading-none text-white">84</span>
                        <span className="text-[6px] text-zinc-500">/100</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold" style={{ color: 'var(--accent)' }}>Excellent</div>
                      <div className="text-[7.5px] leading-snug text-zinc-500">Top 15% des artisans</div>
                      <div className="text-[7px] mt-1" style={{ color: 'var(--accent)' }}>+4 pts vs mois dernier</div>
                    </div>
                  </div>
                </DCard>

                {/* Objectifs */}
                <DCard delay={1.24}>
                  <SL>Objectifs de la semaine</SL>
                  <div className="space-y-2">
                    {OBJECTIVES.map((obj, i) => (
                      <div key={obj.label}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[7.5px] text-zinc-500">{obj.label}</span>
                          <span className="text-[7.5px] font-semibold text-white">{obj.done}/{obj.total}</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: obj.done >= obj.total ? 'var(--accent)' : 'rgba(34,197,94,0.5)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(obj.done / obj.total) * 100}%` }}
                            transition={{ duration: 0.6, delay: 1.3 + i * 0.07, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </DCard>

                {/* Notifications */}
                <DCard delay={1.3}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-semibold text-white">Notifications</span>
                    <span
                      className="text-[6.5px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171' }}
                    >
                      3
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {NOTIFS.map((n, i) => (
                      <motion.div
                        key={n.label}
                        initial={{ opacity: 0, x: 5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.36 + i * 0.05 }}
                        className="flex items-start gap-1.5"
                      >
                        <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: n.dot }} />
                        <span className="text-[7.5px] leading-tight text-zinc-500">{n.label}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div
                    className="mt-2 text-center text-[7.5px] font-medium py-1 rounded-lg"
                    style={{ color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
                  >
                    Voir toutes les notifications
                  </div>
                </DCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

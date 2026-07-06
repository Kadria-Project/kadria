'use client'

import { motion, useReducedMotion, animate } from 'motion/react'
import { useEffect, useState } from 'react'

/* ─────────────────────────────────────────────
   Animated counter
   ───────────────────────────────────────────── */
function useCounter(target: number, delay: number, duration = 1.1) {
  const [value, setValue] = useState(0)
  const shouldReduce = useReducedMotion()
  useEffect(() => {
    if (shouldReduce) { setValue(target); return }
    const timeout = setTimeout(() => {
      const ctrl = animate(0, target, {
        duration,
        ease: 'easeOut',
        onUpdate: (v) => setValue(Math.round(v)),
      })
      return () => ctrl.stop()
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [target, delay, duration, shouldReduce])
  return value
}

/* ─────────────────────────────────────────────
   CA line chart — exponential growth to 5.8k€
   ───────────────────────────────────────────── */
function CaChart() {
  const shouldReduce = useReducedMotion()
  // Matches screenshot: flat start, exponential rise last third
  const pts: [number, number][] = [
    [0, 58], [18, 57], [36, 56], [54, 55], [72, 53], [90, 50],
    [108, 44], [126, 35], [144, 22], [162, 10], [180, 3],
  ]
  const W = 180, H = 62
  const polyStr = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const areaPath = `M ${pts.map(([x, y]) => `${x},${y}`).join(' L ')} L ${W},${H} L 0,${H} Z`

  return (
    <div className="relative w-full" style={{ height: 66 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full" style={{ height: 62 }}>
        <defs>
          <linearGradient id="cagrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4a0" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2dd4a0" stopOpacity="0" />
          </linearGradient>
          <clipPath id="cac2">
            <motion.rect x="0" y="0" height={H + 2}
              initial={{ width: 0 }}
              animate={{ width: W }}
              transition={{ duration: shouldReduce ? 0 : 1.5, delay: 1.2, ease: 'easeOut' }}
            />
          </clipPath>
        </defs>
        <path d={areaPath} fill="url(#cagrad)" clipPath="url(#cac2)" />
        <polyline points={polyStr} stroke="#2dd4a0" strokeWidth="1.6" fill="none"
          strokeLinecap="round" strokeLinejoin="round" clipPath="url(#cac2)" />
        <motion.circle cx={W} cy={3} r="2.5" fill="#2dd4a0"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.6, duration: 0.25 }}
        />
      </svg>
      {/* Label balloon */}
      <motion.div
        className="absolute flex items-center gap-1 px-1.5 py-0.5 rounded"
        style={{
          right: 2, top: 0,
          background: 'rgba(45,212,160,0.14)',
          border: '1px solid rgba(45,212,160,0.25)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.7 }}
      >
        <span className="text-[7.5px] font-bold" style={{ color: 'var(--kadria)' }}>5.8k€ sur la période</span>
      </motion.div>
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between">
        {['5 juin', '19 juin', '5 juil.'].map(l => (
          <span key={l} className="text-[7px]" style={{ color: 'var(--muted-foreground)' }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Live pulse dot
   ───────────────────────────────────────────── */
function LiveDot({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const shouldReduce = useReducedMotion()
  const s = size === 'md' ? 10 : 7
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: s, height: s }}>
      <motion.div
        className="absolute rounded-full"
        style={{ width: s, height: s, background: 'var(--kadria)', opacity: 0.25 }}
        animate={shouldReduce ? {} : { scale: [1, 2.4, 1], opacity: [0.25, 0, 0.25] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
      <div className="rounded-full" style={{ width: s * 0.65, height: s * 0.65, background: 'var(--kadria)' }} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   KPI strip card
   ───────────────────────────────────────────── */
function KpiStrip({ label, value, delta, deltaColor = 'var(--kadria)', icon, accent, delay }: {
  label: string; value: string; delta: string; deltaColor?: string; icon: React.ReactNode; accent?: boolean; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col gap-0.5 p-2 rounded-xl flex-1"
      style={{
        background: accent ? 'rgba(45,212,160,0.06)' : 'rgba(255,255,255,0.028)',
        border: `1px solid ${accent ? 'rgba(45,212,160,0.22)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[7.5px] font-medium uppercase tracking-wide truncate" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
        <div style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>{icon}</div>
      </div>
      <div className="text-[13px] font-bold leading-none tracking-tight" style={{ color: 'var(--foreground)' }}>{value}</div>
      <div className="text-[7.5px] font-medium leading-tight" style={{ color: deltaColor }}>{delta}</div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   Section label
   ───────────────────────────────────────────── */
function SL({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[9px] font-semibold" style={{ color: 'var(--foreground)' }}>{children}</span>
      {right && <span className="text-[7.5px]" style={{ color: 'var(--kadria)' }}>{right}</span>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Card wrapper
   ───────────────────────────────────────────── */
function DCard({ children, delay = 0, accent = false, className = '' }: {
  children: React.ReactNode; delay?: number; accent?: boolean; className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={`rounded-xl p-2 ${className}`}
      style={{
        background: accent ? 'rgba(45,212,160,0.045)' : 'rgba(255,255,255,0.028)',
        border: `1px solid ${accent ? 'rgba(45,212,160,0.18)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {children}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   Pipeline column bar
   ───────────────────────────────────────────── */
const PIPELINE = [
  { label: 'Nouveaux', count: 12, value: '16.2k€', color: '#3b82f6', pct: 100 },
  { label: 'Qualifiés', count: 7, value: '14.6k€', color: '#2dd4a0', pct: 58 },
  { label: 'Devis envoyés', count: 4, value: '7.6k€', color: '#f59e0b', pct: 33 },
  { label: 'Gagnés', count: 2, value: '5.8k€', color: '#a78bfa', pct: 16 },
]

/* ─────────────────────────────────────────────
   Agenda
   ───────────────────────────────────────────── */
const AGENDA = [
  { time: '09:00', label: 'Appel de qualification', name: 'Antoine Dugautier', color: '#3b82f6', type: 'Appel' },
  { time: '11:30', label: 'Visite chantier', name: 'Mme Bertrand', color: '#2dd4a0', type: 'RDV' },
  { time: '14:00', label: 'Relance devis carrelage', name: 'Pierre Lefebvre', color: '#f59e0b', type: 'Relance' },
  { time: '16:30', label: 'RDV devis électricité', name: 'Bernard Martin', color: '#a78bfa', type: 'Devis' },
]

/* ─────────────────────────────────────────────
   Latest projects
   ───────────────────────────────────────────── */
const LATEST = [
  { initials: 'CS', label: 'Carrelage salle de bain', sub: 'Bordeaux · 9 000€', time: 'il y a 2h', color: '#3b82f6' },
  { initials: 'RC', label: 'Rénovation complète', sub: 'Lyon · 18 000€', time: 'il y a 4h', color: '#2dd4a0' },
  { initials: 'IC', label: 'Installation clim', sub: 'Toulouse · 7 500€', time: 'il y a 6h', color: '#f59e0b' },
]

/* ─────────────────────────────────────────────
   AI recommendations
   ───────────────────────────────────────────── */
const AI_RECOS = [
  { label: 'Relancer Daniela Test', sub: 'Maintenant · 276€ · Devis envoyé il y a 3j', urgency: 'high' },
  { label: 'Compléter le dossier Dugautier', sub: 'Photos manquantes · score 81/100', urgency: 'med' },
  { label: 'Relancer Bernard', sub: 'Dans 2 jours · Aucune activité depuis 5 jours', urgency: 'low' },
]

/* ─────────────────────────────────────────────
   Activity
   ───────────────────────────────────────────── */
const ACTIVITY = [
  { label: 'Daniela Test a ouvert le devis', sub: 'Carrelage salle de bain', time: 'il y a 1h', dot: '#2dd4a0' },
  { label: 'Nouveau projet qualifié', sub: 'Carrelage salle de bain', time: 'il y a 2h', dot: '#3b82f6' },
  { label: 'Devis accepté', sub: 'Bernard Martin · 5 200€', time: 'il y a 5h', dot: '#a78bfa' },
]

/* ─────────────────────────────────────────────
   Objectives
   ───────────────────────────────────────────── */
const OBJECTIVES = [
  { label: 'Devis à envoyer', done: 1, total: 3 },
  { label: 'Appels de qualification', done: 2, total: 4 },
  { label: 'Chantiers à sécuriser', done: 1, total: 2 },
]

/* ─────────────────────────────────────────────
   Notifications
   ───────────────────────────────────────────── */
const NOTIFS = [
  { label: '2 relances à faire aujourd\'hui', dot: '#ef4444' },
  { label: '1 devis en attente depuis 3 jours', dot: '#f59e0b' },
  { label: 'Photos manquantes sur 1 dossier', dot: '#3b82f6' },
]

/* ─────────────────────────────────────────────
   Icon set
   ───────────────────────────────────────────── */
const I = {
  Euro: () => <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 2.5a3 3 0 100 4M1 3.5h3.5M1 5.5h3.5" /></svg>,
  Send: () => <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l7 3.5L1 8V5.5l4-1-4-1z" /></svg>,
  Flag: () => <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 1.5v6M2 1.5l5 2-5 2" /></svg>,
  Target: () => <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="4.5" cy="4.5" r="3.2" /><circle cx="4.5" cy="4.5" r="1.2" /><path d="M4.5 1.3V2.5M4.5 6.5v1.2M1.3 4.5H2.5M6.5 4.5h1.2" /></svg>,
  Trend: () => <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 7l2.5-3 2 2L8 2" /></svg>,
  Bell: () => <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 1a2.5 2.5 0 012.5 2.5v2l.8 1.5H1.2L2 5.5V3.5A2.5 2.5 0 014.5 1z" /><path d="M3.5 7.2a1 1 0 002 0" /></svg>,
  Search: () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="4.5" cy="4.5" r="3" /><path d="M7 7l1.5 1.5" /></svg>,
}

/* ─────────────────────────────────────────────
   Main dashboard
   ───────────────────────────────────────────── */
export function DashboardPreview() {
  const shouldReduce = useReducedMotion()
  const [activeTab, setActiveTab] = useState(1)
  const dossiers = useCounter(34, 0.9)
  const opps = useCounter(11, 0.95)
  const devisAtt = useCounter(6, 1.0)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: '#0c0f14',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 0 0 1px rgba(45,212,160,0.04), 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(45,212,160,0.05)',
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
          <I.Search />
          <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.28)' }}>Rechercher un projet, un client...</span>
        </div>
        <div className="flex-1" />
        {/* Right icons */}
        <div className="flex items-center gap-2">
          <LiveDot size="sm" />
          {/* Bell with badge */}
          <div className="relative">
            <div style={{ color: 'var(--muted-foreground)' }}><I.Bell /></div>
            <div
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full flex items-center justify-center"
              style={{ background: '#ef4444' }}
            />
          </div>
          {/* Avatar */}
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0"
            style={{ background: 'rgba(45,212,160,0.18)', color: 'var(--kadria)', border: '1px solid rgba(45,212,160,0.3)' }}
          >
            AA
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
              style={{ background: 'var(--kadria)', color: '#041410' }}
            >
              K
            </div>
            <span className="text-[10px] font-bold" style={{ color: 'var(--foreground)' }}>Kadria</span>
            <span className="text-[5.5px] font-black px-0.5 py-0.5 rounded ml-auto" style={{ background: 'rgba(45,212,160,0.14)', color: 'var(--kadria)' }}>PRO</span>
          </div>

          {/* User */}
          <div className="px-2.5 py-1 mb-0.5">
            <div className="text-[9px] font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>Bonjour Antonin</div>
            <div className="text-[7.5px]" style={{ color: 'var(--muted-foreground)' }}>Dim. 5 juillet 2026</div>
          </div>

          {/* Nav */}
          {[
            { label: 'Valeur générée', active: false },
            { label: 'Suivi commercial', active: true },
            { label: 'Calendrier', active: false },
            { label: 'Mes clients', active: false },
            { label: 'Mes tâches', active: false },
          ].map(item => (
            <div
              key={item.label}
              className="mx-1 mb-0.5 px-2 py-1.5 rounded-md text-[8px] font-medium leading-tight"
              style={{
                background: item.active ? 'rgba(45,212,160,0.1)' : 'transparent',
                color: item.active ? 'var(--kadria)' : 'var(--muted-foreground)',
                borderLeft: item.active ? '2px solid var(--kadria)' : '2px solid transparent',
              }}
            >
              {item.label}
            </div>
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom actions */}
          <div className="px-2.5 pt-2 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {["Changer d'offre", 'Thème clair', 'Mon profil', 'Déconnexion'].map(l => (
              <div key={l} className="text-[7.5px] py-0.5" style={{ color: 'var(--muted-foreground)' }}>{l}</div>
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
            <span className="text-[7.5px]" style={{ color: 'var(--muted-foreground)' }}>
              Période : Du 5 juin au 5 juillet 2026
            </span>
            <div className="flex gap-0.5">
              {['7 jours', 'Ce mois', '3 mois', 'Cette année'].map((t, i) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(i)}
                  className="px-1.5 py-0.5 rounded text-[7.5px] font-medium transition-all"
                  style={{
                    background: activeTab === i ? 'rgba(45,212,160,0.12)' : 'transparent',
                    color: activeTab === i ? 'var(--kadria)' : 'var(--muted-foreground)',
                    border: activeTab === i ? '1px solid rgba(45,212,160,0.22)' : '1px solid transparent',
                  }}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* ── Full-width KPI strip ── */}
          <div className="flex gap-1.5 px-2.5 pt-2 pb-0 flex-shrink-0">
            <KpiStrip
              label="Dossiers qualifiés"
              value={`${dossiers}`}
              delta="+9 ce mois"
              icon={<I.Flag />}
              delay={0.75}
            />
            <KpiStrip
              label="Opportunités chaudes"
              value={`${opps}`}
              delta="+3 cette semaine"
              deltaColor="#ef4444"
              icon={<I.Target />}
              delay={0.82}
            />
            <KpiStrip
              label="Devis en attente"
              value={`${devisAtt}`}
              delta="2 urgents"
              deltaColor="#f59e0b"
              icon={<I.Send />}
              delay={0.89}
            />
            <KpiStrip
              label="CA potentiel"
              value="5.8k€"
              delta="+1.9k€ ce mois"
              icon={<I.Euro />}
              accent
              delay={0.96}
            />
            <KpiStrip
              label="Taux de conversion"
              value="33.3%"
              delta="+6.5% vs préc."
              icon={<I.Trend />}
              delay={1.03}
            />
          </div>

          {/* ── 3-column grid ── */}
          <div
            className="flex-1 overflow-y-hidden px-2.5 py-2"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="grid grid-cols-[1fr_1.1fr_0.9fr] gap-2 h-full content-start">

              {/* ═══════════ COLUMN 1 — Pipeline + Agenda ═══════════ */}
              <div className="flex flex-col gap-2">

                {/* Pipeline commercial */}
                <DCard delay={1.05}>
                  <SL right="Vue pipeline">Pipeline commercial</SL>
                  {/* Tab strip */}
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
                  {/* Counts + bars */}
                  <div className="space-y-1.5">
                    {PIPELINE.map((p, i) => (
                      <div key={p.label}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold leading-none" style={{ color: p.color }}>{p.count}</span>
                            <span className="text-[8.5px] font-semibold" style={{ color: 'var(--foreground)' }}>{p.value}</span>
                          </div>
                          <span className="text-[7px]" style={{ color: 'var(--muted-foreground)' }}>{p.label}</span>
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
                        <span className="text-[7px] font-mono w-7 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>{item.time}</span>
                        <div className="w-0.5 h-5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[8px] font-medium leading-tight truncate" style={{ color: 'var(--foreground)' }}>{item.label}</div>
                          <div className="text-[7px] truncate" style={{ color: 'var(--muted-foreground)' }}>{item.name}</div>
                        </div>
                        <span
                          className="text-[6.5px] font-semibold px-1 py-0.5 rounded flex-shrink-0"
                          style={{ background: `${item.color}18`, color: item.color }}
                        >{item.type}</span>
                      </motion.div>
                    ))}
                  </div>
                </DCard>

              </div>

              {/* ═══════════ COLUMN 2 — Dernières demandes + Chart + Activité ═══════════ */}
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
                          <div className="text-[8.5px] font-medium leading-tight truncate" style={{ color: 'var(--foreground)' }}>{item.label}</div>
                          <div className="text-[7px] truncate" style={{ color: 'var(--muted-foreground)' }}>{item.sub}</div>
                        </div>
                        <span className="text-[6.5px] flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>{item.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </DCard>

                {/* CA chart */}
                <DCard delay={1.14}>
                  <SL>Évolution du CA potentiel</SL>
                  <div className="text-[7.5px] mb-2" style={{ color: 'var(--muted-foreground)' }}>Sur les 30 derniers jours</div>
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
                          <div className="text-[8px] font-medium leading-tight" style={{ color: 'var(--foreground)' }}>{a.label}</div>
                          <div className="text-[7px] truncate" style={{ color: 'var(--muted-foreground)' }}>{a.sub}</div>
                        </div>
                        <span className="text-[6.5px] flex-shrink-0 pt-0.5" style={{ color: 'var(--muted-foreground)' }}>{a.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </DCard>

              </div>

              {/* ═══════════ COLUMN 3 — AI Recos + Score + Objectives + Notifs ═══════════ */}
              <div className="flex flex-col gap-2">

                {/* AI Recommendations */}
                <DCard delay={1.1} accent>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div
                      className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(45,212,160,0.18)' }}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="var(--kadria)">
                        <path d="M4 0a4 4 0 100 8A4 4 0 004 0zm.4 6H3.6V3.8h.8zm0-2.8H3.6V2.4h.8z" />
                      </svg>
                    </div>
                    <span className="text-[8.5px] font-semibold" style={{ color: 'var(--foreground)' }}>Recommandations IA</span>
                    <motion.div
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--kadria)' }}
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
                          border: `1px solid ${r.urgency === 'high' ? 'rgba(45,212,160,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                          style={{
                            background: r.urgency === 'high' ? 'var(--kadria)' : r.urgency === 'med' ? '#f59e0b' : '#7c8490',
                          }}
                        />
                        <div>
                          <div className="text-[8px] font-medium leading-tight" style={{ color: 'var(--foreground)' }}>{r.label}</div>
                          <div className="text-[7px] mt-0.5 leading-tight" style={{ color: 'var(--muted-foreground)' }}>{r.sub}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div
                    className="mt-2 text-center text-[7.5px] font-medium py-1 rounded-lg"
                    style={{ color: 'var(--kadria)', background: 'rgba(45,212,160,0.07)', border: '1px solid rgba(45,212,160,0.15)' }}
                  >
                    Voir toutes les recommandations
                  </div>
                </DCard>

                {/* Commercial score — donut */}
                <DCard delay={1.18}>
                  <SL>Score commercial</SL>
                  <div className="flex items-center gap-3">
                    {/* Donut */}
                    <div className="relative flex-shrink-0" style={{ width: 52, height: 52 }}>
                      <svg viewBox="0 0 52 52" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                        <motion.circle
                          cx="26" cy="26" r="20" fill="none"
                          stroke="#2dd4a0" strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - 84 / 100) }}
                          transition={{ duration: 1.2, delay: 1.4, ease: 'easeOut' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[13px] font-black leading-none" style={{ color: 'var(--foreground)' }}>84</span>
                        <span className="text-[6px]" style={{ color: 'var(--muted-foreground)' }}>/100</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold" style={{ color: 'var(--kadria)' }}>Excellent</div>
                      <div className="text-[7.5px] leading-snug" style={{ color: 'var(--muted-foreground)' }}>Top 15% des artisans</div>
                      <div className="text-[7px] mt-1" style={{ color: 'var(--kadria)' }}>+4 pts vs mois dernier</div>
                    </div>
                  </div>
                </DCard>

                {/* Objectives */}
                <DCard delay={1.24}>
                  <SL>Objectifs de la semaine</SL>
                  <div className="space-y-2">
                    {OBJECTIVES.map((obj, i) => (
                      <div key={obj.label}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[7.5px]" style={{ color: 'var(--muted-foreground)' }}>{obj.label}</span>
                          <span className="text-[7.5px] font-semibold" style={{ color: 'var(--foreground)' }}>{obj.done}/{obj.total}</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: obj.done >= obj.total ? 'var(--kadria)' : 'rgba(45,212,160,0.5)' }}
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
                    <span className="text-[9px] font-semibold" style={{ color: 'var(--foreground)' }}>Notifications</span>
                    <span
                      className="text-[6.5px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171' }}
                    >3</span>
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
                        <span className="text-[7.5px] leading-tight" style={{ color: 'var(--muted-foreground)' }}>{n.label}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div
                    className="mt-2 text-center text-[7.5px] font-medium py-1 rounded-lg"
                    style={{ color: 'var(--kadria)', background: 'rgba(45,212,160,0.06)', border: '1px solid rgba(45,212,160,0.14)' }}
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
  )
}

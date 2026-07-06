'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { MessageCircle, Phone, FileText, Camera, Bell, StickyNote, Mail, HelpCircle, Image as ImageIcon } from 'lucide-react';

function useStableReducedMotion() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? prefersReduced : false;
}

/* ── Individual floating artifact ── */
interface ArtifactProps {
  children: React.ReactNode;
  delay: number;
  floatY?: number;
  floatDuration?: number;
  /** absolute position within the 260×560 canvas */
  x: number;
  y: number;
  rotate?: number;
  opacity?: number;
  scale?: number;
  zIndex?: number;
}

function Artifact({
  children, delay, floatY = 4, floatDuration = 3.8,
  x, y, rotate = 0, opacity = 1, scale = 1, zIndex = 1,
}: ArtifactProps) {
  const shouldReduce = useStableReducedMotion();
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y, zIndex }}
      initial={{ opacity: 0, scale: scale * 0.88, x: -16 }}
      animate={{ opacity, scale, x: 0 }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        style={{ rotate, transformOrigin: 'center center' }}
        animate={shouldReduce ? {} : { y: [0, -floatY, 0] }}
        transition={{ duration: floatDuration, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.4 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ── Card styles ── */
const cardBase: React.CSSProperties = {
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
};

function PulseDot() {
  const shouldReduce = useStableReducedMotion();
  return (
    <motion.div
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: '#22c55e' }}
      animate={shouldReduce ? {} : { opacity: [1, 0.25, 1] }}
      transition={{ duration: 1.8, repeat: Infinity }}
    />
  );
}

function StatusPill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <div
      className="flex-shrink-0 px-1.5 py-0.5 rounded"
      style={{ background: bg, border: `1px solid ${color}44`, lineHeight: 1 }}
    >
      <span className="text-[7px] font-bold" style={{ color }}>{text}</span>
    </div>
  );
}

/* ── Decorative floating icon chip — background "chaos" being pulled in ── */
function DecoIcon({
  icon, x, y, size = 26, rotate = 0, opacity = 0.4, delay, floatY = 6, floatDuration = 4,
}: {
  icon: React.ReactNode;
  x: number; y: number; size?: number; rotate?: number; opacity?: number;
  delay: number; floatY?: number; floatDuration?: number;
}) {
  const shouldReduce = useStableReducedMotion();
  return (
    <motion.div
      className="absolute flex items-center justify-center rounded-lg"
      style={{
        left: x, top: y, width: size, height: size, zIndex: 1,
        background: 'rgba(20,26,33,0.75)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
      }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        style={{ rotate, color: 'rgba(255,255,255,0.35)' }}
        animate={shouldReduce ? {} : { y: [0, -floatY, 0] }}
        transition={{ duration: floatDuration, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.3 }}
      >
        {icon}
      </motion.div>
    </motion.div>
  );
}

export function FloatingCards() {
  return (
    /*
     * 260 × 560 absolute-position canvas.
     * Cards float in space — no stack, no connectors.
     * Each artifact has a unique position, rotation, opacity, and depth.
     */
    <div
      className="relative select-none"
      style={{ width: 260, height: 560 }}
      aria-hidden
    >

      {/* ── Decorative "chaos" icons drifting toward the dashboard ── */}
      <DecoIcon icon={<Mail className="h-3 w-3" />} x={196} y={52} size={26} rotate={-8} opacity={0.42} delay={1.05} floatDuration={4.4} />
      <DecoIcon icon={<ImageIcon className="h-3 w-3" />} x={232} y={150} size={24} rotate={10} opacity={0.34} delay={1.2} floatY={7} floatDuration={3.8} />
      <DecoIcon icon={<Mail className="h-2.5 w-2.5" />} x={210} y={244} size={22} rotate={6} opacity={0.3} delay={1.32} floatDuration={4.7} />
      <DecoIcon icon={<Camera className="h-3 w-3" />} x={236} y={340} size={24} rotate={-6} opacity={0.36} delay={1.44} floatY={8} floatDuration={4.1} />
      <DecoIcon icon={<Mail className="h-3 w-3" />} x={200} y={440} size={26} rotate={9} opacity={0.4} delay={1.5} floatDuration={3.9} />
      <DecoIcon icon={<ImageIcon className="h-2.5 w-2.5" />} x={224} y={512} size={22} rotate={-10} opacity={0.3} delay={1.6} floatY={6} floatDuration={4.5} />

      {/* ── 1. APPEL MANQUÉ — top, slight left tilt ── */}
      <Artifact x={4} y={18} delay={0.85} rotate={-1.5} floatY={3} floatDuration={4.1} zIndex={4} opacity={1}>
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{
            ...cardBase,
            background: 'rgba(14,18,24,0.96)',
            border: '1px solid rgba(255,255,255,0.09)',
            width: 200,
          }}
        >
          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.14)' }}>
            <Phone className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold text-white leading-tight">Appel manqué</div>
            <div className="text-[8.5px] text-zinc-400 leading-tight">06 72 11 47 09 · 18:42</div>
          </div>
          <StatusPill text="Manqué" color="#f87171" bg="rgba(239,68,68,0.12)" />
        </div>
      </Artifact>

      {/* ── 2. WHATSAPP — wider, slight right tilt ── */}
      <Artifact x={18} y={108} delay={1.0} rotate={0.8} floatY={5} floatDuration={3.7} zIndex={3} opacity={0.98}>
        <div
          className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl"
          style={{
            ...cardBase,
            background: 'rgba(10,15,20,0.97)',
            border: '1px solid rgba(34,197,94,0.14)',
            width: 218,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
              <MessageCircle className="h-3 w-3" style={{ color: '#22c55e' }} />
            </div>
            <span className="text-[9.5px] font-semibold text-white">WhatsApp</span>
            <span className="ml-auto text-[7.5px] text-zinc-500">Hier, 17:32</span>
          </div>
          <div className="text-[8.5px] text-zinc-300 leading-[1.45]">
            &ldquo;Bonjour, j&apos;aurais besoin d&apos;un devis pour refaire ma salle de bain…&rdquo;
          </div>
          <div className="flex justify-end">
            <PulseDot />
          </div>
        </div>
      </Artifact>

      {/* ── 3. FORMULAIRE INCOMPLET — small, high opacity ── */}
      <Artifact x={0} y={212} delay={1.12} rotate={-2.2} floatY={4} floatDuration={4.3} zIndex={5} opacity={1}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            ...cardBase,
            background: 'rgba(13,17,22,0.98)',
            border: '1px solid rgba(255,255,255,0.08)',
            width: 194,
          }}
        >
          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <FileText className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9.5px] font-semibold text-white leading-tight">Nouveau formulaire</div>
            <div className="text-[8px] text-zinc-400 leading-tight">Rénovation complète</div>
          </div>
          <StatusPill text="Incomplet" color="#f59e0b" bg="rgba(245,158,11,0.12)" />
        </div>
      </Artifact>

      {/* ── 4. PHOTO — thumbnail style, deeper in space ── */}
      <Artifact x={20} y={302} delay={1.22} rotate={1.4} floatY={6} floatDuration={3.5} zIndex={2} opacity={0.82} scale={0.95}>
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
          style={{
            ...cardBase,
            background: 'rgba(11,15,20,0.92)',
            border: '1px solid rgba(255,255,255,0.06)',
            width: 186,
          }}
        >
          {/* Simulated photo thumbnail */}
          <div
            className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1e3a2f 0%, #132518 100%)', border: '1px solid rgba(34,197,94,0.1)' }}
          >
            <Camera className="h-3.5 w-3.5" style={{ color: '#4ade80', opacity: 0.7 }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-medium text-white leading-tight">Photo reçue</div>
            <div className="text-[7.5px] text-zinc-500 leading-tight truncate">Maison complète.jpg · 12:14</div>
          </div>
        </div>
      </Artifact>

      {/* ── 5. NOTE COLLANTE — rotated, handwriting feel ── */}
      <Artifact x={8} y={384} delay={1.32} rotate={-3.5} floatY={4} floatDuration={4.6} zIndex={3} opacity={0.92}>
        <div
          className="px-3 py-2.5 rounded-xl"
          style={{
            ...cardBase,
            background: 'rgba(38,33,12,0.97)',
            border: '1px solid rgba(245,198,11,0.18)',
            width: 170,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <StickyNote className="h-3 w-3 flex-shrink-0" style={{ color: '#facc15', opacity: 0.7 }} />
            <span className="text-[8px] font-medium" style={{ color: '#facc15', opacity: 0.8 }}>Note</span>
          </div>
          <div className="text-[8.5px] leading-[1.5]" style={{ color: 'rgba(250,220,100,0.85)', fontStyle: 'italic' }}>
            M. Laurent<br />Rappeler demain<br />+ voir pour devis urgent
          </div>
        </div>
      </Artifact>

      {/* ── 6. QUESTION CLIENT — overlapping, mid-low ── */}
      <Artifact x={72} y={430} delay={1.38} rotate={2.4} floatY={5} floatDuration={4.0} zIndex={2} opacity={0.9} scale={0.96}>
        <div
          className="flex flex-col gap-1 px-3 py-2.5 rounded-xl"
          style={{
            ...cardBase,
            background: 'rgba(12,16,21,0.94)',
            border: '1px solid rgba(255,255,255,0.07)',
            width: 176,
          }}
        >
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3 w-3 flex-shrink-0" style={{ color: '#60a5fa', opacity: 0.8 }} />
            <span className="text-[8px] font-medium text-zinc-400">Question client</span>
            <span className="ml-auto text-[7px] text-zinc-600">09:11</span>
          </div>
          <div className="text-[8.5px] text-zinc-300 leading-[1.45]">
            &ldquo;Pouvez-vous intervenir la semaine prochaine&nbsp;?&rdquo;
          </div>
        </div>
      </Artifact>

      {/* ── 7. DEVIS EN RETARD — bottom, strong ── */}
      <Artifact x={6} y={476} delay={1.44} rotate={1.0} floatY={5} floatDuration={3.9} zIndex={4} opacity={1}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            ...cardBase,
            background: 'rgba(14,10,10,0.98)',
            border: '1px solid rgba(239,68,68,0.18)',
            width: 206,
          }}
        >
          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <Bell className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9.5px] font-semibold text-white leading-tight">Devis à relancer</div>
            <div className="text-[8px] text-zinc-400 leading-tight">Devis N°2024-0478</div>
          </div>
          <StatusPill text="En retard" color="#f87171" bg="rgba(239,68,68,0.12)" />
        </div>
      </Artifact>

    </div>
  );
}

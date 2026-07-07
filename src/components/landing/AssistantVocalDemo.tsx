'use client';

/*
 * Extracted from `src/components/KadriaPages.tsx` (section "Deux assistants.
 * Une seule plateforme.") so this exact voice-call demonstration can be
 * reused by `RequestTransformationSection.tsx` without duplicating the
 * logic/markup. Relies on the shared CSS classes defined in
 * `ANIMATION_STYLES` (kr-voice-card, kr-assistant-scroll,
 * kr-assistant-msg-in, kr-assistant-user-in, voice-bar, kr-badge-pulse, ...),
 * which is injected once per page via `<style>{ANIMATION_STYLES}</style>` in
 * `KadriaPages.tsx`. Both this component and the original bento card share
 * that same page, so the styles are available regardless of which file
 * renders the markup.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CheckCircle } from 'lucide-react';

export const VOICE_MESSAGES: { role: 'client' | 'kadria'; text: string; delay: number }[] = [
  { role: 'client', text: "Bonjour, je cherche un électricien pour installer une borne de recharge.", delay: 0 },
  { role: 'kadria', text: "Bonjour ! Je suis l'assistant de AD Elec. Je peux vous aider. Avez-vous déjà un emplacement prévu pour la borne ?", delay: 2000 },
  { role: 'client', text: "Oui, dans mon garage.", delay: 4500 },
  { role: 'kadria', text: "Parfait. Votre tableau électrique est-il récent ? Et quel est votre budget approximatif ?", delay: 6000 },
  { role: 'client', text: "Tableau de 2018, budget autour de 1 500€.", delay: 8500 },
  { role: 'kadria', text: "Très bien. Je note votre demande et transmets un dossier complet à notre artisan. Vous recevrez un devis sous 24h.", delay: 10500 },
  { role: 'client', text: "Merci beaucoup !", delay: 13000 },
  { role: 'kadria', text: "Avec plaisir. Bonne journée ! 🎯 Dossier créé — Score 91%", delay: 14500 },
];

export const VOICE_WAVE_BARS: { duration: number; delay: number; accent: boolean }[] = [
  { duration: 600, delay: 0, accent: true },
  { duration: 700, delay: 100, accent: true },
  { duration: 500, delay: 50, accent: true },
  { duration: 650, delay: 150, accent: true },
  { duration: 550, delay: 75, accent: true },
  { duration: 750, delay: 200, accent: false },
  { duration: 625, delay: 125, accent: false },
  { duration: 575, delay: 175, accent: false },
];

export interface VoiceAssistantCardProps {
  reduceMotion: boolean;
  /** Defaults to the original AD Elec demo used in the "Deux assistants" section. */
  messages?: { role: 'client' | 'kadria'; text: string; delay: number }[];
  headerTitle?: string;
  headerSubtitle?: string;
  /** Score badge label. Defaults to "Score: 91%" (original section). */
  scoreLabel?: string;
  /** Optional "collected fields" summary shown once the call transcript has finished. Absent by default. */
  collectedSummary?: string;
}

export function VoiceAssistantCard({
  reduceMotion,
  messages = VOICE_MESSAGES,
  headerTitle = 'Kadria Vocal',
  headerSubtitle = 'Appel en cours...',
  scoreLabel = 'Score: 91%',
  collectedSummary,
}: VoiceAssistantCardProps) {
  const [visibleMessages, setVisibleMessages] = useState(reduceMotion ? messages.length : 0);
  const [elapsed, setElapsed] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setVisibleMessages(0);

      messages.forEach((msg, i) => {
        timeouts.push(setTimeout(() => setVisibleMessages(i + 1), msg.delay));
      });

      const lastDelay = messages[messages.length - 1].delay;
      timeouts.push(setTimeout(run, lastDelay + 3000));
    };

    run();

    return () => timeouts.forEach(clearTimeout);
  }, [reduceMotion, messages]);

  useEffect(() => {
    if (reduceMotion) return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [reduceMotion]);

  useEffect(() => {
    if (!transcriptRef.current) return;
    transcriptRef.current.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [visibleMessages, reduceMotion]);

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const isComplete = visibleMessages >= messages.length;

  return (
    <div className="kr-voice-card flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 py-3.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#60a5fa] text-sm font-extrabold text-white">
          K
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--text-1)]">{headerTitle}</p>
          <p className="text-xs text-[var(--text-2)]">{headerSubtitle}</p>
        </div>
        <span className="ml-auto font-mono text-xs font-semibold text-[var(--accent)]">
          {minutes}:{seconds}
        </span>
        <span className="kr-badge-pulse flex-shrink-0 rounded-full border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.15)] px-2 py-0.5 text-xs font-bold text-[#dc2626]">
          🔴 EN DIRECT
        </span>
      </div>

      <div className="flex h-12 flex-shrink-0 items-end justify-center gap-1 border-b border-[var(--border)] px-4 py-4">
        {VOICE_WAVE_BARS.map((bar, i) => (
          <div
            key={i}
            className={`w-1 rounded-sm ${reduceMotion ? '' : 'voice-bar'} ${bar.accent ? 'bg-[var(--accent)]' : 'bg-[rgba(96,165,250,0.4)]'}`}
            style={
              reduceMotion
                ? { height: '22px' }
                : ({ '--duration': `${bar.duration}ms`, '--delay': `${bar.delay}ms` } as CSSProperties)
            }
          />
        ))}
      </div>

      <div ref={transcriptRef} className="kr-assistant-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3.5">
        {messages.slice(0, visibleMessages).map((msg, i) =>
          msg.role === 'client' ? (
            <div
              key={i}
              className={`max-w-[85%] self-start rounded-[10px] rounded-bl-[2px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-2)] ${
                reduceMotion ? '' : 'kr-assistant-msg-in'
              }`}
            >
              <span className="text-[10px] text-[var(--text-3)]">👤 Client · </span>
              {msg.text}
            </div>
          ) : (
            <div
              key={i}
              className={`max-w-[85%] self-end rounded-[10px] rounded-br-[2px] border border-[rgba(96,165,250,0.25)] bg-[rgba(96,165,250,0.12)] px-3 py-2 text-xs text-[var(--text-1)] ${
                reduceMotion ? '' : 'kr-assistant-user-in'
              }`}
            >
              <span className="text-[10px] text-[#60a5fa]">🤖 Kadria · </span>
              {msg.text}
            </div>
          )
        )}
      </div>

      {collectedSummary && (
        <div
          className={`flex flex-shrink-0 items-center gap-2 border-t border-[var(--border)] px-3.5 py-2 text-[11px] text-[var(--text-2)] transition-opacity duration-500 ${
            isComplete ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CheckCircle size={12} color="var(--accent)" style={{ flexShrink: 0 }} />
          <span>{collectedSummary}</span>
        </div>
      )}

      <div className="flex flex-shrink-0 items-center justify-between border-t border-[var(--border)] px-3.5 py-2.5" style={{ background: 'rgba(34,197,94,0.06)' }}>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
          <CheckCircle size={12} color="var(--accent)" />
          Dossier créé automatiquement
        </div>
        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-[var(--bg)]">
          {scoreLabel}
        </span>
      </div>
    </div>
  );
}

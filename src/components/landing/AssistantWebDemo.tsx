'use client';

/*
 * Extracted from `src/components/KadriaPages.tsx` (section "Deux assistants.
 * Une seule plateforme.") so this exact chat demonstration can be reused by
 * `RequestTransformationSection.tsx` without duplicating the logic/markup.
 * Relies on the shared CSS classes defined in `ANIMATION_STYLES`
 * (kr-assistant-card, kr-assistant-scroll, kr-assistant-msg-in,
 * kr-assistant-user-in, kr-badge-pulse, kr-typing-dot, ...), which is
 * injected once per page via `<style>{ANIMATION_STYLES}</style>` in
 * `KadriaPages.tsx`. Both this component and the original bento card share
 * that same page, so the styles are available regardless of which file
 * renders the markup.
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Image as ImageIcon, Send } from 'lucide-react';

export interface ChatMsg {
  role: 'assistant' | 'user';
  text: string;
  delay: number;
  isPhotoConfirmation?: boolean;
  isContactCard?: boolean;
  isSuccess?: boolean;
  /** Optional explicit contact-card fields. When absent, the card falls
   * back to the original hardcoded demo contact ("Jean Dupont" / original
   * section), preserving that section's exact behavior. */
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export const CHAT_MESSAGES: ChatMsg[] = [
  {
    role: 'assistant',
    text: "Bonjour, je suis l'assistant Kadria 👋\nPour commencer, quel type de travaux souhaitez-vous réaliser ?",
    delay: 0,
  },
  { role: 'user', text: 'Entretien', delay: 1800 },
  {
    role: 'assistant',
    text: "Vous souhaitez donc réaliser des travaux d'entretien. Pouvez-vous préciser quel type d'entretien vous envisagez ? Par exemple, s'agit-il de l'entretien d'un jardin, d'une maison, ou d'un autre domaine ?",
    delay: 3200,
  },
  { role: 'user', text: 'Massif floral', delay: 5800 },
  {
    role: 'assistant',
    text: "Vous souhaitez donc réaliser l'entretien d'un massif floral. Pour mieux comprendre votre besoin, pouvez-vous me dire quelle est la surface approximative de ce massif ?",
    delay: 7400,
  },
  { role: 'user', text: '30m²', delay: 9800 },
  {
    role: 'assistant',
    text: "Merci pour cette précision. Pour l'entretien de votre massif floral de 30m², avez-vous des préférences concernant les types de plantes ou de fleurs à entretenir ?",
    delay: 11200,
  },
  {
    role: 'user',
    text: 'Plantes méditerranéennes (palmiers, yuccas, cordylines, lauriers roses)',
    delay: 13800,
  },
  {
    role: 'assistant',
    text: "Vous souhaitez entretenir des plantes méditerranéennes comme des palmiers, yuccas, cordylines et lauriers roses. Avez-vous besoin de services spécifiques, comme la taille, le désherbage ou l'ajout de terreau ?",
    delay: 16400,
  },
  { role: 'user', text: 'Taille, nettoyage', delay: 19200 },
  {
    role: 'assistant',
    text: 'Vous avez besoin de services de taille et de nettoyage pour votre massif floral. Quel est votre budget estimatif pour ces travaux ?',
    delay: 20800,
  },
  { role: 'user', text: 'Moins de 2 000 €', delay: 23000 },
  {
    role: 'assistant',
    text: "Pour mieux préparer le devis, pouvez-vous estimer plus précisément ? Par exemple, avez-vous une idée si c'est plutôt autour de 200-500 €, 500-1 000 € ou 1 000-2 000 € ?",
    delay: 24600,
  },
  { role: 'user', text: '200 – 500 €', delay: 27400 },
  {
    role: 'assistant',
    text: "Vous envisagez un budget compris entre 200 et 500 € pour l'entretien de votre massif floral. Souhaitez-vous réaliser ce projet rapidement ou plutôt dans les prochains mois ?",
    delay: 28800,
  },
  { role: 'user', text: 'Sous 1 mois', delay: 31600 },
  {
    role: 'assistant',
    text: 'Vous souhaitez réaliser ce projet sous 1 mois. Où en êtes-vous dans votre réflexion ?',
    delay: 33000,
  },
  { role: 'user', text: 'Prêt à démarrer', delay: 34800 },
  {
    role: 'assistant',
    text: "Avez-vous des photos, plans ou documents à joindre pour aider l'artisan à préparer son devis ? 📎",
    delay: 36200,
  },
  {
    role: 'user',
    text: "J'ai ajouté 1 photo(s) à mon dossier.",
    delay: 38800,
    isPhotoConfirmation: true,
  },
  {
    role: 'assistant',
    text: "Quelle est l'adresse du chantier concerné ? 📍",
    delay: 40200,
  },
  { role: 'user', text: '40 Rue Bonnat 31400 Toulouse', delay: 42600 },
  {
    role: 'assistant',
    text: 'Pour finaliser votre dossier, renseignez vos coordonnées ci-dessous.',
    delay: 44000,
  },
  {
    role: 'user',
    text: 'Prénom: Jean, Nom: Dupont, Téléphone: 06 06 77 88 99, Email: jean@jean.com',
    delay: 47000,
    isContactCard: true,
  },
  {
    role: 'assistant',
    text: "Parfait ! Vérifiez votre dossier et validez l'envoi. 📋",
    delay: 48600,
  },
  {
    role: 'assistant',
    text: "✅ Votre dossier a bien été transmis (réf. #PEIUET). L'artisan va vous recontacter très prochainement. Merci !",
    delay: 50400,
    isSuccess: true,
  },
];

export interface AssistantWebChatCardProps {
  reduceMotion: boolean;
  /** Defaults to the original massif floral demo used in the "Deux assistants" section. */
  messages?: ChatMsg[];
  /** Header title. Defaults to "Kadria" (original section). */
  headerTitle?: string;
  /** Header subtitle. Defaults to "Assistant en ligne" (original section). */
  headerSubtitle?: string;
  /** Optional "collected fields" summary shown under the conversation once it has run. Absent by default (original section doesn't show it). */
  collectedFields?: { label: string; value: string }[];
  /**
   * 'auto' (default) preserves the original behavior: native vertical
   * scrolling (`overflow-y-auto`) that auto-scrolls to the newest message —
   * this is what the "Deux assistants. Une seule plateforme." section uses
   * and must keep using.
   * 'translate' is opt-in: native vertical scroll (`overflow-y-auto`) with
   * the scrollbar hidden via CSS, so the container height never changes
   * and there is no visible scrollbar. Auto-scrolls to the newest message
   * only while the user is near the bottom (`isUserNearBottom`), so a
   * manual scroll up to read history is never forced back down. Used by
   * `RequestTransformationSection.tsx`.
   */
  scrollMode?: 'auto' | 'translate';
}

export function AssistantWebChatCard({
  reduceMotion,
  messages = CHAT_MESSAGES,
  headerTitle = 'Kadria',
  headerSubtitle = 'Assistant en ligne',
  collectedFields,
  scrollMode = 'auto',
}: AssistantWebChatCardProps) {
  const [visibleMessages, setVisibleMessages] = useState(reduceMotion ? messages.length : 0);
  const [typingBeforeIndex, setTypingBeforeIndex] = useState<number | null>(null);
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setVisibleMessages(0);
      setTypingBeforeIndex(null);

      messages.forEach((msg, i) => {
        if (msg.role === 'assistant' && !msg.isSuccess) {
          timeouts.push(setTimeout(() => setTypingBeforeIndex(i), Math.max(msg.delay - 900, 0)));
        }
        timeouts.push(setTimeout(() => {
          setTypingBeforeIndex(null);
          setVisibleMessages(i + 1);
        }, msg.delay));
      });

      const lastDelay = messages[messages.length - 1].delay;
      timeouts.push(setTimeout(run, lastDelay + 4000));
    };

    run();

    return () => timeouts.forEach(clearTimeout);
  }, [reduceMotion, messages]);

  useEffect(() => {
    if (scrollMode !== 'auto') return;
    if (!chatRef.current) return;
    chatRef.current.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [visibleMessages, typingBeforeIndex, reduceMotion, scrollMode]);

  // Native scroll mode: track whether the user is near the bottom so we
  // only auto-scroll to the newest message when they haven't scrolled up
  // to read the history.
  const NEAR_BOTTOM_THRESHOLD = 48;
  useEffect(() => {
    if (scrollMode !== 'translate') return;
    const el = chatRef.current;
    if (!el) return;
    const handleScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - NEAR_BOTTOM_THRESHOLD;
      setIsUserNearBottom(nearBottom);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollMode]);

  useEffect(() => {
    if (scrollMode !== 'translate') return;
    if (!chatRef.current) return;
    if (!isUserNearBottom) return;
    chatRef.current.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [visibleMessages, typingBeforeIndex, scrollMode, reduceMotion, isUserNearBottom]);

  // Dynamic progress bar
  const lastIdx = visibleMessages > 0 ? visibleMessages - 1 : 0;
  const quarter = Math.max(1, Math.ceil(messages.length / 4));
  const step = lastIdx <= quarter ? 1 : lastIdx <= quarter * 2 ? 2 : lastIdx <= quarter * 3 ? 3 : 4;
  const stepLabels = ['', 'Projet', 'Détails', 'Précisions', 'Validation'];
  const stepWidths = ['', '25%', '50%', '75%', '100%'];
  const isComplete = visibleMessages >= messages.length;

  return (
    <div className="kr-assistant-card flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 py-3.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-extrabold text-[var(--bg)]">
          K
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--text-1)]">{headerTitle}</p>
          <p className="text-xs text-[var(--text-2)]">{headerSubtitle}</p>
        </div>
        <span className="kr-badge-pulse ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" />
      </div>

      <div className="flex-shrink-0 border-b border-[var(--border)] px-4 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-2)]">Votre projet</span>
          <span className="text-xs text-[var(--text-2)]">Étape {step} sur 4 — {stepLabels[step]}</span>
        </div>
        <div className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: stepWidths[step], transition: 'width 400ms ease' }}
          />
        </div>
      </div>

      <div
        ref={chatRef}
        className={`kr-assistant-scroll relative min-h-0 flex-1 overflow-y-auto px-3.5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          scrollMode === 'translate' ? 'flex flex-col' : 'flex flex-col gap-3'
        }`}
        style={scrollMode === 'translate' ? { overscrollBehavior: 'contain', touchAction: 'pan-y' } : undefined}
      >
        {scrollMode === 'translate' && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6"
              style={{ background: 'linear-gradient(to bottom, var(--bg-elevated, #12161c), transparent)' }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6"
              style={{ background: 'linear-gradient(to top, var(--bg-elevated, #12161c), transparent)' }}
            />
          </>
        )}
        <div ref={innerRef} className="flex flex-col gap-3">
        {messages.slice(0, visibleMessages).map((msg, i) => {
          const animClass = reduceMotion ? '' : msg.role === 'assistant' ? 'kr-assistant-msg-in' : 'kr-assistant-user-in';

          if (msg.isSuccess) {
            return (
              <div
                key={i}
                className={`self-start ${animClass}`}
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  maxWidth: '90%',
                }}
              >
                <CheckCircle size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '12px', lineHeight: 1.4 }}>
                  {msg.text}
                </span>
              </div>
            );
          }

          if (msg.isContactCard) {
            const contactName = msg.contactName ?? 'Jean Dupont';
            const contactPhone = msg.contactPhone ?? '06 06 77 88 99';
            const contactEmail = msg.contactEmail ?? 'jean@jean.com';
            return (
              <div
                key={i}
                className={`self-end ${animClass}`}
                style={{
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  maxWidth: '80%',
                }}
              >
                <span className="text-[11px] font-bold">{contactName}</span>
                <span className="text-[11px]">Tél : {contactPhone}</span>
                <span className="text-[11px]">{contactEmail}</span>
              </div>
            );
          }

          if (msg.isPhotoConfirmation) {
            return (
              <div
                key={i}
                className={`max-w-[80%] self-end rounded-[12px] rounded-br-[2px] bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-[var(--bg)] ${animClass}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <div style={{
                  width: '24px', height: '24px', borderRadius: '4px', flexShrink: 0,
                  background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ImageIcon size={12} color="rgba(0,0,0,0.55)" />
                </div>
                {msg.text}
              </div>
            );
          }

          if (msg.role === 'assistant') {
            return (
              <div
                key={i}
                className={`max-w-[85%] self-start whitespace-pre-line rounded-[12px] rounded-bl-[2px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--text-1)] ${animClass}`}
              >
                {msg.text}
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`max-w-[75%] self-end rounded-[12px] rounded-br-[2px] bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-[var(--bg)] ${animClass}`}
            >
              {msg.text}
            </div>
          );
        })}
        {typingBeforeIndex !== null && (
          <div className="flex w-fit items-center gap-1 self-start rounded-[12px] bg-[var(--bg-elevated)] px-3 py-2">
            <span className="kr-typing-dot h-2 w-2 rounded-full bg-[var(--text-3)] [animation-delay:0ms]" />
            <span className="kr-typing-dot h-2 w-2 rounded-full bg-[var(--text-3)] [animation-delay:150ms]" />
            <span className="kr-typing-dot h-2 w-2 rounded-full bg-[var(--text-3)] [animation-delay:300ms]" />
          </div>
        )}
        </div>
      </div>

      {collectedFields && (
        <div
          className="flex flex-shrink-0 flex-wrap gap-1.5 border-t border-[var(--border)] px-3.5 py-2.5"
          style={{ background: 'rgba(34,197,94,0.06)' }}
        >
          <div
            className={`flex flex-wrap gap-1.5 transition-opacity duration-500 ${
              isComplete ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {collectedFields.map((f) => (
              <span
                key={f.label}
                className="rounded-full border border-[var(--accent-border)] bg-[rgba(34,197,94,0.1)] px-2 py-1 text-[10px] font-medium text-[var(--accent)]"
              >
                {f.label}: <span className="font-semibold">{f.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-shrink-0 items-center gap-2 border-t border-[var(--border)] px-3.5 py-2.5">
        <div className="flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5">
          <span className="text-xs text-[var(--text-3)]">Écrivez votre message...</span>
        </div>
        <div className="flex flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[var(--bg)]">
          <Send size={14} />
        </div>
      </div>
    </div>
  );
}

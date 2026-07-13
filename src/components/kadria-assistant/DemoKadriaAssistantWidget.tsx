'use client';

// Version demo, sobre et 100% locale, de l'Assistant Kadria interne
// (KadriaAssistantWidget.tsx). Meme bulle flottante / tiroir visuel, mais
// assistant scenarise : uniquement des boutons de questions pre-etablies,
// aucune saisie libre, aucune vraie requete OpenAI, aucune action reelle.
// Les questions/reponses sont definies dans src/lib/demo-assistant-data.ts.

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Copy, Check } from 'lucide-react';
import { useDemoMode } from '@/src/contexts/DemoModeContext';
import {
  getDemoAssistantAnswer,
  getDemoAssistantSuggestions,
  type DemoAssistantButton,
  type DemoAssistantPageContext,
} from '@/src/lib/demo-assistant-data';

interface DemoChatMessage {
  role: 'user' | 'assistant';
  content: string;
  copyMessage?: string;
}

function resolvePageContext(pathname: string | null): DemoAssistantPageContext {
  if (!pathname) return 'dashboard';
  if (pathname.includes('/demo-dashboard/projet/')) return 'project';
  if (pathname.startsWith('/demo-parametres')) return 'settings';
  return 'dashboard';
}

export default function DemoKadriaAssistantWidget() {
  const pathname = usePathname();
  const { projects } = useDemoMode();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DemoChatMessage[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const projectIdMatch = pathname?.match(/\/demo-dashboard\/projet\/([^/]+)/);
  const pageContext = resolvePageContext(pathname);
  const currentProject = useMemo(
    () => (projectIdMatch ? projects.find((p) => p.id === projectIdMatch[1]) : undefined),
    [projectIdMatch, projects],
  );

  const suggestions: DemoAssistantButton[] = useMemo(
    () => getDemoAssistantSuggestions(pageContext, currentProject),
    [pageContext, currentProject],
  );

  const [nextSuggestions, setNextSuggestions] = useState<DemoAssistantButton[]>([]);

  const ask = (button: DemoAssistantButton) => {
    const answer = getDemoAssistantAnswer(button.id, { project: currentProject, projects });
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: button.label },
      { role: 'assistant', content: answer.text, copyMessage: answer.copyMessage },
    ]);
    setNextSuggestions(answer.followUps);
  };

  const copyMessage = async (text: string, index: number) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // ignore : simulation uniquement, pas d'action reelle requise
    }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1600);
  };

  const activeSuggestions = messages.length === 0 ? suggestions : nextSuggestions;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'assistant Kadria (démo)"
        title="Assistant Kadria (démo)"
        className="group fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[rgba(34,197,94,0.25)] bg-[#101113] text-[#f8fafc] shadow-[0_6px_20px_rgba(0,0,0,0.45),0_0_0_1px_rgba(34,197,94,0.08)] outline-none transition-all duration-200 hover:scale-105 sm:right-6 sm:bottom-6 sm:h-14 sm:w-14"
        style={{ display: open ? 'none' : undefined }}
      >
        <MessageCircle className="relative h-6 w-6 text-[#22c55e] sm:h-6 sm:w-6" strokeWidth={2} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-[#050505] sm:hidden" />
          <div className="absolute inset-0 hidden bg-black/60 sm:block" onClick={() => setOpen(false)} aria-hidden="true" />
          <section className="relative ml-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-[#050505] text-[#f8fafc] shadow-2xl sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:border-l sm:border-[rgba(255,255,255,0.08)]">
            <header
              className="flex shrink-0 items-start justify-between gap-2 border-b border-[rgba(255,255,255,0.08)] bg-[#101113] px-4 py-3"
              style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[19px] font-semibold leading-tight text-[#f8fafc]">Assistant Kadria</h2>
                  <span className="rounded-full border border-[#22c55e]/40 bg-[#22c55e]/10 px-2 py-0.5 text-[11px] font-medium text-[#22c55e]">
                    Démo guidée
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-[#9ca3af]">
                  Choisissez une question pour voir comment l’assistant peut vous aider au quotidien.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9ca3af] hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <p className="mb-3 rounded-xl border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.06)] px-3 py-2 text-[13px] leading-snug text-[#d1fae5]">
                  Mode démo : choisissez une question pour voir comment l’assistant peut vous aider sur vos dossiers.
                </p>
              )}

              <div className="flex flex-col gap-3">
                {messages.map((message, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <div
                      className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                        message.role === 'user'
                          ? 'ml-auto bg-[#22c55e] text-[#05130d]'
                          : 'mr-auto border border-[rgba(255,255,255,0.08)] bg-[#101113] text-[#f8fafc]'
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.role === 'assistant' && message.copyMessage && (
                      <button
                        type="button"
                        onClick={() => copyMessage(message.copyMessage as string, index)}
                        className="mr-auto flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] bg-[#101113] px-2.5 py-1 text-[12px] text-[#9ca3af] hover:border-[#22c55e]/40 hover:text-[#22c55e]"
                      >
                        {copiedIndex === index ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedIndex === index ? 'Copié' : 'Copier le message'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {activeSuggestions.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-[13px] text-[#9ca3af]">Questions utiles :</p>
                  {activeSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => ask(suggestion)}
                      className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#101113] px-3 py-2 text-left text-[13px] text-[#f8fafc] hover:border-[#22c55e]/40"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              )}

              {activeSuggestions.length === 0 && messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setNextSuggestions(suggestions)}
                  className="mt-4 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#101113] px-3 py-2 text-left text-[13px] text-[#f8fafc] hover:border-[#22c55e]/40"
                >
                  Voir d’autres questions
                </button>
              )}
            </div>

            <div
              className="flex shrink-0 flex-col gap-1 border-t border-[rgba(255,255,255,0.08)] bg-[#101113] px-4 py-3"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              <div className="cursor-not-allowed rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[12px] leading-snug text-[#6b7280]">
                Saisie libre indisponible dans cette démo
              </div>
              <p className="px-1 text-[11px] leading-snug text-[#6b7280]">
                Dans cette démonstration, les réponses sont préparées à l’avance. En production,
                l’assistant répond à vos questions sur vos propres dossiers.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

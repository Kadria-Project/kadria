'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/src/components/ui/button';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Rendu markdown minimal et sûr (V1) : pas de dangerouslySetInnerHTML.
// Supporte **gras** inline et lignes commençant par "- " ou "* " comme
// puces. Tout le reste reste du texte brut échappé par React (donc déjà
// sûr, aucune sanitization HTML nécessaire ici). Une vraie librairie
// markdown (ex react-markdown) pourra remplacer ce rendu dans un lot futur
// si des besoins plus riches (titres, liens, code) apparaissent.
function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

function renderMessageContent(content: string) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="ml-4 list-disc space-y-0.5">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-li-${i}`)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((line, idx) => {
    const bulletMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1]);
      return;
    }
    flushList(`list-${idx}`);
    if (line.trim().length === 0) {
      blocks.push(<div key={`br-${idx}`} className="h-2" />);
    } else {
      blocks.push(
        <p key={`p-${idx}`} className="leading-relaxed">
          {renderInline(line, `p-${idx}`)}
        </p>
      );
    }
  });
  flushList('list-end');

  return <div className="space-y-1">{blocks}</div>;
}

const QUICK_STARTS = [
  'Que dois-je configurer en priorité ?',
  'Explique-moi mon centre de progression',
  'Comment améliorer mon profil métier ?',
  'Comment fonctionne la marque blanche ?',
  'Comment mieux utiliser mes devis ?',
  "Quelles fonctionnalités de mon plan je n'utilise pas ?",
];

// Assistant interne pour l'artisan connecté (distinct du widget prospect
// existant et de l'assistant vocal Vapi). Strictement lecture seule côté
// produit : ce composant ne fait qu'afficher la conversation et appeler
// l'API serveur dédiée /api/kadria-assistant/chat.
export default function KadriaAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) {
      // Mount off-screen first, then slide in on the next frame.
      const raf = requestAnimationFrame(() => setDrawerVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setDrawerVisible(false);
  }, [open]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/kadria-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        setError(data?.error || "Une erreur est survenue. Merci de réessayer.");
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      setError('Connexion impossible. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      {/* Mobile : languette latérale sur le bord droit, hors bottom nav. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'Assistant Kadria"
        className="fixed right-0 top-1/2 z-[9999] flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-[var(--accent-border)] bg-[var(--bg-elevated)] px-2 py-3 text-[11px] font-semibold text-[var(--text-1)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-[var(--bg-hover)] sm:hidden"
        style={{ display: open ? 'none' : 'flex' }}
      >
        <span aria-hidden className="text-[var(--accent)]">💬</span>
        <span>Aide</span>
      </button>

      {/* Desktop : bouton flottant bas-droite inchangé. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'Assistant Kadria"
        className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--bg-elevated)] px-5 py-3 text-sm font-semibold text-[var(--text-1)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-[var(--bg-hover)] transition-opacity sm:flex"
        style={{ display: open ? 'none' : undefined }}
      >
        <span aria-hidden className="text-[var(--accent)]">💬</span>
        <span>Besoin d&apos;aide ?</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999]">
          <div
            className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${drawerVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={`absolute right-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#050505] shadow-2xl transition-transform duration-200 ease-out sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:border-l sm:border-[var(--border)] ${
              drawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
          <header className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-1)]">Assistant Kadria</h2>
              <p className="mt-0.5 text-xs text-[var(--text-2)]">
                Posez vos questions sur votre configuration, vos devis, votre profil métier ou vos prochaines étapes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer l'Assistant Kadria"
              className="shrink-0 rounded-md p-1 text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
            >
              ✕
            </button>
          </header>

          <main ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#050505] px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-[var(--text-1)]">
                    Comment puis-je vous aider ?
                  </h3>
                  <p className="text-xs leading-relaxed text-[var(--text-2)]">
                    Je peux vous expliquer Kadria, analyser votre configuration et vous proposer
                    les prochaines étapes.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {QUICK_STARTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-left text-xs leading-snug text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div className="pb-1">
                <button
                  type="button"
                  onClick={() => setSuggestionsCollapsed((v) => !v)}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-[11px] text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
                >
                  Suggestions {suggestionsCollapsed ? '▾' : '▴'}
                </button>
                {!suggestionsCollapsed && (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {QUICK_STARTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-left text-xs leading-snug text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-[var(--accent)] text-[#05130d]'
                      : 'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-1)]'
                  }`}
                >
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-2)]">
                  <span>Kadria réfléchit</span>
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--text-2)] [animation-delay:-0.3s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--text-2)] [animation-delay:-0.15s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--text-2)]" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
          </main>

          <form
            onSubmit={handleSubmit}
            className="flex shrink-0 items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-3"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez votre question..."
              disabled={loading}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              Envoyer
            </Button>
          </form>
          </aside>
        </div>
      )}
    </>
  );
}

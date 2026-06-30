'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/src/components/ui/button';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_STARTS = [
  'Comment configurer mon widget ?',
  'Comment fonctionne le Centre de progression ?',
  'Quelles sont mes prochaines étapes ?',
  'Comment activer la marque blanche ?',
  'Comment fonctionnent mes devis ?',
  'Quel est mon profil métier actuel ?',
];

// Assistant interne pour l'artisan connecté (distinct du widget prospect
// existant et de l'assistant vocal Vapi). Strictement lecture seule côté
// produit : ce composant ne fait qu'afficher la conversation et appeler
// l'API serveur dédiée /api/kadria-assistant/chat.
export default function KadriaAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'Assistant Kadria"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#05130d] shadow-lg hover:opacity-90 transition-opacity"
        style={{ display: open ? 'none' : 'flex' }}
      >
        <span aria-hidden>💬</span>
        Besoin d&apos;aide ?
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 right-0 left-0 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl sm:bottom-6 sm:right-6 sm:left-auto sm:h-[560px] sm:max-h-[calc(100vh-3rem)] sm:w-[380px] sm:max-w-[calc(100vw-2rem)] sm:rounded-xl"
          >
          <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
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
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[var(--bg-elevated)] px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--text-2)]">Suggestions pour démarrer :</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_STARTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-[var(--accent)] text-[#05130d]'
                      : 'bg-[var(--bg-hover)] text-[var(--text-1)]'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-2)]">
                  L&apos;assistant réfléchit…
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

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
          </div>
        </div>
      )}
    </>
  );
}

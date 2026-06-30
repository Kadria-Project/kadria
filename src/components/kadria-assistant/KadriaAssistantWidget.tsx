'use client';

import { useEffect, useRef, useState } from 'react';

interface NavigationAction {
  label: string;
  href: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  navigationActions?: NavigationAction[];
}

interface AssistantUsage {
  used: number;
  limit: number;
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
      <ul key={key} className="ml-4 list-disc space-y-1.5 marker:text-[#22c55e]">
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

const SESSION_STORAGE_KEY = 'kadria-assistant-session';
const MAX_PERSISTED_MESSAGES = 20;

interface PersistedSession {
  messages: ChatMessage[];
  usage: AssistantUsage | null;
}

function loadPersistedSession(): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return {
      messages: parsed.messages,
      usage: parsed.usage ?? null,
    };
  } catch {
    return null;
  }
}

function savePersistedSession(session: PersistedSession) {
  if (typeof window === 'undefined') return;
  try {
    const trimmedMessages = session.messages.slice(-MAX_PERSISTED_MESSAGES);
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ messages: trimmedMessages, usage: session.usage })
    );
  } catch {
    // Storage failure (quota, private mode, etc.) must never crash the app.
  }
}

const QUICK_STARTS = [
  'Que dois-je configurer en priorité ?',
  'Aide-moi à améliorer mon profil métier',
  'Quelles prestations devrais-je proposer ?',
  'Aide-moi à définir mes tarifs indicatifs',
  'Comment améliorer mon centre de progression ?',
  'Comment mieux convertir mes prospects ?',
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
  const [usage, setUsage] = useState<AssistantUsage | null>(null);
  const [quotaReached, setQuotaReached] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charge la conversation persistée (sessionStorage) au montage, pour
  // permettre de la retrouver après une navigation déclenchée par une
  // navigationAction. Aucune donnée n'est stockée côté serveur.
  useEffect(() => {
    const persisted = loadPersistedSession();
    if (persisted) {
      if (persisted.messages.length > 0) setMessages(persisted.messages);
      if (persisted.usage) setUsage(persisted.usage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde la conversation à chaque changement pertinent.
  useEffect(() => {
    if (messages.length === 0 && !usage) return;
    savePersistedSession({ messages, usage });
  }, [messages, usage]);

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

  // Bloque le scroll de la page derrière le drawer pendant qu'il est ouvert,
  // et restaure la valeur précédente à la fermeture/démontage.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || loading || quotaReached) return;

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

      if (data?.usage) {
        setUsage(data.usage);
      }

      if (!res.ok || !data?.success) {
        if (data?.code === 'ASSISTANT_QUOTA_REACHED') {
          setQuotaReached(true);
          setError('Vous avez atteint votre limite mensuelle de questions Assistant Kadria.');
          return;
        }
        setError(data?.error || "Une erreur est survenue. Merci de réessayer.");
        return;
      }

      const navigationActions: NavigationAction[] | undefined = Array.isArray(data?.navigationActions)
        ? data.navigationActions.filter(
            (a: unknown): a is NavigationAction =>
              Boolean(a) && typeof (a as NavigationAction).label === 'string' && typeof (a as NavigationAction).href === 'string'
          )
        : undefined;

      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, navigationActions }]);
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

  // Réduit le drawer sans effacer la conversation : elle reste en mémoire
  // (state) et en sessionStorage, et la bulle redevient visible.
  function minimize() {
    setOpen(false);
  }

  // Au clic sur une navigationAction : la conversation est déjà persistée
  // via l'effet ci-dessus à chaque changement de messages/usage, donc on
  // s'assure juste qu'elle est à jour avant de fermer le drawer puis de
  // naviguer. Le drawer se ferme (équivalent à "réduire"), la bulle reste
  // visible après navigation, et la conversation est restaurée au retour.
  function handleNavigationClick() {
    savePersistedSession({ messages, usage });
    setOpen(false);
  }

  return (
    <>
      {/* Onglet latéral discret, identique mobile/desktop : accroché au bord
          droit, n'empiète ni sur la bottom nav ni sur le bouton "+". */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'Assistant Kadria"
        className="fixed right-0 top-[55%] z-50 -translate-y-1/2 rounded-l-xl border border-r-0 border-[rgba(255,255,255,0.10)] bg-[#17181b] px-3 py-4 text-xs font-medium text-[#f8fafc] shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-colors hover:border-[#22c55e]/30 hover:text-[#22c55e] active:scale-[0.98]"
        style={{ display: open ? 'none' : undefined }}
      >
        <span className="block whitespace-nowrap [writing-mode:vertical-rl]">Aide 💬</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999]">
          {/* Fond opaque plein écran sur mobile (pas de scrim transparent comme fond principal). */}
          <div className="absolute inset-0 bg-[#050505] sm:hidden" />
          <div
            className={`absolute inset-0 hidden bg-black/60 transition-opacity duration-200 sm:block ${drawerVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <section
            className={`relative ml-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-hidden overflow-x-hidden bg-[#050505] text-[#f8fafc] shadow-2xl transition-transform duration-200 ease-out sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:border-l sm:border-[rgba(255,255,255,0.08)] ${
              drawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
          <header className="flex shrink-0 items-start justify-between gap-2 border-b border-[rgba(255,255,255,0.08)] bg-[#101113] px-4 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
            <div className="min-w-0">
              <h2 className="text-[19px] font-semibold leading-tight text-[#f8fafc]">Assistant Kadria</h2>
              <p className="mt-0.5 text-[13px] leading-snug text-[#9ca3af]">
                Configuration, devis, profil métier et prochaines étapes.
              </p>
              {usage && (
                <p className="mt-1 text-[11px] leading-snug text-[#6b7280]">
                  {usage.used} / {usage.limit} questions ce mois-ci
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-start gap-1">
              <button
                type="button"
                onClick={minimize}
                aria-label="Réduire l'Assistant Kadria"
                title="Réduire"
                className="rounded-md p-1.5 text-[#9ca3af] transition-colors hover:bg-white/5 hover:text-[#f8fafc]"
              >
                —
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer l'Assistant Kadria"
                className="rounded-md p-1.5 text-[#9ca3af] transition-colors hover:bg-white/5 hover:text-[#f8fafc]"
              >
                ✕
              </button>
            </div>
          </header>

          <main ref={scrollRef} className="min-h-0 w-full max-w-full flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#050505] px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-[#f8fafc]">
                    Comment puis-je vous aider ?
                  </h3>
                  <p className="text-xs leading-relaxed text-[#9ca3af]">
                    Je peux vous expliquer Kadria, analyser votre configuration et vous proposer
                    les prochaines étapes.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {QUICK_STARTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="group flex w-full items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#17181b] px-3.5 py-3 text-left text-xs leading-snug text-[#f8fafc] transition-colors hover:border-[#22c55e]/30 hover:bg-[#22c55e]/10 active:bg-[#22c55e]/15"
                    >
                      <span>{q}</span>
                      <span aria-hidden className="shrink-0 text-[#9ca3af] transition-colors group-hover:text-[#22c55e]">
                        →
                      </span>
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
                  className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[#17181b] px-3 py-1 text-[11px] text-[#9ca3af] transition-colors hover:bg-white/5 hover:text-[#f8fafc]"
                >
                  Suggestions {suggestionsCollapsed ? '▾' : '▴'}
                </button>
                {!suggestionsCollapsed && (
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {QUICK_STARTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="group flex w-full items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#17181b] px-3.5 py-2.5 text-left text-xs leading-snug text-[#f8fafc] transition-colors hover:border-[#22c55e]/30 hover:bg-[#22c55e]/10 active:bg-[#22c55e]/15"
                      >
                        <span>{q}</span>
                        <span aria-hidden className="shrink-0 text-[#9ca3af] transition-colors group-hover:text-[#22c55e]">
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#22c55e] text-[#05130d]'
                      : 'border border-[rgba(255,255,255,0.08)] bg-[#17181b] text-[#f8fafc]'
                  }`}
                >
                  {renderMessageContent(m.content)}
                </div>
                {m.role === 'assistant' && m.navigationActions && m.navigationActions.length > 0 && (
                  <div className="mt-1.5 flex max-w-[85%] flex-wrap gap-1.5">
                    {m.navigationActions.map((action, ai) => (
                      <a
                        key={ai}
                        href={action.href}
                        onClick={handleNavigationClick}
                        className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1.5 text-xs font-medium text-[#22c55e] transition-colors hover:bg-[#22c55e]/20"
                      >
                        {action.label} →
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#17181b] px-3.5 py-2.5 text-sm text-[#9ca3af]">
                  <span>Kadria réfléchit</span>
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 animate-bounce rounded-full bg-[#22c55e] [animation-delay:-0.3s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-[#22c55e] [animation-delay:-0.15s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-[#22c55e]" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
                {quotaReached && usage?.limit === 50 && (
                  <p className="mt-1.5 text-xs text-red-300/90">
                    Passez au plan Performance pour bénéficier de 200 questions par mois.
                  </p>
                )}
              </div>
            )}
          </main>

          <footer
            className="w-full max-w-full shrink-0 border-t border-[rgba(255,255,255,0.08)] bg-[#101113] px-3 py-3"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <form onSubmit={handleSubmit} className="flex w-full max-w-full items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={quotaReached ? 'Limite mensuelle atteinte' : 'Écrivez votre question...'}
                disabled={loading || quotaReached}
                className="min-w-0 flex-1 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#17181b] px-4 py-2.5 text-sm text-[#f8fafc] placeholder:text-[#9ca3af] outline-none transition-colors focus:border-[#22c55e]/50 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || quotaReached || !input.trim()}
                aria-label="Envoyer le message"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold transition-colors ${
                  input.trim() && !loading && !quotaReached
                    ? 'bg-[#22c55e] text-[#05130d] hover:bg-[#34d979]'
                    : 'bg-[#1f2937] text-[#6b7280]'
                }`}
              >
                <span aria-hidden>➤</span>
              </button>
            </form>
          </footer>
          </section>
        </div>
      )}
    </>
  );
}

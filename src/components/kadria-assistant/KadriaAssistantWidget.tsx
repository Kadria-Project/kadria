'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useKadriaPageContext } from '@/src/components/kadria-assistant/KadriaPageContext';
import type { AssistantPageContext } from '@/src/lib/kadria-assistant/page-context';

interface NavigationAction {
  label: string;
  href: string;
}

interface ProposedAction {
  type: string;
  label: string;
  summary: string;
  payload: Record<string, unknown>;
  requiresConfirmation: true;
  oldValueHint?: string;
  newValueHint?: string;
  projectLabel?: string;
}

type ProposedActionState = 'pending' | 'applying' | 'applied' | 'cancelled' | 'error';

interface TodayActionCard {
  id: string;
  type: 'quote_followup' | 'review_request' | 'priority_project' | 'configuration' | 'delivery_error' | 'tasks_overview';
  priority: 'high' | 'medium' | 'low';
  status: 'ready' | 'blocked';
  title: string;
  description: string;
  reason: string;
  projectId?: string;
  devisId?: string;
  clientName?: string;
  eligible?: boolean;
  googleReviewConfigured?: boolean;
  clientEmailPresent?: boolean;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  navigationActions?: NavigationAction[];
  todayActions?: TodayActionCard[];
  proposedAction?: ProposedAction;
  proposedActionState?: ProposedActionState;
  proposedActionError?: string;
}

interface AssistantUsage {
  used: number;
  limit: number;
}

function getQuickStarts(pageContext: AssistantPageContext) {
  if (pageContext.pageType === 'project_detail') {
    return [
      'Resumer ce dossier',
      'Que faire maintenant ?',
      'Quels elements manquent ?',
      'Preparer une relance',
      'Quel est le statut du devis ?',
      "L'acompte est-il paye ?",
    ];
  }

  if (pageContext.pageType === 'settings') {
    return [
      'Comment configurer mon widget ?',
      'Pourquoi mes quotas sont limites ?',
      'Que dois-je configurer en priorite ?',
      'Comment ameliorer mon profil metier ?',
    ];
  }

  return [
    "Que dois-je faire aujourd'hui ?",
    'Quels dossiers traiter en priorite ?',
    'Quels devis sont a relancer ?',
    "Quels projets n'ont pas encore de rendez-vous ?",
    'Aide-moi a ameliorer mon profil metier',
    'Comment mieux convertir mes prospects ?',
  ];
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

function isGoogleReviewPrompt(value: string) {
  return /google review|avis google|demande d'avis|lien google review/i.test(value.trim());
}

function isQuoteFollowupPrompt(value: string) {
  return /relance|relancer/i.test(value.trim()) && /devis/i.test(value.trim());
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
  "Que dois-je faire aujourd'hui ?",
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
  const { pageContext } = useKadriaPageContext();
  const [open, setOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [usage, setUsage] = useState<AssistantUsage | null>(null);
  const [quotaReached, setQuotaReached] = useState(false);
  const [todayActions, setTodayActions] = useState<TodayActionCard[]>([]);
  const [todayActionsLoading, setTodayActionsLoading] = useState(false);
  const [todayActionsError, setTodayActionsError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const quickStarts = getQuickStarts(pageContext);

  function isTodayActionsPrompt(value: string) {
    return /actions du jour|que dois-je faire aujourd'hui|que faire aujourd'hui|priorites du jour/i.test(value.trim());
  }

  async function loadTodayActions() {
    setTodayActionsLoading(true);
    setTodayActionsError(null);

    try {
      const res = await fetch('/api/kadria-assistant/today-actions');
      const data = await res.json();

      if (!res.ok || !data?.success) {
        setTodayActions([]);
        setTodayActionsError(data?.error || 'Impossible de charger les actions du jour pour le moment.');
        return [];
      }

      const actions = Array.isArray(data.actions) ? data.actions : [];
      setTodayActions(actions);
      return actions as TodayActionCard[];
    } catch {
      setTodayActions([]);
      setTodayActionsError('Impossible de charger les actions du jour pour le moment.');
      return [];
    } finally {
      setTodayActionsLoading(false);
    }
  }

  async function appendTodayActionsMessage(userLabel: string) {
    const trimmed = userLabel.trim();
    if (!trimmed || loading || quotaReached) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError(null);

    const actions = await loadTodayActions();
    const assistantMessage: ChatMessage = actions.length > 0
      ? {
          role: 'assistant',
          content: 'Voici vos priorites du jour. Je vous propose de commencer par ces actions :',
          todayActions: actions,
        }
      : {
          role: 'assistant',
          content: "Tout est a jour pour le moment. Je n'ai pas detecte d'action urgente.",
        };

    setMessages((prev) => [...prev, assistantMessage]);
  }

  async function appendQuoteFollowupMessage(userLabel: string) {
    const trimmed = userLabel.trim();
    if (!trimmed || loading || quotaReached) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError(null);

    const actions = await loadTodayActions();
    const followups = actions.filter((action) => action.type === 'quote_followup');
    const assistantMessage: ChatMessage = followups.length > 0
      ? {
          role: 'assistant',
          content: `J'ai trouve ${followups.length} devis a examiner. Je peux vous ouvrir les dossiers concernes. Chaque relance demandera une confirmation avant envoi.`,
          todayActions: followups,
        }
      : {
          role: 'assistant',
          content: "Je n'ai pas detecte de devis a relancer pour le moment.",
        };

    setMessages((prev) => [...prev, assistantMessage]);
  }

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

  useEffect(() => {
    if (!open) return;
    void loadTodayActions();
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

    if (isTodayActionsPrompt(trimmed)) {
      await appendTodayActionsMessage(trimmed);
      return;
    }

    if (isQuoteFollowupPrompt(trimmed)) {
      await appendQuoteFollowupMessage(trimmed);
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/kadria-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, pageContext }),
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

      const proposedAction: ProposedAction | undefined =
        data?.proposedAction && typeof data.proposedAction === 'object' && typeof data.proposedAction.type === 'string'
          ? (data.proposedAction as ProposedAction)
          : undefined;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          navigationActions,
          proposedAction,
          proposedActionState: proposedAction ? 'pending' : undefined,
        },
      ]);
    } catch {
      setError('Connexion impossible. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  }

  async function applyProposedAction(messageIndex: number) {
    const target = messages[messageIndex];
    if (!target?.proposedAction) return;

    setMessages((prev) =>
      prev.map((m, i) => (i === messageIndex ? { ...m, proposedActionState: 'applying', proposedActionError: undefined } : m))
    );

    try {
      const res = await fetch('/api/assistant/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: target.proposedAction.type,
          payload: target.proposedAction.payload,
          summary: target.proposedAction.summary,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === messageIndex
              ? { ...m, proposedActionState: 'error', proposedActionError: data?.error || "L'action n'a pas pu être appliquée." }
              : m
          )
        );
        return;
      }

      setMessages((prev) => prev.map((m, i) => (i === messageIndex ? { ...m, proposedActionState: 'applied' } : m)));
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === messageIndex ? { ...m, proposedActionState: 'error', proposedActionError: 'Connexion impossible. Réessayez.' } : m
        )
      );
    }
  }

  function cancelProposedAction(messageIndex: number) {
    setMessages((prev) => prev.map((m, i) => (i === messageIndex ? { ...m, proposedActionState: 'cancelled' } : m)));
  }

  function renderProposedActionCard(message: ChatMessage, messageIndex: number) {
    const action = message.proposedAction;
    if (!action) return null;
    const state = message.proposedActionState || 'pending';

    return (
      <div className="mt-2 w-full max-w-[85%] rounded-2xl border border-[#22c55e]/20 bg-[#101113] px-3.5 py-3">
        <p className="text-sm font-semibold text-[#f8fafc]">{action.label}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-[#cbd5e1]">{action.summary}</p>
        {(action.oldValueHint !== undefined || action.newValueHint !== undefined) && (
          <div className="mt-2 space-y-1 rounded-xl bg-[#17181b] px-3 py-2 text-[11px] leading-relaxed">
            {action.oldValueHint !== undefined && (
              <p className="text-[#9ca3af]">
                Actuel : <span className="text-[#cbd5e1]">{action.oldValueHint || '(vide)'}</span>
              </p>
            )}
            {action.newValueHint !== undefined && (
              <p className="text-[#9ca3af]">
                Nouveau : <span className="text-[#22c55e]">{action.newValueHint}</span>
              </p>
            )}
          </div>
        )}
        {action.projectLabel && (
          <p className="mt-1.5 text-[11px] text-[#9ca3af]">Dossier concerné : {action.projectLabel}</p>
        )}

        {state === 'pending' && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => applyProposedAction(messageIndex)}
              className="rounded-full bg-[#22c55e] px-3.5 py-1.5 text-xs font-semibold text-[#05130d] transition-colors hover:bg-[#34d979]"
            >
              Appliquer
            </button>
            <button
              type="button"
              onClick={() => cancelProposedAction(messageIndex)}
              className="rounded-full border border-[rgba(255,255,255,0.12)] px-3.5 py-1.5 text-xs font-semibold text-[#f8fafc] transition-colors hover:bg-white/5"
            >
              Annuler
            </button>
          </div>
        )}

        {state === 'applying' && (
          <p className="mt-3 text-xs text-[#9ca3af]">Application en cours...</p>
        )}

        {state === 'applied' && (
          <p className="mt-3 text-xs font-medium text-[#22c55e]">Action appliquée avec succès.</p>
        )}

        {state === 'cancelled' && (
          <p className="mt-3 text-xs text-[#9ca3af]">Action annulée. Rien n&apos;a été modifié.</p>
        )}

        {state === 'error' && (
          <div className="mt-3">
            <p className="text-xs text-red-400">{message.proposedActionError || "Une erreur est survenue."}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => applyProposedAction(messageIndex)}
                className="rounded-full bg-[#22c55e] px-3.5 py-1.5 text-xs font-semibold text-[#05130d] transition-colors hover:bg-[#34d979]"
              >
                Réessayer
              </button>
              <button
                type="button"
                onClick={() => cancelProposedAction(messageIndex)}
                className="rounded-full border border-[rgba(255,255,255,0.12)] px-3.5 py-1.5 text-xs font-semibold text-[#f8fafc] transition-colors hover:bg-white/5"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    );
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

  function renderTodayActionCards(items: TodayActionCard[]) {
    return (
      <div className="mt-2 flex flex-col gap-2.5">
        {items.map((action) => (
          <div
            key={action.id}
            className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111317] px-3.5 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#f8fafc]">{action.title}</p>
                {(action.clientName || action.projectId) && (
                  <p className="mt-1 text-xs text-[#9ca3af]">{action.clientName || 'Dossier prioritaire'}</p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  action.priority === 'high'
                    ? 'bg-red-500/15 text-red-300'
                    : action.priority === 'medium'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-slate-500/15 text-slate-300'
                }`}
              >
                {action.status === 'blocked'
                  ? 'Bloque'
                  : action.priority === 'high'
                    ? 'Priorite haute'
                    : action.priority === 'medium'
                      ? 'A faire'
                      : 'Info'}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#cbd5e1]">{action.description}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#94a3b8]">{action.reason}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={action.primaryActionHref}
                onClick={handleNavigationClick}
                className="rounded-full bg-[#22c55e] px-3 py-1.5 text-xs font-semibold text-[#05130d] transition-colors hover:bg-[#34d979]"
              >
                {action.primaryActionLabel}
              </a>
              {action.secondaryActionLabel && action.secondaryActionHref && (
                <a
                  href={action.secondaryActionHref}
                  onClick={handleNavigationClick}
                  className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-xs font-semibold text-[#f8fafc] transition-colors hover:bg-white/5"
                >
                  {action.secondaryActionLabel}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Bulle flottante bottom-right, identique mobile/desktop (Intercom/Crisp-style).
          Positionnée au-dessus de la bottom nav et du bouton "+" sur mobile. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'assistant Kadria"
        title="Assistant Kadria"
        className="group fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[rgba(34,197,94,0.25)] bg-[#101113] text-[#f8fafc] shadow-[0_6px_20px_rgba(0,0,0,0.45),0_0_0_1px_rgba(34,197,94,0.08)] outline-none transition-all duration-200 hover:scale-105 hover:border-[#22c55e]/50 hover:shadow-[0_8px_28px_rgba(0,0,0,0.5),0_0_24px_rgba(34,197,94,0.35)] focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] active:scale-95 sm:right-6 sm:bottom-6 sm:h-14 sm:w-14"
        style={{ display: open ? 'none' : undefined }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-[#22c55e] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-20"
        />
        <MessageCircle className="relative h-6 w-6 text-[#22c55e] sm:h-6 sm:w-6" strokeWidth={2} />
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
                <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0f1115] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#f8fafc]">Actions du jour</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#9ca3af]">
                        Les priorites utiles detectees sur votre compte, sans action automatique ni envoi silencieux.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => appendTodayActionsMessage("Que dois-je faire aujourd'hui ?")}
                      className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1.5 text-[11px] font-semibold text-[#22c55e] transition-colors hover:bg-[#22c55e]/20"
                    >
                      Voir
                    </button>
                  </div>
                  {todayActionsLoading && (
                    <p className="mt-3 text-xs text-[#9ca3af]">Chargement des actions du jour...</p>
                  )}
                  {!todayActionsLoading && todayActionsError && (
                    <p className="mt-3 text-xs text-red-300">{todayActionsError}</p>
                  )}
                  {!todayActionsLoading && !todayActionsError && todayActions.length === 0 && (
                    <p className="mt-3 text-xs text-[#cbd5e1]">
                      Tout est a jour pour le moment. Je n&apos;ai pas detecte d&apos;action urgente.
                    </p>
                  )}
                  {!todayActionsLoading && !todayActionsError && todayActions.length > 0 && renderTodayActionCards(todayActions.slice(0, 3))}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {quickStarts.map((q) => (
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
                    {quickStarts.map((q) => (
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
                {m.role === 'assistant' && m.todayActions && m.todayActions.length > 0 && (
                  <div className="w-full max-w-[85%]">
                    {renderTodayActionCards(m.todayActions)}
                  </div>
                )}
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
                {m.role === 'assistant' && renderProposedActionCard(m, i)}
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

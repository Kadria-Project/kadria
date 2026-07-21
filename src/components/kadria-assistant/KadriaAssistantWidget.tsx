'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import type { AssistantPageContext } from '@/src/lib/kadria-assistant/page-context';
import { toKadriaAssistantPageContext } from '@/src/lib/kadria-assistant/page-context';
import { getCollaboratorSuggestions, type CollaboratorSuggestion } from '@/src/lib/kadria-assistant/collaborator-suggestions';
import type { AssistantIntent } from '@/src/lib/kadria-assistant/assistant-intents';
import type { AssistantResponse, AssistantResponseDetail, AssistantSuggestion } from '@/src/lib/kadria-assistant/assistant-response';
import type { AssistantUiAction } from '@/src/lib/kadria-assistant/assistant-action-contract';
import {
  belongsToCollaboratorContext,
  canApplyCollaboratorResult,
  createCollaboratorContextSnapshot,
  getCollaboratorContextKey,
  type CollaboratorContextSnapshot,
} from '@/src/lib/kadria-assistant/collaborator-context';
import { useShellContext } from '@/src/components/workspace/shell/ShellContextProvider';
import { SHELL_OVERLAY_LAYERS } from '@/src/components/workspace/shell/shell-context';

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
  level?: 'critical' | 'important' | 'useful' | 'informational';
  observedFact?: string;
  priorityReason?: string;
  isPrimary?: boolean;
  status: 'ready' | 'blocked' | 'observed';
  lifecycle: 'proposed' | 'viewed' | 'executed' | 'observing' | 'resolved' | 'follow_up_required' | 'inconclusive' | 'blocked' | 'obsolete';
  expectedObservation: string;
  executionEvidence?: string;
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
  context?: CollaboratorContextSnapshot;
  source?: 'chat' | 'today-actions';
  navigationActions?: NavigationAction[];
  assistantTitle?: string;
  assistantDetails?: AssistantResponseDetail[];
  assistantSuggestions?: AssistantSuggestion[];
  assistantEvidence?: AssistantResponse['evidence'];
  assistantFollowUp?: string;
  todayActions?: TodayActionCard[];
  proposedAction?: ProposedAction;
  proposedActionState?: ProposedActionState;
  proposedActionError?: string;
}

interface AssistantUsage {
  used: number;
  limit: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getQuickStarts(pageContext: AssistantPageContext) {
  if (pageContext.pageType === 'project_detail') {
    return [
      'Résumer ce dossier',
      'Que me conseillez-vous maintenant ?',
      'Que manque-t-il dans ce dossier ?',
      'Préparer une relance',
      'Où en est le devis ?',
      "L'acompte a-t-il été réglé ?",
    ];
  }

  if (pageContext.pageType === 'settings') {
    return [
      'Que dois-je régler en priorité ?',
      'Comment améliorer mon profil métier ?',
      'Comment ajouter mon lien d’avis Google ?',
      'Comment connecter Google Agenda ?',
    ];
  }

  return [
    'Voir ce que je dois faire aujourd’hui',
    'Voir les dossiers à traiter',
    'Voir les devis à relancer',
    'Voir les dossiers sans rendez-vous',
    'Aidez-moi à améliorer mon profil métier',
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

function isQuoteFollowupPrompt(value: string) {
  return /relance|relancer/i.test(value.trim()) && /devis/i.test(value.trim());
}

const SESSION_STORAGE_KEY = 'kadria-assistant-session';
const MAX_PERSISTED_MESSAGES = 20;

interface PersistedSession {
  version?: 2;
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
      JSON.stringify({ version: 2, messages: trimmedMessages, usage: session.usage })
    );
  } catch {
    // Storage failure (quota, private mode, etc.) must never crash the app.
  }
}

// Assistant interne pour l'artisan connecté (distinct du widget prospect
// existant et de l'assistant vocal Vapi). Strictement lecture seule côté
// produit : ce composant ne fait qu'afficher la conversation et appeler
// l'API serveur dédiée /api/kadria-assistant/chat.
export default function KadriaAssistantWidget() {
  const { shellContext, collaboratorOpen: open, collaboratorOptions, closeCollaborator, openQuickCreate, openGlobalSearch } = useShellContext();
  const pageContext = useMemo(() => toKadriaAssistantPageContext(shellContext), [shellContext]);
  const contextKey = useMemo(() => getCollaboratorContextKey(shellContext), [shellContext]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [integratedDesktop, setIntegratedDesktop] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadPersistedSession()?.messages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<AssistantUsage | null>(() => loadPersistedSession()?.usage || null);
  const [quotaReached, setQuotaReached] = useState(false);
  const [todayActions, setTodayActions] = useState<TodayActionCard[]>([]);
  const [todayActionsLoading, setTodayActionsLoading] = useState(false);
  const [todayActionsError, setTodayActionsError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeContextKeyRef = useRef(contextKey);
  const requestAbortRef = useRef<AbortController | null>(null);
  const contextualSuggestions = useMemo(() => getCollaboratorSuggestions(shellContext), [shellContext]);
  const visibleSuggestions = contextualSuggestions.slice(0, 4);
  const contextTitle = shellContext.entity?.label || ({ dashboard: 'Accueil', calendar: 'Agenda', performance: 'Performance', settings: 'Paramètres', tasks: 'À faire', tracking: 'Suivi', clients: 'Clients', project: 'Projet', resources: 'Ressources', unknown: 'Kadria' } as const)[shellContext.pageType];

  const activeMessages = useMemo(
    () => messages.map((message, index) => ({ message, index })).filter(({ message }) => belongsToCollaboratorContext(message, contextKey)),
    [contextKey, messages],
  );
  const hasArchivedMessages = messages.some((message) => !belongsToCollaboratorContext(message, contextKey));

  function isTodayActionsPrompt(value: string) {
    return /actions du jour|que dois-je faire aujourd'hui|que faire aujourd'hui|priorites du jour|voir ce que je dois faire aujourd’hui|voir ce que je dois faire aujourd'hui/i.test(value.trim());
  }

  async function loadTodayActions(requestContextKey = contextKey) {
    setTodayActionsLoading(true);
    setTodayActionsError(null);

    try {
      const res = await fetch('/api/kadria-assistant/today-actions');
      const data = await res.json();

      if (activeContextKeyRef.current !== requestContextKey) return [];
      if (!res.ok || !data?.success) {
        setTodayActions([]);
        setTodayActionsError(data?.error || 'Je n’ai pas pu récupérer vos priorités pour le moment.');
        return [];
      }

      const actions = Array.isArray(data.actions) ? data.actions : [];
      setTodayActions(actions);
      return actions as TodayActionCard[];
    } catch {
      if (activeContextKeyRef.current !== requestContextKey) return [];
      setTodayActions([]);
      setTodayActionsError('Je n’ai pas pu récupérer vos priorités pour le moment.');
      return [];
    } finally {
      if (activeContextKeyRef.current === requestContextKey) setTodayActionsLoading(false);
    }
  }

  async function appendTodayActionsMessage(userLabel: string) {
    const trimmed = userLabel.trim();
    if (!trimmed || loading || quotaReached) return;
    const messageContext = createCollaboratorContextSnapshot(shellContext);

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed, context: messageContext, source: 'today-actions' }];
    setMessages(nextMessages);
    setInput('');
    setError(null);

    const actions = await loadTodayActions(messageContext.contextKey);
    if (activeContextKeyRef.current !== messageContext.contextKey) return;
    const assistantMessage: ChatMessage = actions.length > 0
      ? {
          role: 'assistant',
          content: 'Voici ce qui mérite votre attention aujourd’hui. Je vous conseille de commencer par là :',
           context: messageContext,
           source: 'today-actions',
           todayActions: actions,
        }
      : {
          role: 'assistant',
          context: messageContext,
          source: 'today-actions',
          content: "Rien d'urgent pour le moment.",
        };

    setMessages((prev) => [...prev, assistantMessage]);
  }

  async function appendQuoteFollowupMessage(userLabel: string) {
    const trimmed = userLabel.trim();
    if (!trimmed || loading || quotaReached) return;
    const messageContext = createCollaboratorContextSnapshot(shellContext);

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed, context: messageContext, source: 'today-actions' }];
    setMessages(nextMessages);
    setInput('');
    setError(null);

    const actions = await loadTodayActions(messageContext.contextKey);
    if (activeContextKeyRef.current !== messageContext.contextKey) return;
    const followups = actions.filter((action) => action.type === 'quote_followup');
    const assistantMessage: ChatMessage = followups.length > 0
      ? {
          role: 'assistant',
          content: `J’ai trouvé ${followups.length} devis à relancer. Je peux vous ouvrir les bons dossiers, et chaque relance vous demandera votre accord avant l’envoi.`,
           context: messageContext,
           source: 'today-actions',
           todayActions: followups,
         }
       : {
          role: 'assistant',
          context: messageContext,
          source: 'today-actions',
          content: 'Aucun devis à relancer pour le moment.',
        };

    setMessages((prev) => [...prev, assistantMessage]);
  }

  // Charge la conversation persistée (sessionStorage) au montage, pour
  // permettre de la retrouver après une navigation déclenchée par une
  // navigationAction. Aucune donnée n'est stockée côté serveur.
  // Sauvegarde la conversation à chaque changement pertinent.
  useEffect(() => {
    if (messages.length === 0 && !usage) return;
    savePersistedSession({ messages, usage });
  }, [messages, usage]);

  useEffect(() => {
    if (activeContextKeyRef.current === contextKey) return;
    activeContextKeyRef.current = contextKey;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    setLoading(false);
    setError(null);
    setInput('');
    setTodayActions([]);
    setTodayActionsError(null);
    setTodayActionsLoading(false);
  }, [contextKey]);

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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => { void loadTodayActions(); }, 0);
    return () => window.clearTimeout(timer);
    // The request must run only when the panel or canonical context changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, open]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');
    const update = () => setIntegratedDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open || !collaboratorOptions?.prompt) return;
    void sendMessage(collaboratorOptions.prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collaboratorOptions?.prompt]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeCollaborator() };
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    window.addEventListener('keydown', onKeyDown);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('keydown', onKeyDown) };
  }, [closeCollaborator, open]);

  // Bloque le scroll de la page derrière le drawer pendant qu'il est ouvert,
  // et restaure la valeur précédente à la fermeture/démontage.
  useEffect(() => {
    if (!open || integratedDesktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [integratedDesktop, open]);

  async function sendMessage(content: string, intent?: AssistantIntent) {
    const trimmed = content.trim();
    if (!trimmed || loading || quotaReached) return;
    const messageContext = createCollaboratorContextSnapshot(shellContext);
    const requestContextKey = messageContext.contextKey;
    const requestPageContext = pageContext;

    if (isTodayActionsPrompt(trimmed)) {
      await appendTodayActionsMessage(trimmed);
      return;
    }

    if (isQuoteFollowupPrompt(trimmed)) {
      await appendQuoteFollowupMessage(trimmed);
      return;
    }

    const nextMessages: ChatMessage[] = [...activeMessages.map(({ message }) => message), { role: 'user', content: trimmed, context: messageContext, source: 'chat' }];
    setMessages((prev) => [...prev, nextMessages[nextMessages.length - 1]]);
    setInput('');
    setError(null);
    setLoading(true);
    const requestAbort = new AbortController();
    requestAbortRef.current?.abort();
    requestAbortRef.current = requestAbort;

    try {
      const res = await fetch('/api/kadria-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent ? { kind: 'intent', intent, context: requestPageContext, messages: nextMessages } : { messages: nextMessages, pageContext: requestPageContext }),
        signal: requestAbort.signal,
      });
      const data = await res.json();

      if (!canApplyCollaboratorResult(requestContextKey, activeContextKeyRef.current, requestAbort.signal.aborted)) return;

      if (data?.usage) {
        setUsage(data.usage);
      }

      if (!res.ok || !data?.success) {
        if (data?.code === 'ASSISTANT_QUOTA_REACHED') {
          setQuotaReached(true);
          setError("Vous avez atteint votre limite mensuelle avec l'assistant Kadria.");
          return;
        }
        setError(data?.error || 'Je n’ai pas pu répondre pour le moment. Réessayez dans un instant.');
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
      const assistantDetails: AssistantResponseDetail[] | undefined = Array.isArray(data?.assistantResponse?.details)
        ? data.assistantResponse.details.filter(
            (detail: unknown): detail is AssistantResponseDetail => Boolean(detail) && typeof (detail as AssistantResponseDetail).id === 'string' && typeof (detail as AssistantResponseDetail).label === 'string'
          ).slice(0, 5)
        : undefined;
      const assistantSuggestions: AssistantSuggestion[] | undefined = Array.isArray(data?.assistantResponse?.suggestions)
        ? data.assistantResponse.suggestions as AssistantSuggestion[]
        : undefined;
      const assistantTitle = typeof data?.assistantResponse?.title === 'string' ? data.assistantResponse.title : undefined;
      const assistantEvidence: AssistantResponse['evidence'] | undefined = data?.assistantResponse?.evidence && typeof data.assistantResponse.evidence === 'object'
        && typeof data.assistantResponse.evidence.level === 'string'
        ? data.assistantResponse.evidence as AssistantResponse['evidence']
        : undefined;
      const assistantFollowUp = typeof data?.assistantResponse?.followUp === 'string' ? data.assistantResponse.followUp : undefined;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          context: messageContext,
          source: 'chat',
          content: data.answer,
          navigationActions,
          assistantTitle,
          assistantDetails,
          assistantSuggestions,
          assistantEvidence,
          assistantFollowUp,
          proposedAction,
          proposedActionState: proposedAction ? 'pending' : undefined,
        },
      ]);
    } catch {
      if (!canApplyCollaboratorResult(requestContextKey, activeContextKeyRef.current, requestAbort.signal.aborted)) return;
      setError('La connexion semble interrompue. Réessayez dans un instant.');
    } finally {
      if (activeContextKeyRef.current === requestContextKey && requestAbortRef.current === requestAbort) {
        requestAbortRef.current = null;
        setLoading(false);
      }
    }
  }

  function runSuggestion(suggestion: CollaboratorSuggestion) {
    if (suggestion.kind === 'prompt') { void sendMessage(suggestion.prompt); return; }
    if (suggestion.kind === 'intent') { void sendMessage(suggestion.label, suggestion.intent); return; }
    if (suggestion.kind === 'search') { closeCollaborator(); openGlobalSearch(); return; }
    if (suggestion.kind === 'quick-create') { closeCollaborator(); openQuickCreate(); return; }
    closeCollaborator();
    window.location.assign(suggestion.href);
  }

  function runAssistantAction(action: AssistantUiAction) {
    if (action.kind === 'intent') { void sendMessage(action.label, action.intent); return; }
    if (action.kind === 'navigate') { handleNavigationClick(); window.location.assign(action.href); return; }
    if (action.kind === 'quick-create') { closeCollaborator(); openQuickCreate(); return; }
    if (action.kind === 'search') { closeCollaborator(); openGlobalSearch(); return; }
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
              ? { ...m, proposedActionState: 'error', proposedActionError: data?.error || 'Je n’ai pas pu terminer cette action.' }
              : m
          )
        );
        return;
      }

      setMessages((prev) => prev.map((m, i) => (i === messageIndex ? { ...m, proposedActionState: 'applied' } : m)));
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === messageIndex ? { ...m, proposedActionState: 'error', proposedActionError: 'La connexion semble interrompue. Réessayez dans un instant.' } : m
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
                Aujourd’hui : <span className="text-[#cbd5e1]">{action.oldValueHint || '(vide)'}</span>
              </p>
            )}
            {action.newValueHint !== undefined && (
              <p className="text-[#9ca3af]">
                Après changement : <span className="text-[#22c55e]">{action.newValueHint}</span>
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
              Faire maintenant
            </button>
            <button
              type="button"
              onClick={() => cancelProposedAction(messageIndex)}
              className="rounded-full border border-[rgba(255,255,255,0.12)] px-3.5 py-1.5 text-xs font-semibold text-[#f8fafc] transition-colors hover:bg-white/5"
            >
              Ne rien faire
            </button>
          </div>
        )}

        {state === 'applying' && (
          <p className="mt-3 text-xs text-[#9ca3af]">Je prépare cette action...</p>
        )}

        {state === 'applied' && (
          <p className="mt-3 text-xs font-medium text-[#22c55e]">C’est fait.</p>
        )}

        {state === 'cancelled' && (
          <p className="mt-3 text-xs text-[#9ca3af]">Très bien. Rien n&apos;a été modifié.</p>
        )}

        {state === 'error' && (
          <div className="mt-3">
            <p className="text-xs text-red-400">{message.proposedActionError || 'Je n’ai pas pu terminer cette action.'}</p>
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
                Ne rien faire
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
    closeCollaborator();
  }

  // Au clic sur une navigationAction : la conversation est déjà persistée
  // via l'effet ci-dessus à chaque changement de messages/usage, donc on
  // s'assure juste qu'elle est à jour avant de fermer le drawer puis de
  // naviguer. Le drawer se ferme (équivalent à "réduire"), la bulle reste
  // visible après navigation, et la conversation est restaurée au retour.
  function handleNavigationClick() {
    savePersistedSession({ messages, usage });
    closeCollaborator();
  }

  function handleTodayActionNavigation(event: React.MouseEvent<HTMLAnchorElement>, action: TodayActionCard) {
    event.preventDefault();
    const next = messages.map((message) => {
      if (!message.todayActions) return message;
      return {
        ...message,
        todayActions: message.todayActions.map((candidate) => candidate.id === action.id && candidate.lifecycle === 'proposed'
          ? {
              ...candidate,
              lifecycle: 'viewed' as const,
              description: 'Dossier ouvert. Cette consultation ne confirme pas encore la réalisation de l’action.',
              expectedObservation: 'Je vérifierai une preuve enregistrée après votre confirmation dans le dossier.',
            }
          : candidate),
      };
    });
    setMessages(next);
    savePersistedSession({ messages: next, usage });
    closeCollaborator();
    window.location.assign(action.primaryActionHref);
  }

  function clearConversation() {
    if (!window.confirm('Effacer cette conversation locale ?')) return;
    setMessages([]);
    setUsage(null);
    setError(null);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  function renderTodayActionCards(items: TodayActionCard[]) {
    return (
      <div className="mt-2 flex flex-col gap-2.5">
        {items.map((action) => (
            <div
              key={action.id}
              className={`rounded-2xl border px-3.5 py-3 ${action.isPrimary ? 'border-emerald-400/40 bg-emerald-500/5' : 'border-[rgba(255,255,255,0.08)] bg-[#111317]'}`}
            >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#f8fafc]">{action.title}</p>
                {action.isPrimary && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">À traiter en premier</p>}
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
                  ? 'Bloqué'
                  : action.status === 'observed'
                    ? 'Observée'
                    : action.lifecycle === 'viewed'
                      ? 'Dossier consulté'
                      : action.lifecycle === 'executed'
                        ? 'Exécutée'
                        : action.lifecycle === 'observing'
                          ? 'Observation'
                          : action.lifecycle === 'follow_up_required'
                            ? 'À réévaluer'
                            : action.lifecycle === 'inconclusive'
                              ? 'À clarifier'
                      : action.priority === 'high'
                    ? 'À traiter'
                    : action.priority === 'medium'
                      ? 'À voir'
                      : 'À savoir'}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#cbd5e1]">{action.description}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#94a3b8]">{action.reason}</p>
            {action.priorityReason && <p className="mt-2 text-[11px] leading-relaxed text-[#cbd5e1]">Pourquoi maintenant : {action.priorityReason}</p>}
            {action.executionEvidence && <p className="mt-2 text-[11px] leading-relaxed text-emerald-300">Preuve observée : {action.executionEvidence}</p>}
            <p className="mt-2 text-[11px] leading-relaxed text-[#94a3b8]">Ensuite : {action.expectedObservation}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={action.primaryActionHref}
                onClick={(event) => handleTodayActionNavigation(event, action)}
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

  if (!open) return null;
  return (<>
      {/* Bulle flottante bottom-right, identique mobile/desktop (Intercom/Crisp-style).
          Positionnée au-dessus de la bottom nav et du bouton "+" sur mobile. */}
      {/*
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
      </button> */}

        <div className={integratedDesktop ? 'kadria-native-pane flex h-full w-[clamp(380px,28vw,420px)] shrink-0 border-l border-slate-200 bg-white' : 'fixed inset-0'} style={integratedDesktop ? undefined : { zIndex: SHELL_OVERLAY_LAYERS.dialog }}>
          <style jsx>{`
            .kadria-native-pane :global(header), .kadria-native-pane :global(footer) { background: #fff !important; border-color: #e2e8f0 !important; }
            .kadria-native-pane :global(main) { background: #f8fafc !important; }
            .kadria-native-pane :global([class*="bg-[#17"]), .kadria-native-pane :global([class*="bg-[#0f"]), .kadria-native-pane :global([class*="bg-[#10"]), .kadria-native-pane :global([class*="bg-[#11"]) { background: #fff !important; border-color: #e2e8f0 !important; }
            .kadria-native-pane :global([class*="text-[#f8"]), .kadria-native-pane :global([class*="text-[#cb"]), .kadria-native-pane :global([class*="text-[#9c"]) { color: #334155 !important; }
            .kadria-native-pane :global([class*="bg-[#22c55e]"]) { background: #059669 !important; color: #fff !important; }
          `}</style>
          {/* Fond opaque plein écran sur mobile (pas de scrim transparent comme fond principal). */}
          {!integratedDesktop && <div className="absolute inset-0 bg-[#050505] sm:hidden" />}
          {!integratedDesktop && <div
            className={`absolute inset-0 hidden bg-black/60 transition-opacity duration-200 sm:block ${drawerVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeCollaborator}
            aria-hidden="true"
          />}
          <section
            className={integratedDesktop ? 'kadria-native-pane flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white text-slate-900' : `kadria-native-pane relative ml-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-hidden overflow-x-hidden bg-white text-slate-900 shadow-2xl transition-transform duration-200 ease-out sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:border-l sm:border-slate-200 ${
              drawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
          <header className="flex min-h-[76px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 xl:px-7" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Sparkles className="size-4" /></span>
              <div>
              <h2 className="text-[17px] font-semibold leading-tight text-slate-950">Kadria</h2>
              <p className="mt-0.5 text-[13px] leading-snug text-[#9ca3af]">
                Votre collaborateur numérique
              </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={minimize}
                aria-label="Réduire l'Assistant Kadria"
                title="Réduire"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"
              >
                —
              </button>
              <button
                type="button"
                onClick={closeCollaborator}
                aria-label="Fermer l'Assistant Kadria"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"
              >
                ✕
              </button>
            </div>
          </header>

          <main ref={scrollRef} className="min-h-0 w-full max-w-full flex-1 space-y-5 overflow-y-auto overflow-x-hidden overscroll-contain bg-slate-50 px-5 py-5">
            <section className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-medium text-slate-500">Contexte</p><p className="mt-1 text-sm font-semibold text-slate-900">{contextTitle}</p><p className="mt-1 text-xs text-slate-500">Actions adaptées à votre page actuelle.</p></section>
            {hasArchivedMessages && activeMessages.length === 0 && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Nouvelle analyse pour {contextTitle}.
              </p>
            )}

            {activeMessages.length === 0 && (
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-slate-900">
                    Actions pour cette page
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Utilisez une action ou posez directement votre question.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#f8fafc]">À faire aujourd’hui</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#9ca3af]">
                        Voici les points qui méritent votre attention, sans action faite à votre place.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => appendTodayActionsMessage('Voir ce que je dois faire aujourd’hui')}
                      className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1.5 text-[11px] font-semibold text-[#22c55e] transition-colors hover:bg-[#22c55e]/20"
                    >
                      Ouvrir
                    </button>
                  </div>
                  {todayActionsLoading && (
                    <p className="mt-3 text-xs text-[#9ca3af]">Je regarde vos priorités...</p>
                  )}
                  {!todayActionsLoading && todayActionsError && (
                    <p className="mt-3 text-xs text-red-300">{todayActionsError}</p>
                  )}
                  {!todayActionsLoading && !todayActionsError && todayActions.length === 0 && (
                    <p className="mt-3 text-xs text-[#cbd5e1]">
                      Rien d&apos;urgent pour le moment.
                    </p>
                  )}
                  {!todayActionsLoading && !todayActionsError && todayActions.length > 0 && renderTodayActionCards(todayActions.slice(0, 3))}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {visibleSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => runSuggestion(suggestion)}
                      className="group flex min-h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                    >
                      <span>{suggestion.label}</span>
                      <span aria-hidden className="shrink-0 text-[#9ca3af] transition-colors group-hover:text-[#22c55e]">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeMessages.map(({ message: m, index: i }) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-500 text-emerald-950'
                      : 'border border-slate-200 bg-white text-slate-800 shadow-sm'
                  }`}
                >
                  {m.role === 'assistant' && m.assistantTitle && <p className="mb-1.5 font-semibold text-slate-950">{m.assistantTitle}</p>}
                  {renderMessageContent(m.content)}
                </div>
                {m.role === 'assistant' && m.todayActions && m.todayActions.length > 0 && (
                  <div className="w-full max-w-[85%]">
                    {renderTodayActionCards(m.todayActions)}
                  </div>
                )}
                {m.role === 'assistant' && m.assistantDetails && m.assistantDetails.length > 0 && (
                  <div className="mt-2 w-full max-w-[85%] space-y-1.5">
                    {m.assistantDetails.map((detail) => <div key={detail.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"><p className="font-semibold text-slate-900">{detail.label}</p><p className="mt-0.5">{detail.value}</p>{detail.meta && <p className="mt-1 text-slate-500">{detail.meta}</p>}</div>)}
                  </div>
                )}
                {m.role === 'assistant' && m.assistantEvidence && (
                  <p className="mt-2 max-w-[85%] text-xs text-[#9ca3af]">Niveau de preuve : {m.assistantEvidence.level}{m.assistantEvidence.note ? ` — ${m.assistantEvidence.note}` : ''}</p>
                )}
                {m.role === 'assistant' && m.assistantFollowUp && (
                  <p className="mt-1 max-w-[85%] text-xs text-[#cbd5e1]">{m.assistantFollowUp}</p>
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
                {m.role === 'assistant' && m.assistantSuggestions && m.assistantSuggestions.length > 0 && (
                  <section aria-label="Suggestions" className="mt-3 max-w-[92%]"><p className="mb-1.5 text-xs font-semibold text-slate-500">Suggestions</p><div className="space-y-1.5">
                    {m.assistantSuggestions.map((suggestion) => <button key={suggestion.id} type="button" onClick={() => runAssistantAction(suggestion.action)} className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-emerald-700"><Sparkles className="size-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">{suggestion.label}</span>{suggestion.reason ? <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{suggestion.reason}</span> : null}</span><span aria-hidden className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-700">›</span></button>)}
                  </div></section>
                )}
                {m.role === 'assistant' && renderProposedActionCard(m, i)}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#17181b] px-3.5 py-2.5 text-sm text-[#9ca3af]">
                  <span>Je rassemble les informations...</span>
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
                    Le plan Performance permet 200 questions par mois.
                  </p>
                )}
              </div>
            )}
          </main>

          <footer
            className="w-full max-w-full shrink-0 border-t border-slate-200 bg-white px-5 py-3"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <form onSubmit={handleSubmit} className="flex w-full max-w-full flex-col gap-2 sm:flex-row sm:items-center">
              {activeMessages.length > 0 && <button type="button" onClick={clearConversation} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"><Trash2 className="size-3.5" />Effacer la conversation</button>}
              <input ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={quotaReached ? 'Limite mensuelle atteinte' : 'Écrivez votre question…'}
                disabled={loading || quotaReached}
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || quotaReached || !input.trim()}
                aria-label="Envoyer le message"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 ${
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
  </>);
}

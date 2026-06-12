'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import type { ChatMessage, DossierComplet } from '@/src/types/dossier';

interface ChatWidgetProps {
  artisanId?: string;
  primaryColor?: string;
  artisanName?: string;
}

function parseQuickReplies(text: string): { cleanText: string; options: string[] } {
  const match = text.match(/<>([\s\S]*?)<>/);

  if (!match) {
    return { cleanText: text.trim(), options: [] };
  }

  const options = match[1]
    .split('|')
    .map((option) => option.trim())
    .filter(Boolean);

  const cleanText = text.replace(match[0], '').trim();

  return { cleanText, options };
}

interface AddressSuggestion {
  label: string;
  city: string;
  postcode: string;
}

function isAddressPrompt(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('adresse') || lower.includes('chantier') || text.includes('📍');
}

const RECAP_KEYWORDS = [
  'récapitulatif',
  'résumé',
  'dossier est prêt',
  'voici votre dossier',
  'voir le résumé',
];

function hasRecap(text: string): boolean {
  const lower = text.toLowerCase();
  return RECAP_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function renderBoldSegments(line: string, keyPrefix: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((part) => part !== '');

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <span key={`${keyPrefix}-${index}`}>{part}</span>;
  });
}

function renderMarkdown(text: string) {
  const paragraphs = text.split('\n\n');

  return paragraphs.map((paragraph, paragraphIndex) => {
    const lines = paragraph.split('\n');

    return (
      <div key={paragraphIndex} className="mb-2 last:mb-0">
        {lines.map((line, lineIndex) => (
          <span key={lineIndex}>
            {renderBoldSegments(line, `${paragraphIndex}-${lineIndex}`)}
            {lineIndex < lines.length - 1 && <br />}
          </span>
        ))}
      </div>
    );
  });
}

const WELCOME_OPTIONS = [
  'Nouveau projet',
  "Travaux d'amélioration",
  'Réparation / Dépannage',
  'Entretien',
  'Intervention urgente',
  'Je ne sais pas encore',
];

export default function ChatWidget({
  artisanId = 'Artisan_demo',
  primaryColor = '#22c55e',
  artisanName = 'Kadria',
}: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [dossier, setDossier] = useState<Partial<DossierComplet>>({});
  const [completenessScore, setCompletenessScore] = useState(0);
  const [readyToSave, setReadyToSave] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isAddressMode, setIsAddressMode] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    function checkIsMobile() {
      setIsMobile(window.innerWidth < 768);
    }

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  async function startConversation(choice: string) {
    setShowWelcome(false);
    setLoading(true);

    try {
      const openerRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          currentDossier: {},
          artisanId,
        }),
      });

      const openerData = await openerRes.json();

      if (!openerData.success) {
        throw new Error(openerData.error || 'Erreur assistant IA');
      }

      const { cleanText: openerText } = parseQuickReplies(openerData.reply ?? '');
      const openerDossier = { ...dossier, ...openerData.dossierUpdate };

      const nextMessages: ChatMessage[] = [
        { role: 'assistant', content: openerText },
        { role: 'user', content: choice },
      ];

      setMessages(nextMessages);
      setDossier(openerDossier);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          currentDossier: openerDossier,
          artisanId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur assistant IA');
      }

      const { cleanText, options } = parseQuickReplies(data.reply ?? '');

      setMessages((prev) => [...prev, { role: 'assistant', content: cleanText }]);
      setQuickReplies(options);
      setDossier((prev) => ({ ...prev, ...data.dossierUpdate }));
      setCompletenessScore(data.completenessScore ?? 0);
      setReadyToSave(Boolean(data.readyToSave));
      setAiSummary(data.aiSummary ?? '');
    } catch (error) {
      setMessages([
        {
          role: 'assistant',
          content:
            'Désolé, une erreur est survenue. Pouvez-vous rafraîchir la page et réessayer ?',
        },
      ]);
      console.error('CHAT_WIDGET_START_ERROR', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
    setIsAddressMode(Boolean(lastAssistant && isAddressPrompt(lastAssistant.content)));
  }, [messages]);

  useEffect(() => {
    if (!isAddressMode || input.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(input.trim())}&limit=5`,
        );
        const data = await res.json();

        const suggestions: AddressSuggestion[] = (data.features ?? []).map(
          (feature: { properties: { label: string; city: string; postcode: string } }) => ({
            label: feature.properties.label,
            city: feature.properties.city,
            postcode: feature.properties.postcode,
          }),
        );

        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(true);
      } catch (error) {
        console.error('ADDRESS_AUTOCOMPLETE_ERROR', error);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [input, isAddressMode]);

  function handleSelectAddress(suggestion: AddressSuggestion) {
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    setIsAddressMode(false);

    const dossierOverride: Partial<DossierComplet> = {
      siteAddress: suggestion.label,
      city: suggestion.city,
      postalCode: suggestion.postcode,
    };

    setDossier((prev) => ({ ...prev, ...dossierOverride }));
    sendMessage(suggestion.label, dossierOverride);
  }

  async function sendMessage(overrideText?: string, dossierOverride?: Partial<DossierComplet>) {
    const content = (overrideText ?? input).trim();

    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    const effectiveDossier = { ...dossier, ...dossierOverride };

    setMessages(nextMessages);
    setQuickReplies([]);
    setInput('');
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          currentDossier: effectiveDossier,
          artisanId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur assistant IA');
      }

      const { cleanText, options } = parseQuickReplies(data.reply ?? '');

      setMessages((prev) => [...prev, { role: 'assistant', content: cleanText }]);
      setQuickReplies(options);
      setDossier((prev) => ({ ...prev, ...dossierOverride, ...data.dossierUpdate }));
      setCompletenessScore(data.completenessScore ?? 0);
      setReadyToSave(Boolean(data.readyToSave));
      setAiSummary(data.aiSummary ?? '');
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Désolé, une erreur est survenue. Pouvez-vous reformuler votre message ?',
        },
      ]);
      console.error('CHAT_WIDGET_ERROR', error);
    } finally {
      setLoading(false);
    }
  }

  async function submitDossier() {
    if (submitting) return;

    setSubmitting(true);

    try {
      console.log('Dossier à soumettre:', JSON.stringify(dossier));

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dossier,
          aiSummary,
          completenessScore,
          chatHistory: JSON.stringify(messages),
          artisanId,
          source: 'chat-widget',
        }),
      });

      console.log('Response status:', res.status);

      const data = await res.json();

      console.log('Response data:', JSON.stringify(data));

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la création du dossier');
      }

      setReference(String(data.recordId ?? '').slice(-6).toUpperCase());
      setSubmitted(true);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Une erreur est survenue lors de l\'envoi de votre dossier. Merci de réessayer.',
        },
      ]);
      console.error('CHAT_WIDGET_SUBMIT_ERROR', error);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
        aria-label="Ouvrir le chat"
      >
        <MessageCircle className="h-6 w-6 text-black" />
      </button>
    );
  }

  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
  const recapDetected = Boolean(lastAssistantMessage && hasRecap(lastAssistantMessage.content));

  const currentStep = readyToSave || completenessScore > 90
    ? 4
    : completenessScore >= 70
      ? 3
      : completenessScore >= 40
        ? 2
        : 1;

  return (
    <div
      className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      style={
        isMobile
          ? { width: '95vw', height: '85vh', right: '2.5vw', bottom: '16px' }
          : { width: '680px', height: '620px', right: '24px', bottom: '24px' }
      }
    >
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-black"
            style={{ backgroundColor: primaryColor }}
          >
            K
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{artisanName}</p>
            <p className="text-xs text-zinc-400">Assistant en ligne</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-zinc-400 transition hover:text-white"
          aria-label="Fermer le chat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
          <span>Votre projet</span>
          <span>Étape {currentStep} sur 4</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full transition-all"
            style={{ width: `${currentStep * 25}%`, backgroundColor: primaryColor }}
          />
        </div>
      </div>

      {showWelcome ? (
        <div className="flex-1 overflow-y-auto bg-zinc-950 p-5">
          <div className="rounded-xl bg-zinc-800 p-4">
            <p className="text-white">👋 Bienvenue ! Quel projet souhaitez-vous réaliser ?</p>
            <p className="mt-1 text-sm text-zinc-400">
              Décrivez simplement votre besoin. Nous vous guiderons pour constituer un dossier complet.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {WELCOME_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => startConversation(option)}
                className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-green-500 hover:bg-green-500 hover:text-black"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
      <div className="flex-1 space-y-3 overflow-y-auto bg-zinc-950 px-4 py-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                message.role === 'user'
                  ? 'text-black'
                  : 'bg-zinc-800 text-zinc-100'
              }`}
              style={
                message.role === 'user'
                  ? { backgroundColor: primaryColor }
                  : undefined
              }
            >
              {renderMarkdown(message.content)}
            </div>
          </div>
        ))}

        {quickReplies.length > 0 && !loading && !submitted && (
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => sendMessage(option)}
                className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white transition-all hover:border-green-500 hover:bg-green-500 hover:text-black"
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-zinc-800 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
            </div>
          </div>
        )}

        {submitted && (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100">
            Merci ! Votre dossier a bien été enregistré
            {reference ? ` (référence n°${reference})` : ''}. Un artisan vous
            recontactera très prochainement.
          </div>
        )}
      </div>
      )}

      {!showWelcome && readyToSave && recapDetected && !submitted && (
        <div className="border-t border-zinc-800 bg-zinc-900 px-4 py-3">
          <Button
            type="button"
            onClick={submitDossier}
            disabled={submitting}
            className="w-full border-0 text-black"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? 'Envoi en cours...' : 'Soumettre mon dossier'}
          </Button>
        </div>
      )}

      {!showWelcome && !submitted && (
        <div className="relative border-t border-zinc-800 bg-zinc-950 px-4 py-3">
          {isAddressMode && showAddressSuggestions && addressSuggestions.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 mb-2 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
              {addressSuggestions.map((suggestion) => (
                <div
                  key={suggestion.label}
                  onClick={() => handleSelectAddress(suggestion)}
                  className="cursor-pointer p-3 text-sm text-white hover:bg-zinc-800"
                >
                  {suggestion.label}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={() => {
                if (addressSuggestions.length > 0) setShowAddressSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowAddressSuggestions(false), 150);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Écrivez votre message..."
              disabled={loading}
              className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500"
            />
            <Button
              type="button"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="border-0 text-black"
              style={{ backgroundColor: primaryColor }}
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

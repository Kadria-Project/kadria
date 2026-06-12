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

  useEffect(() => {
    async function fetchOpener() {
      setLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [],
            currentDossier: {},
            artisanId,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Erreur assistant IA');
        }

        const { cleanText, options } = parseQuickReplies(data.reply ?? '');

        setMessages([{ role: 'assistant', content: cleanText }]);
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
        console.error('CHAT_WIDGET_OPENER_ERROR', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOpener();
  }, []);

  async function sendMessage(overrideText?: string) {
    const content = (overrideText ?? input).trim();

    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];

    setMessages(nextMessages);
    setQuickReplies([]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          currentDossier: dossier,
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

      const data = await res.json();

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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
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

      <div className="h-1.5 w-full bg-zinc-900">
        <div
          className="h-full transition-all"
          style={{ width: `${completenessScore}%`, backgroundColor: primaryColor }}
        />
      </div>

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
              {message.content}
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

      {readyToSave && !submitted && (
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

      {!submitted && (
        <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-950 px-4 py-3">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
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
      )}
    </div>
  );
}

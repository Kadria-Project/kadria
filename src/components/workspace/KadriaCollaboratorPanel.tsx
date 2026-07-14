'use client';

import { FormEvent, useState } from 'react';
import { ArrowUp, ChevronRight, MessageCircle, Sparkles, X } from 'lucide-react';

interface KadriaCollaboratorPanelProps {
  open: boolean;
  onClose: () => void;
}

const quickActions = ['Comprendre votre journée', 'Préparer des actions', 'Répondre à vos questions'];

export default function KadriaCollaboratorPanel({ open, onClose }: KadriaCollaboratorPanelProps) {
  const [draft, setDraft] = useState('');

  const openExistingAssistant = (event?: FormEvent) => {
    event?.preventDefault();
    document.querySelector<HTMLButtonElement>('button[aria-label="Ouvrir l\'assistant Kadria"]')?.click();
  };

  return (
    <aside
      aria-label="Kadria Collaborateur"
      className={`hidden shrink-0 overflow-hidden border-l border-slate-200 bg-white transition-[width,opacity] duration-200 xl:flex ${
        open ? 'w-[420px] opacity-100' : 'w-0 border-l-0 opacity-0'
      }`}
    >
      <div className={`flex w-[420px] flex-col p-5 ${open ? '' : 'pointer-events-none'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-700">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.12em]">Votre collaborateur</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Kadria Collaborateur</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Bonjour Antonin. Tout est sous contrôle.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer le Collaborateur Kadria" className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><MessageCircle className="h-4 w-4" /> Aujourd&apos;hui</div>
          <p className="mt-2 text-sm leading-6 text-emerald-950/75">Je peux vous aider à garder le fil de votre journée et à préparer les prochaines actions utiles.</p>
        </section>

        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Je peux vous aider à</p>
          <div className="mt-3 space-y-2">
            {quickActions.map((action) => (
              <button key={action} type="button" onClick={openExistingAssistant} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">
                {action}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </section>

        <div className="mt-6 flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm font-medium text-slate-700">Votre échange apparaîtra ici.</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">Posez une question pour ouvrir votre assistant Kadria.</p>
        </div>

        <form onSubmit={openExistingAssistant} className="mt-5 flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Écrivez votre question" aria-label="Votre question pour Kadria" className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
          <button type="submit" aria-label="Ouvrir l'assistant Kadria" className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2">
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}

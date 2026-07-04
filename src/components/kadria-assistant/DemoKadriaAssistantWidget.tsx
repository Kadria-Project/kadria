'use client';

// Version demo, sobre et 100% locale, de l'Assistant Kadria interne
// (KadriaAssistantWidget.tsx). Meme bulle flottante / tiroir visuel, mais
// aucune vraie requete OpenAI : reponses simulees deterministes en fonction
// de la page/du dossier courant, cf. brief "internal assistant demo".

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send } from 'lucide-react';
import { useDemoMode } from '@/src/contexts/DemoModeContext';

interface DemoChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const GENERIC_QUICK_STARTS = [
  'Résumer ce dossier',
  'Que faire maintenant ?',
  'Quels devis relancer ?',
  'Quels acomptes suivre ?',
];

function buildProjectAnswer(question: string, project: ReturnType<typeof useDemoMode>['projects'][number] | undefined): string {
  const q = question.toLowerCase();
  if (!project) {
    return "Je n'ai pas trouvé de dossier ouvert pour répondre précisément. Ouvrez un dossier puis reposez votre question.";
  }
  const client = `${project.clientFirstName} ${project.clientName}`.trim();
  if (q.includes('résum') || q.includes('resum')) {
    return `Dossier ${project.projectNumber} — ${client}, ${project.projectType}. Statut : ${project.status}. Budget estimé : ${project.budget || 'non renseigné'}. ${project.aiSummary || ''}`.trim();
  }
  if (q.includes('maintenant') || q.includes('faire')) {
    if (project.status === 'Nouveau' || project.status === 'A rappeler') {
      return `Prochaine étape recommandée : qualifier ${client} puis proposer un rendez-vous ou préparer un devis.`;
    }
    if (project.status === 'Qualifié') {
      return `${client} est qualifié : préparez et envoyez le devis dès que possible pour ne pas perdre l'élan commercial.`;
    }
    if (project.status === 'Devis envoyé') {
      return `Le devis a été envoyé à ${client}. Pensez à relancer si aucune réponse sous quelques jours.`;
    }
    if (project.status === 'Gagné') {
      return `Le dossier ${client} est gagné. Pensez à demander un avis client si ce n'est pas déjà fait.`;
    }
    return `Suivez l'avancement du dossier ${client} et tenez le client informé des prochaines étapes.`;
  }
  if (q.includes('devis')) {
    return project.devisAmount
      ? `Le devis de ${client} est estimé à ${project.devisAmount} €. Vérifiez son statut dans la section Devis du dossier.`
      : `Aucun devis chiffré n'est encore enregistré pour ${client}.`;
  }
  if (q.includes('acompte')) {
    return `Consultez la section Acompte du dossier ${client} pour voir si une demande est en cours ou réglée.`;
  }
  if (q.includes('manque') || q.includes('élément') || q.includes('element')) {
    return `Complétude du dossier : ${project.completenessScore ?? 'inconnue'} %. Vérifiez photos, coordonnées et description du besoin.`;
  }
  return `Sur le dossier ${client} (${project.status}), je vous recommande de suivre l'action prioritaire affichée dans la fiche projet.`;
}

function buildGlobalAnswer(question: string, projects: ReturnType<typeof useDemoMode>['projects']): string {
  const q = question.toLowerCase();
  if (q.includes('relancer') || q.includes('devis')) {
    const toFollow = projects.filter((p) => p.status === 'Devis envoyé');
    if (toFollow.length === 0) return "Aucun devis en attente de relance pour le moment.";
    return `${toFollow.length} devis à relancer : ${toFollow.slice(0, 4).map((p) => `${p.clientFirstName} ${p.clientName}`).join(', ')}.`;
  }
  if (q.includes('acompte')) {
    return "Consultez l'onglet Suivi commercial pour voir les acomptes demandés ou en attente de paiement.";
  }
  if (q.includes('maintenant') || q.includes('faire')) {
    const priority = projects.find((p) => p.status === 'A rappeler') || projects[0];
    return priority
      ? `Priorité du moment : ${priority.clientFirstName} ${priority.clientName} (${priority.status}). Ouvrez son dossier pour voir l'action recommandée.`
      : "Aucune action prioritaire identifiée pour le moment.";
  }
  return "Je peux vous aider à résumer un dossier, identifier les devis à relancer ou les acomptes à suivre. Ouvrez un dossier pour des réponses plus précises.";
}

export default function DemoKadriaAssistantWidget() {
  const pathname = usePathname();
  const { projects } = useDemoMode();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<DemoChatMessage[]>([]);

  const projectIdMatch = pathname?.match(/\/demo-dashboard\/projet\/([^/]+)/);
  const currentProject = useMemo(
    () => (projectIdMatch ? projects.find((p) => p.id === projectIdMatch[1]) : undefined),
    [projectIdMatch, projects],
  );

  const quickStarts = currentProject
    ? ['Résumer ce dossier', 'Que faire maintenant ?', 'Quels éléments manquent ?', 'Quel est le statut du devis ?']
    : GENERIC_QUICK_STARTS;

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const answer = currentProject
      ? buildProjectAnswer(trimmed, currentProject)
      : buildGlobalAnswer(trimmed, projects);
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }, { role: 'assistant', content: answer }]);
    setInput('');
  };

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
                <h2 className="text-[19px] font-semibold leading-tight text-[#f8fafc]">Assistant Kadria</h2>
                <p className="mt-0.5 text-[13px] leading-snug text-[#9ca3af]">
                  Version démo — réponses simulées localement, aucun appel réel.
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
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] text-[#9ca3af]">Suggestions :</p>
                  {quickStarts.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => ask(suggestion)}
                      className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#101113] px-3 py-2 text-left text-[13px] text-[#f8fafc] hover:border-[#22c55e]/40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-col gap-3">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                      message.role === 'user'
                        ? 'ml-auto bg-[#22c55e] text-[#05130d]'
                        : 'mr-auto bg-[#101113] text-[#f8fafc] border border-[rgba(255,255,255,0.08)]'
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
            </div>

            <form
              className="flex shrink-0 items-center gap-2 border-t border-[rgba(255,255,255,0.08)] bg-[#101113] px-3 py-3"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question…"
                className="flex-1 rounded-full border border-[rgba(255,255,255,0.12)] bg-transparent px-3 py-2 text-[13px] text-[#f8fafc] outline-none placeholder:text-[#6b7280]"
              />
              <button
                type="submit"
                aria-label="Envoyer"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-[#05130d]"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

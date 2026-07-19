'use client';

import { Check, Circle } from 'lucide-react';

type ProgressLifecycle = { stage?: string | null } | null | undefined;
type ProgressQuote = { accepted?: boolean; declined?: boolean; sent?: boolean; last_follow_up_at?: string | null; opens_count?: number | null; quote_sent_at?: string | null } | null | undefined;
type ProgressAppointment = { start?: string | null } | null | undefined;

const steps = [
  { id: 'contact', label: 'Premier contact' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'appointment', label: 'Rendez-vous' },
  { id: 'quote', label: 'Devis' },
  { id: 'follow-up', label: 'Relance' },
  { id: 'signature', label: 'Signature' },
  { id: 'execution', label: 'Réalisation' },
  { id: 'billing', label: 'Facturation' },
  { id: 'done', label: 'Terminé' },
];

function resolveActiveStep(lifecycle: ProgressLifecycle, latestDevis: ProgressQuote, appointment: ProgressAppointment) {
  if (lifecycle?.stage === 'lost') return 8;
  if (lifecycle?.stage === 'won' || lifecycle?.stage === 'execution') return lifecycle?.stage === 'execution' ? 6 : 5;
  if (latestDevis?.accepted) return 5;
  if (latestDevis?.declined) return 5;
  if (latestDevis?.sent && (latestDevis?.last_follow_up_at || Number(latestDevis?.opens_count) > 0)) return 4;
  if (latestDevis?.sent || latestDevis) return 3;
  if (appointment) return 2;
  if (lifecycle?.stage === 'qualified' || lifecycle?.stage === 'in_progress') return 2;
  if (lifecycle?.stage === 'callback') return 1;
  return 0;
}

export function ProjectProgressTimeline({ lifecycle, latestDevis, appointment }: { lifecycle: ProgressLifecycle; latestDevis: ProgressQuote; appointment: ProgressAppointment }) {
  const activeIndex = resolveActiveStep(lifecycle, latestDevis, appointment);
  return (
    <section aria-label="Avancement du dossier" className="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <ol className="flex w-full items-start">
        {steps.map((step, index) => {
          const complete = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
              {index > 0 && <span className={`absolute right-1/2 top-3 h-0.5 w-full ${complete || active ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              <span className={`relative z-[1] flex h-6 w-6 items-center justify-center rounded-full border-2 ${complete ? 'border-emerald-500 bg-emerald-500 text-white' : active ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : 'border-slate-300 bg-white text-slate-300'}`}>
                {complete ? <Check size={13} strokeWidth={3} /> : <Circle size={7} fill="currentColor" />}
              </span>
              <span className={`mt-2 hidden text-[11px] font-semibold leading-4 lg:block ${active ? 'text-slate-950' : complete ? 'text-slate-700' : 'text-slate-400'}`}>{step.label}</span>
              {active && step.id === 'quote' && latestDevis?.quote_sent_at && <span className="mt-0.5 hidden text-[10px] text-slate-500 lg:block">Envoyé</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

'use client';

import { Check, Circle } from 'lucide-react';

type ProgressLifecycle = { stage?: string | null } | null | undefined;
type ProgressQuote = { accepted?: boolean; declined?: boolean; sent?: boolean } | null | undefined;
type ProgressAppointment = { start?: string | null } | null | undefined;

function getSteps(lifecycle: ProgressLifecycle, latestDevis: ProgressQuote, appointment: ProgressAppointment) {
  const stage = lifecycle?.stage || 'new';
  const isLost = stage === 'lost' || latestDevis?.declined;
  const hasQuote = Boolean(latestDevis?.sent || latestDevis?.accepted || latestDevis?.declined || ['quote_sent', 'quote_accepted', 'deposit_requested', 'deposit_paid', 'execution', 'won'].includes(stage));
  const steps = [{ id: 'contact', label: 'Demande reçue' }, { id: 'qualification', label: 'Besoin compris' }];
  if (appointment?.start) steps.push({ id: 'appointment', label: 'Rendez-vous' });
  if (hasQuote) steps.push({ id: 'quote', label: 'Décision commerciale' });
  if (!isLost && ['deposit_requested', 'deposit_paid'].includes(stage)) steps.push({ id: 'deposit', label: 'Acompte' });
  if (!isLost && ['execution', 'won'].includes(stage)) steps.push({ id: 'execution', label: 'Préparation du chantier' });
  if (stage === 'won') steps.push({ id: 'done', label: 'Dossier terminé' });
  if (isLost) steps.push({ id: 'lost', label: 'Dossier arrêté' });
  return steps;
}

function activeStepId(lifecycle: ProgressLifecycle, latestDevis: ProgressQuote, appointment: ProgressAppointment) {
  const stage = lifecycle?.stage || 'new';
  if (stage === 'lost' || latestDevis?.declined) return 'lost';
  if (stage === 'won') return 'done';
  if (stage === 'execution') return 'execution';
  if (stage === 'deposit_requested' || stage === 'deposit_paid') return 'deposit';
  if (latestDevis?.sent || latestDevis?.accepted || stage === 'quote_sent' || stage === 'quote_accepted') return 'quote';
  if (appointment?.start) return 'appointment';
  if (stage === 'qualified' || stage === 'in_progress') return 'qualification';
  return 'contact';
}

export function ProjectProgressTimeline({ lifecycle, latestDevis, appointment }: { lifecycle: ProgressLifecycle; latestDevis: ProgressQuote; appointment: ProgressAppointment }) {
  const steps = getSteps(lifecycle, latestDevis, appointment);
  const activeId = activeStepId(lifecycle, latestDevis, appointment);
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === activeId));
  return <section aria-label="Situation dans le parcours du dossier" className="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Repère dans le parcours</p><ol className="flex w-full items-start">{steps.map((step, index) => { const complete = index < activeIndex; const active = index === activeIndex; return <li key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center text-center">{index > 0 && <span className={`absolute right-1/2 top-3 h-0.5 w-full ${complete || active ? 'bg-emerald-500' : 'bg-slate-200'}`} />}<span className={`relative z-[1] flex h-6 w-6 items-center justify-center rounded-full border-2 ${complete ? 'border-emerald-500 bg-emerald-500 text-white' : active ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : 'border-slate-300 bg-white text-slate-300'}`}>{complete ? <Check size={13} strokeWidth={3} /> : <Circle size={7} fill="currentColor" />}</span><span className={`mt-2 hidden text-[11px] font-semibold leading-4 lg:block ${active ? 'text-slate-950' : complete ? 'text-slate-700' : 'text-slate-400'}`}>{step.label}</span></li>; })}</ol></section>;
}

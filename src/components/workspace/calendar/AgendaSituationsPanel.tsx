import { AlertTriangle, CalendarClock, MapPinned, UserRound } from 'lucide-react';
import type { ScheduleSituation } from '@/src/lib/calendar/schedule-situations';

type Props = { situations: ScheduleSituation[]; onAction: (situation: ScheduleSituation) => void };

const iconFor = (kind: ScheduleSituation['kind']) => kind === 'assign' ? UserRound : kind === 'travel_margin' ? MapPinned : kind === 'confirm' ? CalendarClock : AlertTriangle;
const timeFor = (value: string | undefined) => value ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : null;

export default function AgendaSituationsPanel({ situations, onAction }: Props) {
  const visibleSituations = situations.slice(0, 3);
  if (!visibleSituations.length) return null;

  return <section id="workspace-section-decisions" aria-labelledby="agenda-situations-title"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">À sécuriser aujourd’hui</p><h2 id="agenda-situations-title" className="mt-1 text-base font-bold tracking-tight text-slate-950">Points d’attention</h2></div><span className="text-xs font-medium text-slate-500">{visibleSituations.length} alerte{visibleSituations.length > 1 ? 's' : ''}</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleSituations.map((situation) => { const Icon = iconFor(situation.kind); const time = timeFor(situation.startAt); return <article key={situation.id} id={`workspace-action-${situation.id}`} className="flex min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-700">{time ? `${time} — ` : ''}{situation.projectTitle || 'Intervention'}</p><h3 className="mt-0.5 truncate text-sm font-semibold text-slate-950">{situation.clientName || situation.projectTitle || 'Rendez-vous à préparer'}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{situation.observedFacts[0] || situation.recommendation || 'Une action est recommandée.'}</p><button type="button" onClick={() => onAction(situation)} className="mt-3 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2">{situation.primaryAction?.label || 'Ouvrir'}</button></div></article>})}</div></section>;
}

import { AlertTriangle, CalendarCheck2, ChevronRight, LoaderCircle, Plus } from 'lucide-react';
import type { DayReadiness } from '@/src/lib/calendar/schedule-situations';

type CalendarBriefingProps = {
  readiness: DayReadiness;
  appointmentCount: number;
  view: 'jour' | 'semaine';
  onToggleView: () => void;
  onCreate: () => void;
};

export default function CalendarBriefing({ readiness, appointmentCount, view, onToggleView, onCreate }: CalendarBriefingProps) {
  const Icon = readiness.state === 'loading' ? LoaderCircle : readiness.state === 'attention' || readiness.state === 'insufficient' ? AlertTriangle : CalendarCheck2;
  const tone = readiness.state === 'attention' || readiness.state === 'insufficient' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';

  return (
    <section id="workspace-section-briefing" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Préparation de la journée</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={['mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl', tone].join(' ')}>
            <Icon className={['size-5', readiness.state === 'loading' ? 'animate-spin' : ''].join(' ')} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{readiness.title}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">{readiness.detail}</p>
            {appointmentCount > 0 && readiness.state !== 'loading' ? <p className="text-sm leading-5 text-slate-500">{appointmentCount} engagement{appointmentCount > 1 ? 's' : ''} utile{appointmentCount > 1 ? 's' : ''} vérifié{appointmentCount > 1 ? 's' : ''} aujourd’hui.</p> : null}
            {readiness.limitations.map((limitation) => <p key={limitation} className="mt-1 text-xs leading-5 text-amber-800">Limite : {limitation}</p>)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onCreate} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"><Plus className="size-3.5" />Ajouter un créneau</button>
          <button type="button" onClick={onToggleView} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#0b2232] transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Voir {view === 'jour' ? 'la semaine' : 'aujourd’hui'}<ChevronRight className="size-3.5" /></button>
        </div>
      </div>
    </section>
  );
}

import { Activity, CalendarCheck2, ChevronRight } from 'lucide-react';

type CalendarBriefingProps = {
  appointmentCount: number;
  conflictCount: number;
  availableMinutes: number;
  view: 'jour' | 'semaine';
  onToggleView: () => void;
};

export default function CalendarBriefing({ appointmentCount, conflictCount, availableMinutes, view, onToggleView }: CalendarBriefingProps) {
  const hasConflict = conflictCount > 0;
  const isLight = appointmentCount === 0;
  const Icon = hasConflict ? Activity : CalendarCheck2;
  const title = hasConflict
    ? 'Un conflit mérite votre attention.'
    : isLight
      ? 'Votre planning est léger aujourd’hui.'
      : 'Votre journée est bien planifiée.';
  const detail = hasConflict
    ? `${conflictCount} conflit${conflictCount > 1 ? 's' : ''} à vérifier dans votre planning.`
    : appointmentCount
      ? `${appointmentCount} rendez-vous${availableMinutes > 0 ? ` · ${Math.floor(availableMinutes / 60)} h ${availableMinutes % 60} non planifiées` : ''}.`
      : 'Ajoutez un rendez-vous lorsque votre journée se précise.';

  return (
    <section id="workspace-section-briefing" className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Planning du jour</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${hasConflict ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-700'}`}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
          </div>
        </div>
        <button type="button" onClick={onToggleView} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">
          Voir {view === 'jour' ? 'la semaine' : "aujourd’hui"}
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </section>
  );
}

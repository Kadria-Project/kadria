import { Activity, CalendarCheck2, ChevronRight, Plus } from 'lucide-react';

type CalendarBriefingProps = {
  appointmentCount: number;
  conflictCount: number;
  availableMinutes: number;
  view: 'jour' | 'semaine';
  onToggleView: () => void;
  onCreate: () => void;
};

function formatAvailableTime(minutes: number) {
  return Math.floor(minutes / 60) + ' h ' + String(minutes % 60).padStart(2, '0');
}

export default function CalendarBriefing({ appointmentCount, conflictCount, availableMinutes, view, onToggleView, onCreate }: CalendarBriefingProps) {
  const hasConflict = conflictCount > 0;
  const isLight = appointmentCount === 0;
  const Icon = hasConflict ? Activity : CalendarCheck2;
  const title = hasConflict
    ? 'Un conflit mérite votre attention.'
    : isLight
      ? 'Votre journée est calme.'
      : 'Votre journée est bien planifiée.';
  const primaryDetail = hasConflict
    ? conflictCount + ' conflit' + (conflictCount > 1 ? 's' : '') + ' à vérifier dans votre planning.'
    : appointmentCount
      ? appointmentCount + ' rendez-vous prévus aujourd’hui.'
      : 'Aucun rendez-vous n’est prévu aujourd’hui.';
  const secondaryDetail = formatAvailableTime(availableMinutes) + ' restent non planifiées.';

  return (
    <section id="workspace-section-briefing" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Planning du jour</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={['mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl', hasConflict ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-700'].join(' ')}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">{primaryDetail}</p>
            <p className="text-sm leading-5 text-slate-500">{secondaryDetail}</p>
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

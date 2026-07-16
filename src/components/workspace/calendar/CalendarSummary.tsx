import { CalendarDays, Clock3, TriangleAlert, UserRound } from 'lucide-react';

type CalendarSummaryProps = {
  appointmentCount: number;
  plannedMinutes: number;
  conflictCount: number;
  unassignedCount: number;
  onShowUnassigned: () => void;
};

const formatDuration = (minutes: number) => Math.floor(minutes / 60) + ' h ' + String(minutes % 60).padStart(2, '0');

export default function CalendarSummary({ appointmentCount, plannedMinutes, conflictCount, unassignedCount, onShowUnassigned }: CalendarSummaryProps) {
  const metrics = [
    { label: 'Rendez-vous', value: String(appointmentCount), note: 'Aujourd’hui', Icon: CalendarDays, tone: 'bg-blue-50 text-blue-600', accent: 'bg-blue-500' },
    { label: 'Charge planifiée', value: formatDuration(plannedMinutes), note: '/ 8 h 00', Icon: Clock3, tone: 'bg-emerald-50 text-emerald-600', accent: 'bg-emerald-500' },
    { label: 'Conflits', value: String(conflictCount), note: conflictCount ? 'À résoudre' : 'Aucun', Icon: TriangleAlert, tone: conflictCount ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500', accent: conflictCount ? 'bg-orange-500' : 'bg-slate-300' },
    { label: 'Non affectés', value: String(unassignedCount), note: unassignedCount ? 'À répartir' : 'Tous affectés', Icon: UserRound, tone: 'bg-sky-50 text-sky-600', accent: 'bg-sky-500', action: onShowUnassigned },
  ];

  return (
    <section aria-label="Résumé de la journée" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map(({ label, value, note, Icon, tone, accent, action }) => {
        const content = <><span className={['absolute inset-x-0 top-0 h-0.5', accent].join(' ')} /><span className={['grid size-10 shrink-0 place-items-center rounded-xl', tone].join(' ')}><Icon className="size-5" aria-hidden="true" /></span><span><span className="block text-lg font-semibold tracking-tight text-slate-950">{value}</span><span className="block text-xs font-medium text-slate-700">{label}</span><span className="mt-1 block text-[11px] text-slate-500">{note}</span></span></>;
        const className = 'relative flex min-h-[92px] items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.025)]';
        return action ? <button key={label} type="button" onClick={action} aria-label="Afficher les rendez-vous non affectés" className={className + ' transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-2'}>{content}</button> : <div key={label} className={className}>{content}</div>;
      })}
    </section>
  );
}

import { CalendarDays, CarFront, Clock3, TriangleAlert } from 'lucide-react';

type CalendarSummaryProps = {
  appointmentCount: number;
  plannedMinutes: number;
  conflictCount: number;
  travelWarningCount: number;
};

const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;

export default function CalendarSummary({ appointmentCount, plannedMinutes, conflictCount, travelWarningCount }: CalendarSummaryProps) {
  const metrics = [
    { label: 'Rendez-vous', value: String(appointmentCount), note: "Aujourd’hui", Icon: CalendarDays, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Charge réelle', value: formatDuration(plannedMinutes), note: '/ 8 h 00', Icon: Clock3, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Conflits', value: String(conflictCount), note: conflictCount ? 'À résoudre' : 'Aucun', Icon: TriangleAlert, tone: conflictCount ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500' },
    { label: 'Trajets', value: travelWarningCount ? `${travelWarningCount}` : '—', note: travelWarningCount ? 'À vérifier' : 'Non calculés', Icon: CarFront, tone: 'bg-violet-50 text-violet-600' },
  ];

  return <section aria-label="Résumé de la journée" className="grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map(({ label, value, note, Icon, tone }) => <div key={label} className="flex min-h-[94px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="size-5" aria-hidden="true" /></span><div><p className="text-lg font-semibold tracking-tight text-slate-950">{value}</p><p className="text-xs font-medium text-slate-700">{label}</p><p className="mt-1 text-[11px] text-slate-500">{note}</p></div></div>)}</section>;
}

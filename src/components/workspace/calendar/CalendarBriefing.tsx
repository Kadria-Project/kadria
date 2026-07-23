import { CalendarCheck2, CarFront, Clock3, Route } from 'lucide-react';
import type { DayReadiness } from '@/src/lib/calendar/schedule-situations';

type CalendarBriefingProps = {
  readiness: DayReadiness;
  appointmentCount: number;
  confirmedCount: number;
  travelMinutes: number;
  estimatedEnd: string | null;
};

function formatDuration(minutes: number) {
  if (!minutes) return '—';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours}h${remainingMinutes ? String(remainingMinutes).padStart(2, '0') : ''}` : `${remainingMinutes} min`;
}

export default function CalendarBriefing({ readiness, appointmentCount, confirmedCount, travelMinutes, estimatedEnd }: CalendarBriefingProps) {
  const metrics = [
    { icon: CalendarCheck2, label: 'rendez-vous aujourd’hui', value: appointmentCount },
    { icon: Clock3, label: 'confirmé' + (confirmedCount > 1 ? 's' : ''), value: confirmedCount },
    { icon: CarFront, label: 'trajet prévu', value: formatDuration(travelMinutes) },
    { icon: Route, label: 'fin estimée', value: estimatedEnd || '—' },
  ];

  return (
    <section id="workspace-section-briefing" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold tracking-tight text-slate-950">Bonjour</p>
          <p className="mt-0.5 text-sm text-slate-600">Voici l’essentiel de votre journée.</p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
          <span className="font-semibold text-emerald-800">Conseil du jour :</span> {readiness.detail}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 sm:grid-cols-4 sm:divide-y-0">
        {metrics.map(({ icon: Icon, label, value }) => <div key={label} className="flex items-center gap-2.5 px-3 py-3 sm:px-4"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Icon className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-slate-950">{value}</p><p className="text-[11px] leading-4 text-slate-500">{label}</p></div></div>)}
      </div>
    </section>
  );
}

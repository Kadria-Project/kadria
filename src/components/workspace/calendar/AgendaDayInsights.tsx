import { CalendarClock, CheckCircle2, ExternalLink, MapPinned, Route, Sparkles } from 'lucide-react';
import type { ScheduleSituation } from '@/src/lib/calendar/schedule-situations';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { formatAgendaDuration, type AgendaDaySummary } from './agenda-day-summary';
import NextAppointmentPanel from './NextAppointmentPanel';

type Props = {
  summary: AgendaDaySummary;
  situation: ScheduleSituation | null;
  nextAppointment: NormalizedCalendarEvent | null;
  onOpenProject: (event: NormalizedCalendarEvent) => void;
};

export default function AgendaDayInsights({ summary, situation, nextAppointment, onOpenProject }: Props) {
  const hasStats = summary.appointmentCount > 0;
  const showAdvice = !situation && hasStats;
  if (!hasStats && !summary.routeStops && summary.availableSlots === null && !nextAppointment) return null;

  return <section aria-label="Informations opérationnelles de la journée" className="grid items-start gap-4 md:grid-cols-2">
    {hasStats ? <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><CalendarClock className="size-4 text-emerald-600" />Votre journée en chiffres</p><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">Rendez-vous</dt><dd className="mt-1 font-semibold text-slate-950">{summary.appointmentCount}</dd></div>{summary.plannedMinutes !== null ? <div><dt className="text-xs text-slate-500">Durée planifiée</dt><dd className="mt-1 font-semibold text-slate-950">{formatAgendaDuration(summary.plannedMinutes)}</dd></div> : null}{summary.travelMinutes !== null ? <div><dt className="text-xs text-slate-500">Déplacements planifiés</dt><dd className="mt-1 font-semibold text-slate-950">{formatAgendaDuration(summary.travelMinutes)}</dd></div> : null}{summary.availableMinutes !== null ? <div><dt className="text-xs text-slate-500">Disponibilité</dt><dd className="mt-1 font-semibold text-slate-950">{formatAgendaDuration(summary.availableMinutes)}</dd></div> : null}{summary.estimatedEnd ? <div><dt className="text-xs text-slate-500">Fin estimée</dt><dd className="mt-1 font-semibold text-slate-950">{summary.estimatedEnd}</dd></div> : null}</dl>{summary.incompleteDurations ? <p className="mt-3 text-xs leading-5 text-amber-800">Certaines durées sont incomplètes : les disponibilités et la fin de journée ne sont pas calculées.</p> : null}</article> : null}
    {summary.routeStops && summary.mapsUrl ? <article className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><Route className="size-4 text-violet-600" />Itinéraire de la journée</p><a href={summary.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Ouvrir dans Maps<ExternalLink className="size-3.5" /></a></div><ol className="mt-3 space-y-3">{summary.routeStops.map((stop, index) => <li key={stop.id} className="relative flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-50 text-[11px] font-bold text-violet-700">{index + 1}</span><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{stop.time ? `${stop.time} — ` : ''}{stop.label}</p><p className="mt-0.5 truncate text-xs text-slate-500">{stop.address}</p></div></li>)}</ol></article> : null}
    <NextAppointmentPanel event={nextAppointment} onOpenProject={onOpenProject} />
    {summary.availableSlots !== null ? <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><MapPinned className="size-4 text-blue-600" />Créneaux disponibles</p>{summary.availableSlots.length ? <div className="mt-3 space-y-2">{summary.availableSlots.map((slot) => <div key={`${slot.start}-${slot.end}`} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-sm font-semibold text-slate-900">{slot.start}–{slot.end} <span className="font-normal text-slate-500">· {formatAgendaDuration(slot.minutes)}</span></p><p className="mt-0.5 text-xs text-slate-600">{slot.label}</p></div>)}</div> : <p className="mt-3 text-sm leading-6 text-slate-600">Aucun créneau significatif aujourd’hui.</p>}</article> : null}
    {showAdvice ? <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><Sparkles className="size-4 text-amber-600" />Conseil Kadria</p><div className="mt-3 flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /><p className="text-sm leading-5 text-slate-700">Votre journée ne présente pas de point de vigilance détecté.</p></div></article> : null}
  </section>;
}

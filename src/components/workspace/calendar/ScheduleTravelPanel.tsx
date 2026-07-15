import { MapPin } from 'lucide-react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { eventDate, eventLabel, formatTime } from './calendar-workspace-utils';

export default function ScheduleTravelPanel({ events }: { events: NormalizedCalendarEvent[] }) {
  const locations = events.filter((event) => eventDate(event) && (event.address || event.location)).slice(0, 3);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Vue géographique</p>{locations.length ? <div className="mt-4 space-y-3">{locations.map((event, index) => <div key={event.id} className="flex items-start gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700">{index + 1}</span><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{eventLabel(event)}</p><p className="mt-0.5 truncate text-xs text-slate-500">{formatTime(event.start)} · {event.address || event.location}</p></div></div>)}</div> : <p className="mt-4 flex items-center gap-2 text-sm leading-6 text-slate-500"><MapPin className="size-4 text-slate-400" /> Vue géographique indisponible : aucune adresse exploitable aujourd’hui.</p>}</section>;
}

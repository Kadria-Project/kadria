import { MapPin, Route } from 'lucide-react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { eventDate, eventLabel, formatTime } from './calendar-workspace-utils';

export default function ScheduleTravelPanel({ events }: { events: NormalizedCalendarEvent[] }) {
  const locations = events.filter((event) => eventDate(event) && (event.address || event.location)).slice(0, 3);
  if (!locations.length) return <section className="flex max-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><MapPin className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Localisation</p><p className="mt-1 text-xs text-slate-600">Aucune adresse exploitable aujourd’hui.</p></div></section>;

  return <section className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><Route className="size-4 text-violet-600" />Localisation</p><div className="mt-3 space-y-2">{locations.map((event, index) => <div key={event.id} className="flex items-start gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-50 text-[11px] font-bold text-violet-700">{index + 1}</span><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{eventLabel(event)}</p><p className="mt-0.5 truncate text-xs text-slate-500">{formatTime(event.start)} · {event.address || event.location}</p></div></div>)}</div></section>;
}

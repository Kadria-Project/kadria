import { ChevronLeft, ChevronRight, ListFilter, Plus } from 'lucide-react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import ScheduleEventCard from './ScheduleEventCard';
import type { CalendarView } from './calendar-workspace-types';
import { eventDate, isSameDay } from './calendar-workspace-utils';

type ScheduleTimelineProps = {
  view: CalendarView;
  selectedDate: Date;
  events: NormalizedCalendarEvent[];
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
  onOpenEvent: (event: NormalizedCalendarEvent) => void;
  onCreate: () => void;
};

export default function ScheduleTimeline({ view, selectedDate, events, onPrevious, onNext, onToday, onViewChange, onOpenEvent, onCreate }: ScheduleTimelineProps) {
  const days = view === 'jour' ? [selectedDate] : Array.from({ length: 7 }, (_, index) => { const date = new Date(selectedDate); date.setDate(date.getDate() + index); return date; });
  const timed = events.filter((event) => eventDate(event) && !event.allDay).sort((a, b) => (eventDate(a)?.getTime() || 0) - (eventDate(b)?.getTime() || 0));
  return <section id="workspace-section-calendar" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><p className="mr-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Planning du jour</p><button type="button" onClick={onPrevious} aria-label="Période précédente" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft className="size-4" /></button><button type="button" onClick={onToday} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Aujourd’hui</button><button type="button" onClick={onNext} aria-label="Période suivante" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight className="size-4" /></button></div><div className="flex items-center gap-2"><div className="flex rounded-lg border border-slate-200 p-0.5"><button type="button" onClick={() => onViewChange('jour')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === 'jour' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>Jour</button><button type="button" onClick={() => onViewChange('semaine')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === 'semaine' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>Semaine</button></div><button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"><ListFilter className="size-3.5" />Filtres</button></div></div><div className={`mt-5 grid gap-4 ${view === 'jour' ? '' : 'lg:grid-cols-7'}`}>{days.map((day) => { const dayEvents = timed.filter((event) => { const date = eventDate(event); return date ? isSameDay(date, day) : false; }); return <div key={day.toISOString()} className="min-w-0"><div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2"><p className="text-sm font-semibold text-slate-800">{day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</p><span className="text-xs text-slate-400">{dayEvents.length} rdv</span></div><div className="space-y-2">{dayEvents.length ? dayEvents.map((event) => <ScheduleEventCard key={event.id} event={event} onOpen={onOpenEvent} />) : <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">Aucun rendez-vous prévu.</p>}</div></div>; })}</div><button type="button" onClick={onCreate} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"><Plus className="size-4" />Ajouter un créneau</button></section>;
}

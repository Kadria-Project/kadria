import { CalendarDays, ChevronLeft, ChevronRight, ListFilter, Plus } from 'lucide-react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import type { CalendarView } from './calendar-workspace-types';
import { durationMinutes, eventDate, formatTime, isSameDay } from './calendar-workspace-utils';

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

const HOURS = Array.from({ length: 11 }, (_, index) => index + 8);
const HOUR_HEIGHT = 62;

function TimelineEvent({ event, onOpen }: { event: NormalizedCalendarEvent; onOpen: (event: NormalizedCalendarEvent) => void }) {
  const start = eventDate(event);
  if (!start) return null;
  const minutesFromStart = Math.max(0, (start.getHours() - 8) * 60 + start.getMinutes());
  const top = (minutesFromStart / 60) * HOUR_HEIGHT;
  const height = Math.max(38, (durationMinutes(event) / 60) * HOUR_HEIGHT || 42);
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="absolute inset-x-1 z-10 overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
      style={{ top, height }}
    >
      <span className="block truncate text-[11px] font-bold text-emerald-800">{formatTime(event.start)} · {event.title}</span>
      <span className="block truncate text-[10px] text-emerald-700/80">{event.clientName || event.projectTitle || 'Rendez-vous'}</span>
    </button>
  );
}

export default function ScheduleTimeline({ view, selectedDate, events, onPrevious, onNext, onToday, onViewChange, onOpenEvent, onCreate }: ScheduleTimelineProps) {
  const days = view === 'jour' ? [selectedDate] : Array.from({ length: 7 }, (_, index) => { const date = new Date(selectedDate); date.setDate(date.getDate() + index); return date; });
  const timed = events.filter((event) => eventDate(event) && !event.allDay);

  return (
    <section id="workspace-section-calendar" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.025)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2"><p className="mr-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><CalendarDays className="size-4 text-emerald-600" />Planning</p><button type="button" onClick={onPrevious} aria-label="Période précédente" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft className="size-4" /></button><button type="button" onClick={onToday} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Aujourd’hui</button><button type="button" onClick={onNext} aria-label="Période suivante" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight className="size-4" /></button></div>
        <div className="flex items-center gap-2"><div className="flex rounded-lg border border-slate-200 p-0.5"><button type="button" onClick={() => onViewChange('jour')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === 'jour' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>Jour</button><button type="button" onClick={() => onViewChange('semaine')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === 'semaine' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>Semaine</button></div><button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"><ListFilter className="size-3.5" />Filtres</button></div>
      </div>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className={`grid min-w-[760px] ${view === 'jour' ? 'grid-cols-[56px_minmax(0,1fr)]' : 'grid-cols-[56px_repeat(7,minmax(120px,1fr))]'}`}>
          <div className="border-r border-slate-100" />
          {days.map((day) => <div key={day.toISOString()} className="border-b border-r border-slate-100 px-2 pb-2 text-center"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</p><p className="mt-1 text-sm font-semibold text-slate-800">{day.getDate()}</p></div>)}
          <div className="border-r border-slate-100">{HOURS.map((hour) => <div key={hour} className="h-[62px] pr-2 pt-1 text-right text-[10px] font-medium text-slate-400">{String(hour).padStart(2, '0')}:00</div>)}</div>
          {days.map((day) => {
            const dayEvents = timed.filter((event) => { const date = eventDate(event); return date ? isSameDay(date, day) : false; });
            return <div key={day.toISOString()} className="relative border-r border-slate-100" style={{ height: HOURS.length * HOUR_HEIGHT }}>{HOURS.map((hour) => <div key={hour} className="h-[62px] border-b border-dashed border-slate-100 bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.05))]" />)}{dayEvents.map((event) => <TimelineEvent key={event.id} event={event} onOpen={onOpenEvent} />)}{!dayEvents.length && <span className="absolute left-2 top-[190px] text-[10px] text-slate-300">Libre</span>}</div>;
          })}
        </div>
      </div>
      <button type="button" onClick={onCreate} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"><Plus className="size-4" />Ajouter un créneau</button>
    </section>
  );
}

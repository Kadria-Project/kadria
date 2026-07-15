import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  ListFilter,
  MapPin,
  Plus,
  Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { QUALIFICATION_STATUS_LABELS } from '@/src/lib/appointment-qualification';
import type { CalendarView } from './calendar-workspace-types';
import { durationMinutes, eventDate, formatTime, isSameDay, startOfWeekMonday } from './calendar-workspace-utils';

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
  qualificationAvailable: boolean;
  onMoveEvent: (event: NormalizedCalendarEvent, start: Date) => void;
};

const HOURS = Array.from({ length: 11 }, (_, index) => index + 8);
const HOUR_HEIGHT = 54;

function EventTypeIcon({ event }: { event: NormalizedCalendarEvent }) {
  const className = 'size-3.5 shrink-0';
  const type = (event.type + ' ' + event.title).toLowerCase();

  if (type.includes('chantier') || type.includes('visite')) {
    return <MapPin className={className} aria-hidden="true" />;
  }

  if (type.includes('devis')) {
    return <FileText className={className} aria-hidden="true" />;
  }

  if (event.assignedUserName) {
    return <Users className={className} aria-hidden="true" />;
  }

  return <CalendarDays className={className} aria-hidden="true" />;
}

function getEventTone(event: NormalizedCalendarEvent) {
  const type = (event.type + ' ' + event.title).toLowerCase();

  if (type.includes('chantier') || type.includes('visite')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-950';
  }

  if (type.includes('devis')) {
    return 'border-violet-200 bg-violet-50 text-violet-950';
  }

  return 'border-blue-200 bg-blue-50 text-blue-950';
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

function compactAssigneeName(event: NormalizedCalendarEvent) {
  if (event.isAssignedToCurrentUser) return 'Moi'
  if (!event.assignedUserName) return null

  const parts = event.assignedUserName.split(/\s+/).filter(Boolean)
  return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0]
}

function TimelineEvent({ event, onOpen, qualificationAvailable, onDragStart, onDragEnd }: { event: NormalizedCalendarEvent; onOpen: (event: NormalizedCalendarEvent) => void; qualificationAvailable: boolean; onDragStart: (event: NormalizedCalendarEvent) => void; onDragEnd: () => void }) {
  const start = eventDate(event);
  if (!start) return null;

  const qualificationLabel = event.qualification
    ? QUALIFICATION_STATUS_LABELS[event.qualification.status as keyof typeof QUALIFICATION_STATUS_LABELS] || 'Qualifié'
    : qualificationAvailable && event.rawAppointmentId && event.end && new Date(event.end).getTime() <= Date.now()
      ? 'À qualifier'
      : null;

  const minutesFromStart = Math.max(0, (start.getHours() - 8) * 60 + start.getMinutes());
  const top = (minutesFromStart / 60) * HOUR_HEIGHT;
  const height = Math.max(38, (durationMinutes(event) / 60) * HOUR_HEIGHT || 42);

  return (
    <button
      type="button"
      draggable={Boolean(event.rawAppointmentId && event.status !== 'cancelled')}
      onDragStart={(dragEvent) => { dragEvent.dataTransfer.effectAllowed = 'move'; dragEvent.dataTransfer.setData('text/appointment-id', event.rawAppointmentId || ''); onDragStart(event); }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(event)}
      className={['absolute inset-x-1 z-10 overflow-hidden rounded-lg border px-2.5 py-1.5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500', event.rawAppointmentId && event.status !== 'cancelled' ? 'cursor-grab active:cursor-grabbing' : '', getEventTone(event)].join(' ')}
      style={{ top, height }}
    >
      <span className="flex items-center gap-1.5 truncate text-[10px] font-semibold">
        <EventTypeIcon event={event} />
        {formatTime(event.start)}
      </span>
      <span className="block truncate text-[11px] font-bold leading-4">{event.title}</span>
      {qualificationLabel ? <span className="inline-flex rounded-full bg-white/75 px-1.5 py-0.5 text-[9px] font-semibold text-current/75">{qualificationLabel}</span> : null}
      <span className="flex min-w-0 items-center gap-1.5 truncate text-[10px] text-current/70">
        {event.assignedUserName ? <span className="grid size-4 shrink-0 place-items-center rounded-full bg-white/80 text-[8px] font-bold">{getInitials(event.assignedUserName)}</span> : null}
        <span className="truncate">{[event.clientName || event.projectTitle, compactAssigneeName(event)].filter(Boolean).join(' · ') || 'Rendez-vous'}</span>
      </span>
    </button>
  );
}

export default function ScheduleTimeline({
  view,
  selectedDate,
  events,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  onOpenEvent,
  onCreate,
  qualificationAvailable,
  onMoveEvent,
}: ScheduleTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<NormalizedCalendarEvent | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  const days = view === 'jour'
    ? [selectedDate]
    : Array.from({ length: 7 }, (_, index) => {
        const date = startOfWeekMonday(selectedDate);
        date.setDate(date.getDate() + index);
        return date;
      });
  const timed = events.filter((event) => eventDate(event) && !event.allDay);
  const today = now;
  const moveToNow = () => scrollRef.current?.scrollTo({ top: Math.max(0, ((now.getHours() - 8) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT - 90)), behavior: 'smooth' });

  return (
    <section id="workspace-section-calendar" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.025)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><CalendarDays className="size-4 text-emerald-600" />Planning</p>
          <button type="button" onClick={onPrevious} aria-label="Période précédente" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft className="size-4" /></button>
          <button type="button" onClick={onToday} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Aujourd’hui</button>
          <button type="button" onClick={moveToNow} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Maintenant</button>
          <button type="button" onClick={onNext} aria-label="Période suivante" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight className="size-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <button type="button" onClick={() => onViewChange('jour')} className={['rounded-md px-3 py-1.5 text-xs font-semibold', view === 'jour' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'].join(' ')}>Jour</button>
            <button type="button" onClick={() => onViewChange('semaine')} className={['rounded-md px-3 py-1.5 text-xs font-semibold', view === 'semaine' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'].join(' ')}>Semaine</button>
          </div>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"><ListFilter className="size-3.5" />Filtres</button>
        </div>
      </div>

      <div ref={scrollRef} className="mt-4 max-h-[650px] overflow-auto pb-1">
        <div className={['grid min-w-[760px]', view === 'jour' ? 'grid-cols-[56px_minmax(0,1fr)]' : 'grid-cols-[56px_repeat(7,minmax(120px,1fr))]'].join(' ')}>
          <div className="border-r border-[#DCE5E2]" />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className={['border-b border-r border-[#DCE5E2] px-2 pb-2 text-center', isToday ? 'bg-[#EDF9F2]' : ''].join(' ')}>
                <p className={['text-[10px] font-bold uppercase tracking-wide', isToday ? 'text-emerald-700' : 'text-slate-400'].join(' ')}>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                <p className={['mt-1 flex items-center justify-center gap-1 text-sm font-semibold', isToday ? 'text-emerald-950' : 'text-slate-800'].join(' ')}>{day.getDate()}{isToday ? <span className="size-1.5 rounded-full bg-emerald-500" aria-label="Aujourd’hui" /> : null}</p>
              </div>
            );
          })}
          <div className="border-r border-[#DCE5E2]">{HOURS.map((hour) => <div key={hour} className="h-[54px] border-b border-[#DCE5E2] pr-2 pt-1 text-right text-[10px] font-medium text-slate-500">{String(hour).padStart(2, '0')}:00</div>)}</div>
          {days.map((day) => {
            const dayEvents = timed.filter((event) => {
              const date = eventDate(event);
              return date ? isSameDay(date, day) : false;
            });
            const isToday = isSameDay(day, today);

            return (
              <div key={day.toISOString()} onDragOver={(dragEvent) => { if (dragging) dragEvent.preventDefault(); }} onDrop={(dragEvent) => { dragEvent.preventDefault(); if (!dragging) return; const bounds = dragEvent.currentTarget.getBoundingClientRect(); const offset = Math.max(0, Math.min(HOURS.length * HOUR_HEIGHT - 1, dragEvent.clientY - bounds.top)); const minutes = Math.round(((offset / HOUR_HEIGHT) * 60) / 15) * 15; const start = new Date(day); start.setHours(8 + Math.floor(minutes / 60), minutes % 60, 0, 0); onMoveEvent(dragging, start); setDragging(null); }} className={['relative border-r border-[#DCE5E2]', isToday ? 'bg-[#F7FCF9]' : 'bg-white'].join(' ')} style={{ height: HOURS.length * HOUR_HEIGHT }}>
                {HOURS.map((hour) => <div key={hour} className="h-[54px] border-b border-dashed border-[#EDF2F0]" />)}
                {isToday && now.getHours() >= 8 && now.getHours() < 19 ? <div aria-label="Heure actuelle" className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-rose-400" style={{ top: ((now.getHours() - 8) * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT }}><span className="absolute -left-1 -top-1.5 size-2.5 rounded-full bg-rose-400" /></div> : null}
                {dayEvents.map((event) => <TimelineEvent key={event.id} event={event} onOpen={onOpenEvent} qualificationAvailable={qualificationAvailable} onDragStart={setDragging} onDragEnd={() => setDragging(null)} />)}
                {!dayEvents.length ? (
                  <button type="button" onClick={onCreate} className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg border border-dashed border-emerald-200 bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">
                    <Plus className="size-3.5" />
                    Ajouter un créneau
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500">Déplacez un rendez-vous pour ajuster votre journée.</p>
        <Clock3 className="size-4 text-slate-300" aria-hidden="true" />
      </div>
    </section>
  );
}

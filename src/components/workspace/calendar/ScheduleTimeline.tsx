import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  GripHorizontal,
  ListFilter,
  MapPin,
  Plus,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { QUALIFICATION_STATUS_LABELS } from '@/src/lib/appointment-qualification';
import { CONFIRMATION_STATUS_LABELS } from '@/src/lib/appointment-confirmation';
import type { CalendarView } from './calendar-workspace-types';
import {
  CALENDAR_HOUR_HEIGHT,
  CALENDAR_SLOT_MINUTES,
  calculateCalendarTimeRange,
  durationMinutes,
  eventDate,
  extendCalendarTimeRange,
  formatTime,
  isSameDay,
  minutesSinceStartOfDay,
  snapMinutes,
  startOfWeekMonday,
  type CalendarTimeRange,
} from './calendar-workspace-utils';

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
  workStartTime: string | null;
  workEndTime: string | null;
  savingEventIds: Set<string>;
  onMoveEvent: (event: NormalizedCalendarEvent, start: Date) => void;
  onResizeEvent: (event: NormalizedCalendarEvent, end: Date) => void;
};

type ResizeState = {
  event: NormalizedCalendarEvent;
  dayKey: string;
  end: string;
};

function dayKey(day: Date) {
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

function EventTypeIcon({ event }: { event: NormalizedCalendarEvent }) {
  const className = 'size-3.5 shrink-0';
  const type = (event.type + ' ' + event.title).toLowerCase();
  if (type.includes('chantier') || type.includes('visite')) return <MapPin className={className} aria-hidden="true" />;
  if (type.includes('devis')) return <FileText className={className} aria-hidden="true" />;
  if (event.assignedUserName) return <Users className={className} aria-hidden="true" />;
  return <CalendarDays className={className} aria-hidden="true" />;
}

function getEventTone(event: NormalizedCalendarEvent) {
  const type = (event.type + ' ' + event.title).toLowerCase();
  if (type.includes('chantier') || type.includes('visite')) return 'border-emerald-200 bg-emerald-50 text-emerald-950';
  if (type.includes('devis')) return 'border-violet-200 bg-violet-50 text-violet-950';
  return 'border-blue-200 bg-blue-50 text-blue-950';
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function compactAssigneeName(event: NormalizedCalendarEvent) {
  if (event.isAssignedToCurrentUser) return 'Moi';
  if (!event.assignedUserName) return null;
  const parts = event.assignedUserName.split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];
}

function TimelineEvent({ event, range, currentTime, onOpen, qualificationAvailable, saving, onDragStart, onDragEnd, onResizeStart, onResizeKeyDown }: {
  event: NormalizedCalendarEvent;
  range: CalendarTimeRange;
  currentTime: number;
  onOpen: (event: NormalizedCalendarEvent) => void;
  qualificationAvailable: boolean;
  saving: boolean;
  onDragStart: (event: NormalizedCalendarEvent) => void;
  onDragEnd: () => void;
  onResizeStart: (event: NormalizedCalendarEvent, mouseEvent: React.MouseEvent<HTMLButtonElement>) => void;
  onResizeKeyDown: (event: NormalizedCalendarEvent, keyboardEvent: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const start = eventDate(event);
  if (!start) return null;
  const end = event.end ? new Date(event.end) : null;
  const canResize = Boolean(event.rawAppointmentId && event.status !== 'cancelled' && end && !Number.isNaN(end.getTime()) && end > start);
  const qualificationLabel = event.qualification
    ? QUALIFICATION_STATUS_LABELS[event.qualification.status as keyof typeof QUALIFICATION_STATUS_LABELS] || 'Qualifié'
    : qualificationAvailable && event.rawAppointmentId && event.end && new Date(event.end).getTime() <= currentTime ? 'À qualifier' : null;
  const top = ((minutesSinceStartOfDay(start) - range.startMinutes) / 60) * CALENDAR_HOUR_HEIGHT;
  const height = Math.max(38, (durationMinutes(event) / 60) * CALENDAR_HOUR_HEIGHT || 42);

  return (
    <div className="group absolute inset-x-1 z-10" style={{ top, height }} aria-busy={saving}>
      <button
        type="button"
        draggable={Boolean(event.rawAppointmentId && event.status !== 'cancelled' && !saving)}
        onDragStart={(dragEvent) => { dragEvent.dataTransfer.effectAllowed = 'move'; dragEvent.dataTransfer.setData('text/appointment-id', event.rawAppointmentId || ''); onDragStart(event); }}
        onDragEnd={onDragEnd}
        onClick={() => onOpen(event)}
        className={[
          'h-full w-full overflow-hidden rounded-lg border px-2.5 py-1.5 pr-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500',
          event.rawAppointmentId && event.status !== 'cancelled' && !saving ? 'cursor-grab active:cursor-grabbing' : '',
          saving ? 'opacity-70' : '',
          getEventTone(event),
        ].join(' ')}
      >
        <span className="flex items-center gap-1.5 truncate text-[10px] font-semibold"><EventTypeIcon event={event} />{formatTime(event.start)}</span>
        <span className="block truncate text-[11px] font-bold leading-4">{event.title}</span>
        {event.confirmation ? <span className="inline-flex rounded-full bg-white/75 px-1.5 py-0.5 text-[9px] font-semibold text-current/75">{CONFIRMATION_STATUS_LABELS[event.confirmation.status as keyof typeof CONFIRMATION_STATUS_LABELS]}</span> : null}
        {qualificationLabel ? <span className="inline-flex rounded-full bg-white/75 px-1.5 py-0.5 text-[9px] font-semibold text-current/75">{qualificationLabel}</span> : null}
        <span className="flex min-w-0 items-center gap-1.5 truncate text-[10px] text-current/70">
          {event.assignedUserName ? <span className="grid size-4 shrink-0 place-items-center rounded-full bg-white/80 text-[8px] font-bold">{getInitials(event.assignedUserName)}</span> : null}
          <span className="truncate">{[event.clientName || event.projectTitle, compactAssigneeName(event)].filter(Boolean).join(' · ') || 'Rendez-vous'}</span>
        </span>
      </button>
      {canResize ? <button type="button" aria-label={`Modifier la durée de ${event.title}`} title="Modifier la durée" onMouseDown={(mouseEvent) => onResizeStart(event, mouseEvent)} onClick={(mouseEvent) => mouseEvent.stopPropagation()} onKeyDown={(keyboardEvent) => onResizeKeyDown(event, keyboardEvent)} className="absolute inset-x-2 bottom-0.5 flex h-3 cursor-ns-resize items-center justify-center rounded opacity-0 transition-opacity hover:bg-slate-950/10 focus:opacity-100 focus:outline focus:outline-2 focus:outline-emerald-500 group-hover:opacity-100">
        <GripHorizontal className="size-3" aria-hidden="true" />
      </button> : null}
    </div>
  );
}

export default function ScheduleTimeline({ view, selectedDate, events, onPrevious, onNext, onToday, onViewChange, onOpenEvent, onCreate, qualificationAvailable, workStartTime, workEndTime, savingEventIds, onMoveEvent, onResizeEvent }: ScheduleTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayColumnsRef = useRef(new Map<string, HTMLDivElement>());
  const initialPositionKeyRef = useRef<string | null>(null);
  const requestedNowRef = useRef(false);
  const [dragging, setDragging] = useState<NormalizedCalendarEvent | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [interactionRange, setInteractionRange] = useState<CalendarTimeRange | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);

  const days = useMemo(() => view === 'jour' ? [selectedDate] : Array.from({ length: 7 }, (_, index) => {
    const date = startOfWeekMonday(selectedDate);
    date.setDate(date.getDate() + index);
    return date;
  }), [selectedDate, view]);
  const timed = useMemo(() => events.filter((event) => eventDate(event) && !event.allDay), [events]);
  const visibleTimed = useMemo(() => timed.filter((event) => {
    const date = eventDate(event);
    return date ? days.some((day) => isSameDay(date, day)) : false;
  }), [days, timed]);
  const calculatedRange = useMemo(() => calculateCalendarTimeRange(visibleTimed, workStartTime, workEndTime), [visibleTimed, workEndTime, workStartTime]);
  const range = interactionRange || calculatedRange;
  const hours = useMemo(() => Array.from({ length: Math.ceil((range.endMinutes - range.startMinutes) / 60) }, (_, index) => Math.floor(range.startMinutes / 60) + index), [range]);
  const gridHeight = ((range.endMinutes - range.startMinutes) / 60) * CALENDAR_HOUR_HEIGHT;

  const scrollToNow = () => {
    const target = Math.max(0, ((minutesSinceStartOfDay(now) - range.startMinutes) / 60) * CALENDAR_HOUR_HEIGHT - 90);
    scrollRef.current?.scrollTo({ top: target, behavior: 'smooth' });
  };

  useEffect(() => {
    const key = `${view}:${selectedDate.toDateString()}`;
    if (initialPositionKeyRef.current === key && !requestedNowRef.current) return;
    initialPositionKeyRef.current = key;
    const isTodayVisible = days.some((day) => isSameDay(day, now));
    const firstEvent = [...visibleTimed].sort((left, right) => (eventDate(left)?.getTime() || 0) - (eventDate(right)?.getTime() || 0))[0];
    const firstMinutes = firstEvent ? minutesSinceStartOfDay(eventDate(firstEvent)!) : range.startMinutes;
    const targetMinutes = requestedNowRef.current || isTodayVisible ? minutesSinceStartOfDay(now) : firstMinutes;
    requestedNowRef.current = false;
    const frame = window.requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: Math.max(0, ((targetMinutes - range.startMinutes) / 60) * CALENDAR_HOUR_HEIGHT - 75) }));
    return () => window.cancelAnimationFrame(frame);
  }, [days, now, range.startMinutes, selectedDate, view, visibleTimed]);

  useEffect(() => {
    if (!resize) return;
    const onMouseMove = (mouseEvent: MouseEvent) => {
      const column = dayColumnsRef.current.get(resize.dayKey);
      const start = eventDate(resize.event);
      if (!column || !start) return;
      const bounds = column.getBoundingClientRect();
      const offset = Math.max(0, Math.min(gridHeight, mouseEvent.clientY - bounds.top));
      const nextMinutes = Math.min(24 * 60, Math.max(minutesSinceStartOfDay(start) + CALENDAR_SLOT_MINUTES, range.startMinutes + snapMinutes((offset / CALENDAR_HOUR_HEIGHT) * 60)));
      const nextEnd = new Date(start);
      nextEnd.setHours(Math.floor(nextMinutes / 60), nextMinutes % 60, 0, 0);
      setResize((current) => current ? { ...current, end: nextEnd.toISOString() } : null);
      setInteractionRange((current) => extendCalendarTimeRange(current || calculatedRange, minutesSinceStartOfDay(start), nextMinutes));
      const scrollBounds = scrollRef.current?.getBoundingClientRect();
      if (scrollBounds && mouseEvent.clientY > scrollBounds.bottom - 40) scrollRef.current?.scrollBy({ top: 16 });
      if (scrollBounds && mouseEvent.clientY < scrollBounds.top + 40) scrollRef.current?.scrollBy({ top: -16 });
    };
    const onMouseUp = () => {
      const current = resize;
      setResize(null);
      setInteractionRange(null);
      if (current.end !== current.event.end) onResizeEvent(current.event, new Date(current.end));
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [calculatedRange, gridHeight, onResizeEvent, range.startMinutes, resize]);

  const handleResizeStart = (event: NormalizedCalendarEvent, day: Date, mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    if (!event.end || savingEventIds.has(event.rawAppointmentId || '')) return;
    setInteractionRange(calculatedRange);
    setResize({ event, dayKey: dayKey(day), end: event.end });
  };
  const handleResizeKeyDown = (event: NormalizedCalendarEvent, keyboardEvent: React.KeyboardEvent<HTMLButtonElement>) => {
    if (keyboardEvent.key !== 'ArrowUp' && keyboardEvent.key !== 'ArrowDown') return;
    keyboardEvent.preventDefault();
    const start = eventDate(event);
    const end = event.end ? new Date(event.end) : null;
    if (!start || !end || Number.isNaN(end.getTime())) return;
    const nextMinutes = Math.max(minutesSinceStartOfDay(start) + CALENDAR_SLOT_MINUTES, Math.min(24 * 60, minutesSinceStartOfDay(end) + (keyboardEvent.key === 'ArrowUp' ? -CALENDAR_SLOT_MINUTES : CALENDAR_SLOT_MINUTES)));
    const nextEnd = new Date(start);
    nextEnd.setHours(Math.floor(nextMinutes / 60), nextMinutes % 60, 0, 0);
    onResizeEvent(event, nextEnd);
  };
  const handleNow = () => {
    if (days.some((day) => isSameDay(day, now))) scrollToNow();
    else { requestedNowRef.current = true; onToday(); }
  };

  return (
    <section id="workspace-section-calendar" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.025)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2"><p className="mr-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><CalendarDays className="size-4 text-emerald-600" />Planning</p><button type="button" onClick={onPrevious} aria-label="Période précédente" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft className="size-4" /></button><button type="button" onClick={onToday} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Aujourd’hui</button><button type="button" onClick={handleNow} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Maintenant</button><button type="button" onClick={onNext} aria-label="Période suivante" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight className="size-4" /></button></div>
        <div className="flex items-center gap-2"><div className="flex rounded-lg border border-slate-200 p-0.5"><button type="button" onClick={() => onViewChange('jour')} className={['rounded-md px-3 py-1.5 text-xs font-semibold', view === 'jour' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'].join(' ')}>Jour</button><button type="button" onClick={() => onViewChange('semaine')} className={['rounded-md px-3 py-1.5 text-xs font-semibold', view === 'semaine' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'].join(' ')}>Semaine</button></div><button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"><ListFilter className="size-3.5" />Filtres</button></div>
      </div>
      <div ref={scrollRef} className="mt-4 h-[clamp(420px,calc(100vh-300px),650px)] overflow-auto pb-1">
        <div className={['grid min-w-[760px]', view === 'jour' ? 'grid-cols-[56px_minmax(0,1fr)]' : 'grid-cols-[56px_repeat(7,minmax(120px,1fr))]'].join(' ')}>
          <div className="sticky left-0 top-0 z-40 border-b border-r border-[#DCE5E2] bg-white" />
          {days.map((day) => { const isToday = isSameDay(day, now); return <div key={dayKey(day)} className={['sticky top-0 z-30 border-b border-r border-[#DCE5E2] px-2 pb-2 text-center', isToday ? 'bg-[#EDF9F2]' : 'bg-white'].join(' ')}><p className={['text-[10px] font-bold uppercase tracking-wide', isToday ? 'text-emerald-700' : 'text-slate-400'].join(' ')}>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</p><p className={['mt-1 flex items-center justify-center gap-1 text-sm font-semibold', isToday ? 'text-emerald-950' : 'text-slate-800'].join(' ')}>{day.getDate()}{isToday ? <span className="size-1.5 rounded-full bg-emerald-500" aria-label="Aujourd’hui" /> : null}</p></div>; })}
          <div className="sticky left-0 z-20 border-r border-[#DCE5E2] bg-white">{hours.map((hour) => <div key={hour} className="h-[54px] border-b border-[#DCE5E2] pr-2 pt-1 text-right text-[10px] font-medium text-slate-500">{String(hour).padStart(2, '0')}:00</div>)}</div>
          {days.map((day) => {
            const key = dayKey(day);
            const dayEvents = visibleTimed.filter((event) => { const date = eventDate(event); return date ? isSameDay(date, day) : false; });
            const isToday = isSameDay(day, now);
            return <div key={key} ref={(node) => { if (node) dayColumnsRef.current.set(key, node); else dayColumnsRef.current.delete(key); }} onDragOver={(dragEvent) => { if (dragging) dragEvent.preventDefault(); }} onDrop={(dragEvent) => { dragEvent.preventDefault(); if (!dragging) return; const bounds = dragEvent.currentTarget.getBoundingClientRect(); const offset = Math.max(0, Math.min(gridHeight - 1, dragEvent.clientY - bounds.top)); const minutes = range.startMinutes + snapMinutes((offset / CALENDAR_HOUR_HEIGHT) * 60); const start = new Date(day); start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0); onMoveEvent(dragging, start); setDragging(null); setInteractionRange(null); }} className={['relative border-r border-[#DCE5E2]', isToday ? 'bg-[#F7FCF9]' : 'bg-white'].join(' ')} style={{ height: gridHeight }}>
              {hours.map((hour) => <div key={hour} className="h-[54px] border-b border-dashed border-[#EDF2F0]" />)}
              {isToday && minutesSinceStartOfDay(now) >= range.startMinutes && minutesSinceStartOfDay(now) < range.endMinutes ? <div aria-label="Heure actuelle" className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-rose-400" style={{ top: ((minutesSinceStartOfDay(now) - range.startMinutes) / 60) * CALENDAR_HOUR_HEIGHT }}><span className="absolute -left-1 -top-1.5 size-2.5 rounded-full bg-rose-400" /></div> : null}
              {dayEvents.map((event) => { const preview = resize?.event.rawAppointmentId === event.rawAppointmentId ? { ...event, end: resize.end } : event; return <TimelineEvent key={event.id} event={preview} range={range} currentTime={now.getTime()} onOpen={onOpenEvent} qualificationAvailable={qualificationAvailable} saving={savingEventIds.has(event.rawAppointmentId || '')} onDragStart={(item) => { setInteractionRange(calculatedRange); setDragging(item); }} onDragEnd={() => { setDragging(null); setInteractionRange(null); }} onResizeStart={(item, mouseEvent) => handleResizeStart(item, day, mouseEvent)} onResizeKeyDown={handleResizeKeyDown} />; })}
              {!dayEvents.length ? <button type="button" onClick={onCreate} className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg border border-dashed border-emerald-200 bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"><Plus className="size-3.5" />Ajouter un créneau</button> : null}
            </div>;
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">Déplacez ou redimensionnez un rendez-vous pour ajuster votre journée.</p><Clock3 className="size-4 text-slate-300" aria-hidden="true" /></div>
    </section>
  );
}

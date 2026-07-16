'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Plus, UsersRound } from 'lucide-react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import type { CalendarView, TeamPlanningMember } from './calendar-workspace-types';
import { CALENDAR_HOUR_HEIGHT, buildAppointmentOverlapGroups, calculateCalendarTimeRange, eventDate, formatDuration, formatTime, isSameDay, minutesSinceStartOfDay, snapMinutes, startOfWeekMonday } from './calendar-workspace-utils';

type TeamScheduleTimelineProps = {
  view: CalendarView;
  selectedDate: Date;
  events: NormalizedCalendarEvent[];
  members: TeamPlanningMember[];
  selectedMemberIds: string[];
  onToggleMember: (memberId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onDaySelect: (day: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onOpenEvent: (event: NormalizedCalendarEvent) => void;
  onCreate: (assignedUserId?: string) => void;
  onMoveEvent: (event: NormalizedCalendarEvent, nextStart: Date, assignedUserId: string) => void;
  workStartTime: string | null;
  workEndTime: string | null;
  savingEventIds: Set<string>;
};

const UNASSIGNED_ID = '__unassigned__';
const MEMBER_COLORS = ['border-emerald-300 bg-emerald-50 text-emerald-950', 'border-sky-300 bg-sky-50 text-sky-950', 'border-violet-300 bg-violet-50 text-violet-950', 'border-amber-300 bg-amber-50 text-amber-950', 'border-rose-300 bg-rose-50 text-rose-950'];

function dayKey(day: Date) {
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

function memberColor(memberId: string) {
  let hash = 0;
  for (const character of memberId) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

function startForDrop(day: Date, minutes: number) {
  const next = new Date(day);
  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return next;
}

function TeamAppointment({ event, range, placement, saving, onOpen, onDragStart, onDragEnd }: {
  event: NormalizedCalendarEvent;
  range: { startMinutes: number; endMinutes: number };
  placement?: { column: number; columnCount: number };
  saving: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const start = eventDate(event);
  const end = event.end ? new Date(event.end) : null;
  if (!start || !end || end <= start) return null;
  const top = ((minutesSinceStartOfDay(start) - range.startMinutes) / 60) * CALENDAR_HOUR_HEIGHT;
  const height = Math.max(42, ((end.getTime() - start.getTime()) / 3_600_000) * CALENDAR_HOUR_HEIGHT - 4);
  const movable = event.status !== 'cancelled' && !saving;
  return (
    <button
      type="button"
      draggable={movable}
      onClick={onOpen}
      onDragStart={(dragEvent) => {
        if (!movable) return;
        dragEvent.dataTransfer.effectAllowed = 'move';
        dragEvent.dataTransfer.setData('text/plain', event.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={[
        'group absolute z-10 overflow-hidden rounded-lg border-l-4 px-2 py-1.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:-translate-y-px hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500',
        memberColor(event.assignedUserId || event.id),
        movable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-75',
      ].join(' ')}
      style={{ top, height, left: `calc(${((placement?.column || 0) / Math.max(1, placement?.columnCount || 1)) * 100}% + 4px)`, width: `calc(${100 / Math.max(1, placement?.columnCount || 1)}% - 8px)` }}
      aria-label={`${event.title}, ${formatTime(event.start) || ''}`}
    >
      <span className="block truncate text-[11px] font-bold leading-4">{event.title}</span>
      <span className="block truncate text-[10px] leading-4 opacity-75">{event.clientName || event.projectTitle || 'Rendez-vous'}</span>
      {height >= 64 ? <span className="block text-[10px] font-semibold leading-4 opacity-75">{formatTime(event.start)} · {formatDuration(Math.round((end.getTime() - start.getTime()) / 60_000))}</span> : null}
      {saving ? <span className="absolute right-1 top-1 rounded bg-white/80 px-1 text-[9px] font-semibold">Enregistrement…</span> : null}
    </button>
  );
}

export default function TeamScheduleTimeline({ view, selectedDate, events, members, selectedMemberIds, onToggleMember, onPrevious, onNext, onToday, onDaySelect, onViewChange, onOpenEvent, onCreate, onMoveEvent, workStartTime, workEndTime, savingEventIds }: TeamScheduleTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<NormalizedCalendarEvent | null>(null);
  // Keep SSR and the first client render deterministic before starting the clock.
  const [now, setNow] = useState(() => new Date(0));
  useEffect(() => { const frame = window.requestAnimationFrame(() => setNow(new Date())); const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => { window.cancelAnimationFrame(frame); window.clearInterval(timer); }; }, []);

  const visibleMembers = useMemo(() => members.filter((member) => selectedMemberIds.includes(member.userId)), [members, selectedMemberIds]);
  const days = useMemo(() => view === 'jour' ? [selectedDate] : Array.from({ length: 7 }, (_, index) => {
    const date = startOfWeekMonday(selectedDate);
    date.setDate(date.getDate() + index);
    return date;
  }), [selectedDate, view]);
  const timed = useMemo(() => events.filter((event) => event.source === 'kadria-appointment' && !event.allDay && eventDate(event) && event.end), [events]);
  const range = useMemo(() => calculateCalendarTimeRange(timed, workStartTime, workEndTime), [timed, workEndTime, workStartTime]);
  const hours = useMemo(() => Array.from({ length: Math.ceil((range.endMinutes - range.startMinutes) / 60) }, (_, index) => Math.floor(range.startMinutes / 60) + index), [range]);
  const gridHeight = ((range.endMinutes - range.startMinutes) / 60) * CALENDAR_HOUR_HEIGHT;
  const showUnassigned = timed.some((event) => !event.assignedUserId);
  const columns = useMemo(() => [
    ...visibleMembers.map((member) => ({ id: member.userId, name: member.isMe ? 'Moi' : member.name, member })),
    ...(showUnassigned ? [{ id: UNASSIGNED_ID, name: 'Sans collaborateur', member: null }] : []),
  ], [showUnassigned, visibleMembers]);

  const handleNow = () => {
    if (!days.some((day) => isSameDay(day, now))) { onToday(); return; }
    const top = Math.max(0, ((minutesSinceStartOfDay(now) - range.startMinutes) / 60) * CALENDAR_HOUR_HEIGHT - 90);
    scrollRef.current?.scrollTo({ top, behavior: 'smooth' });
  };

  const weekCells = useMemo(() => new Map(columns.flatMap((column) => days.map((day) => {
    const key = `${column.id}:${dayKey(day)}`;
    const items = timed.filter((event) => {
      const eventDay = eventDate(event);
      return eventDay && isSameDay(eventDay, day) && (column.id === UNASSIGNED_ID ? !event.assignedUserId : event.assignedUserId === column.id);
    });
    return [key, items] as const;
  }))), [columns, days, timed]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.025)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><UsersRound className="size-4 text-emerald-600" />Planning d’équipe</p>
          <button type="button" onClick={onPrevious} aria-label="Période précédente" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft className="size-4" /></button>
          <button type="button" onClick={onToday} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Aujourd’hui</button>
          <button type="button" onClick={handleNow} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Maintenant</button>
          <button type="button" onClick={onNext} aria-label="Période suivante" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight className="size-4" /></button>
        </div>
        <div className="flex items-center gap-2"><div className="flex rounded-lg border border-slate-200 p-0.5"><button type="button" onClick={() => onViewChange('jour')} className={['rounded-md px-3 py-1.5 text-xs font-semibold', view === 'jour' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'].join(' ')}>Jour</button><button type="button" onClick={() => onViewChange('semaine')} className={['rounded-md px-3 py-1.5 text-xs font-semibold', view === 'semaine' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'].join(' ')}>Semaine</button></div></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {members.map((member) => <button key={member.userId} type="button" onClick={() => onToggleMember(member.userId)} className={['rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors', selectedMemberIds.includes(member.userId) ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'].join(' ')}>{member.isMe ? 'Moi' : member.name}</button>)}
      </div>
      {view === 'semaine' ? <div className="mt-4 overflow-x-auto"><div className="min-w-[840px] overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[180px_repeat(7,minmax(92px,1fr))] bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500"><div className="px-3 py-2.5">Collaborateur</div>{days.map((day) => <div key={dayKey(day)} className="border-l border-slate-200 px-2 py-2.5 text-center">{day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</div>)}</div>{columns.map((column) => <div key={column.id} className="grid grid-cols-[180px_repeat(7,minmax(92px,1fr))] border-t border-slate-200"><div className="flex items-center gap-2 px-3 py-3 text-sm font-semibold text-slate-800"><span className={['size-2 rounded-full', column.member ? 'bg-emerald-500' : 'bg-slate-300'].join(' ')} />{column.name}</div>{days.map((day) => { const items = weekCells.get(`${column.id}:${dayKey(day)}`) || []; const total = items.reduce((sum, item) => sum + (item.start && item.end ? Math.round((new Date(item.end).getTime() - new Date(item.start).getTime()) / 60_000) : 0), 0); const overlaps = buildAppointmentOverlapGroups(items.map((item) => ({ id: item.id, start: item.start, end: item.end, status: item.status }))).groups.filter((group) => group.columnCount > 1).length; return <button key={dayKey(day)} type="button" onClick={() => { onDaySelect(day); onViewChange('jour'); }} className="min-h-16 border-l border-slate-200 px-2 py-2 text-left hover:bg-emerald-50"><span className="block text-sm font-bold text-slate-800">{items.length || '—'}</span><span className="block text-[10px] text-slate-500">{items.length ? formatDuration(total) : 'Libre'}</span>{overlaps ? <span className="mt-1 block text-[10px] font-semibold text-amber-700">{overlaps} chevauchement{overlaps > 1 ? 's' : ''}</span> : null}</button>; })}</div>)}</div></div> : <div ref={scrollRef} className="mt-4 h-[clamp(420px,calc(100vh-300px),650px)] overflow-auto pb-1"><div className="grid min-w-[720px]" style={{ gridTemplateColumns: `56px repeat(${Math.max(1, columns.length)}, minmax(220px, 1fr))` }}><div className="sticky left-0 top-0 z-40 border-b border-r border-slate-200 bg-white" />{columns.map((column) => <div key={column.id} className="sticky top-0 z-30 border-b border-r border-slate-200 bg-white px-3 py-2.5"><p className="truncate text-xs font-bold text-slate-900">{column.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{column.member ? column.member.role : 'À répartir'}</p></div>)}<div className="sticky left-0 z-20 border-r border-slate-200 bg-white">{hours.map((hour) => <div key={hour} className="h-[54px] border-b border-slate-200 pr-2 pt-1 text-right text-[10px] font-medium text-slate-500">{String(hour).padStart(2, '0')}:00</div>)}</div>{columns.map((column) => { const columnEvents = timed.filter((event) => column.id === UNASSIGNED_ID ? !event.assignedUserId : event.assignedUserId === column.id).filter((event) => { const date = eventDate(event); return date ? isSameDay(date, selectedDate) : false; }); const placementById = new Map(buildAppointmentOverlapGroups(columnEvents.map((event) => ({ id: event.id, start: event.start, end: event.end, status: event.status }))).placements.map((placement) => [placement.id, placement])); return <div key={column.id} onDragOver={(dragEvent) => { if (dragging && column.member) dragEvent.preventDefault(); }} onDrop={(dragEvent) => { dragEvent.preventDefault(); if (!dragging || !column.member) return; const bounds = dragEvent.currentTarget.getBoundingClientRect(); const offset = Math.max(0, Math.min(gridHeight - 1, dragEvent.clientY - bounds.top)); const minutes = range.startMinutes + snapMinutes((offset / CALENDAR_HOUR_HEIGHT) * 60); onMoveEvent(dragging, startForDrop(selectedDate, minutes), column.id); setDragging(null); }} className={['relative border-r border-slate-200', column.id === UNASSIGNED_ID ? 'bg-slate-50/70' : 'bg-white'].join(' ')} style={{ height: gridHeight }}>{hours.map((hour) => <div key={hour} className="h-[54px] border-b border-dashed border-slate-100" />)}{isSameDay(selectedDate, now) && minutesSinceStartOfDay(now) >= range.startMinutes && minutesSinceStartOfDay(now) < range.endMinutes ? <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-rose-400" style={{ top: ((minutesSinceStartOfDay(now) - range.startMinutes) / 60) * CALENDAR_HOUR_HEIGHT }} /> : null}{columnEvents.map((event) => <TeamAppointment key={event.id} event={event} range={range} placement={placementById.get(event.id)} saving={savingEventIds.has(event.rawAppointmentId || '')} onOpen={() => onOpenEvent(event)} onDragStart={() => setDragging(event)} onDragEnd={() => setDragging(null)} />)}{column.member && !columnEvents.length ? <button type="button" onClick={() => onCreate(column.id)} className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg border border-dashed border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"><Plus className="size-3.5" />Ajouter un créneau</button> : null}</div>; })}</div></div>}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">Glissez un rendez-vous vers un collaborateur pour le réaffecter. Les chevauchements restent visibles dans chaque colonne.</p><Clock3 className="size-4 text-slate-300" aria-hidden="true" /></div>
    </section>
  );
}

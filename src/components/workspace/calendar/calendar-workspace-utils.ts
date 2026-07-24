import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';

export const CALENDAR_SLOT_MINUTES = 15;
export const CALENDAR_HOUR_HEIGHT = 54;
export const DEFAULT_CALENDAR_START_MINUTES = 7 * 60;
export const DEFAULT_CALENDAR_END_MINUTES = 19 * 60;
const CALENDAR_MARGIN_MINUTES = 30;
const CALENDAR_REGULAR_MINUTES_START = 5 * 60;
const CALENDAR_REGULAR_MINUTES_END = 23 * 60;

export type CalendarTimeRange = {
  startMinutes: number;
  endMinutes: number;
};

export type AppointmentOverlapInput = {
  id: string;
  start: string | null;
  end: string | null;
  status?: string | null;
  sortLabel?: string | null;
};

export type AppointmentOverlapPlacement = {
  id: string;
  groupId: string;
  column: number;
  columnCount: number;
  overlapCount: number;
};

export type AppointmentOverlapGroup = {
  id: string;
  appointmentIds: string[];
  start: string;
  end: string;
  columnCount: number;
};

export type AppointmentOverlapLayout = {
  groups: AppointmentOverlapGroup[];
  placements: AppointmentOverlapPlacement[];
};

type ParsedOverlapInput = AppointmentOverlapInput & {
  startMs: number;
  endMs: number;
};

function overlaps(left: ParsedOverlapInput, right: ParsedOverlapInput) {
  return left.startMs < right.endMs && left.endMs > right.startMs;
}

/**
 * Regroupe les rendez-vous qui se chevauchent, y compris les chaines de
 * chevauchement indirectes, puis leur attribue une colonne reutilisable.
 * Les rendez-vous qui se touchent seulement restent dans la meme colonne.
 */
export function buildAppointmentOverlapGroups(items: AppointmentOverlapInput[]): AppointmentOverlapLayout {
  const valid = items
    .filter((item) => item.status !== 'cancelled' && item.start && item.end)
    .map((item): ParsedOverlapInput | null => {
      const startMs = new Date(item.start!).getTime();
      const endMs = new Date(item.end!).getTime();
      return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
        ? { ...item, startMs, endMs }
        : null;
    })
    .filter((item): item is ParsedOverlapInput => item !== null)
    .sort((left, right) => left.startMs - right.startMs || right.endMs - left.endMs || (left.sortLabel || left.id).localeCompare(right.sortLabel || right.id) || left.id.localeCompare(right.id));

  const chains: ParsedOverlapInput[][] = [];
  let chain: ParsedOverlapInput[] = [];
  let chainEnd = Number.NEGATIVE_INFINITY;

  for (const item of valid) {
    if (chain.length && item.startMs >= chainEnd) {
      chains.push(chain);
      chain = [];
      chainEnd = Number.NEGATIVE_INFINITY;
    }
    chain.push(item);
    chainEnd = Math.max(chainEnd, item.endMs);
  }
  if (chain.length) chains.push(chain);

  const groups: AppointmentOverlapGroup[] = [];
  const placements: AppointmentOverlapPlacement[] = [];

  chains.forEach((members, index) => {
    const columnEnds: number[] = [];
    const columns = new Map<string, number>();
    for (const member of members) {
      const availableColumn = columnEnds.findIndex((end) => end <= member.startMs);
      const column = availableColumn === -1 ? columnEnds.length : availableColumn;
      columnEnds[column] = member.endMs;
      columns.set(member.id, column);
    }

    const groupId = `overlap-${index}-${members[0].id}`;
    const columnCount = columnEnds.length;
    groups.push({
      id: groupId,
      appointmentIds: members.map((member) => member.id),
      start: new Date(Math.min(...members.map((member) => member.startMs))).toISOString(),
      end: new Date(Math.max(...members.map((member) => member.endMs))).toISOString(),
      columnCount,
    });

    for (const member of members) {
      placements.push({
        id: member.id,
        groupId,
        column: columns.get(member.id) || 0,
        columnCount,
        overlapCount: members.filter((candidate) => candidate.id !== member.id && overlaps(member, candidate)).length,
      });
    }
  });

  return { groups, placements };
}

function timeToMinutes(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function snapMinutes(value: number, direction: 'down' | 'up' | 'nearest' = 'nearest') {
  if (direction === 'down') return Math.floor(value / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_MINUTES;
  if (direction === 'up') return Math.ceil(value / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_MINUTES;
  return Math.round(value / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_MINUTES;
}

export function minutesSinceStartOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function calculateCalendarTimeRange(events: NormalizedCalendarEvent[], workStartTime?: string | null, workEndTime?: string | null): CalendarTimeRange {
  const starts: number[] = [];
  const ends: number[] = [];

  for (const event of events) {
    const start = eventDate(event);
    const end = event.end ? new Date(event.end) : null;
    if (!start || !end || Number.isNaN(end.getTime()) || end <= start) continue;
    starts.push(minutesSinceStartOfDay(start));
    ends.push(minutesSinceStartOfDay(end));
  }

  const configuredStart = timeToMinutes(workStartTime);
  const configuredEnd = timeToMinutes(workEndTime);
  const earliestEvent = starts.length ? Math.min(...starts) - CALENDAR_MARGIN_MINUTES : null;
  const latestEvent = ends.length ? Math.max(...ends) + CALENDAR_MARGIN_MINUTES : null;
  const regularStart = Math.min(configuredStart ?? DEFAULT_CALENDAR_START_MINUTES, DEFAULT_CALENDAR_START_MINUTES, earliestEvent ?? Infinity);
  const regularEnd = Math.max(configuredEnd ?? DEFAULT_CALENDAR_END_MINUTES, DEFAULT_CALENDAR_END_MINUTES, latestEvent ?? -Infinity);

  // Les bornes 05:00-23:00 couvrent le fonctionnement habituel. Un rendez-vous
  // réel hors plage étend exceptionnellement la grille au lieu d'être tronqué.
  const startMinutes = snapMinutes(
    earliestEvent !== null && earliestEvent < CALENDAR_REGULAR_MINUTES_START ? earliestEvent : Math.max(CALENDAR_REGULAR_MINUTES_START, regularStart),
    'down',
  );
  const endMinutes = snapMinutes(
    latestEvent !== null && latestEvent > CALENDAR_REGULAR_MINUTES_END ? latestEvent : Math.min(CALENDAR_REGULAR_MINUTES_END, regularEnd),
    'up',
  );

  return {
    startMinutes,
    endMinutes: Math.max(startMinutes + CALENDAR_SLOT_MINUTES, endMinutes),
  };
}

export function extendCalendarTimeRange(range: CalendarTimeRange, startMinutes: number, endMinutes: number): CalendarTimeRange {
  return {
    startMinutes: Math.min(range.startMinutes, snapMinutes(startMinutes, 'down')),
    endMinutes: Math.max(range.endMinutes, snapMinutes(endMinutes, 'up')),
  };
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeekMonday(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day));
  return next;
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

export function isSelectedDateToday(selectedDate: Date, now = new Date()) {
  return isSameDay(selectedDate, now);
}

export function formatSelectedAgendaDate(selectedDate: Date, now = new Date()) {
  const formatted = selectedDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const label = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  return isSelectedDateToday(selectedDate, now) ? `Aujourd’hui · ${label}` : label;
}

export function formatTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function durationMinutes(event: NormalizedCalendarEvent) {
  if (!event.start || !event.end) return 0;
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();
  return Number.isNaN(start) || Number.isNaN(end) ? 0 : Math.max(0, Math.round((end - start) / 60000));
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} h ${remaining}` : `${hours} h`;
}

export function eventDate(event: NormalizedCalendarEvent) {
  if (!event.start) return null;
  const date = new Date(event.start);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function eventLabel(event: NormalizedCalendarEvent) {
  return event.clientName || event.title || 'Rendez-vous';
}

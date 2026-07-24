import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { eventDate, formatTime, isSameDay, minutesSinceStartOfDay } from './calendar-workspace-utils';

type EventTypeByAppointmentId = Record<string, string | null | undefined>;

export type DayRouteStop = { id: string; time: string | null; label: string; address: string };
export type AvailableSlot = { start: string; end: string; minutes: number; label: string };

export type AgendaDaySummary = {
  appointmentCount: number;
  plannedMinutes: number | null;
  travelMinutes: number | null;
  estimatedEnd: string | null;
  incompleteDurations: boolean;
  availableMinutes: number | null;
  availableSlots: AvailableSlot[] | null;
  routeStops: DayRouteStop[] | null;
  mapsUrl: string | null;
};

const isActive = (event: NormalizedCalendarEvent) => event.status !== 'cancelled' && event.confirmation?.status !== 'cancelled';
const toMinutes = (value: string | null | undefined) => {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
const timeLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function getSelectedDayEvents(events: NormalizedCalendarEvent[], selectedDate: Date) {
  return events.filter((event) => {
    const date = eventDate(event);
    return Boolean(date && isSameDay(date, selectedDate) && isActive(event) && !event.allDay);
  }).sort((left, right) => new Date(left.start || 0).getTime() - new Date(right.start || 0).getTime());
}

export function formatAgendaDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h${rest ? ` ${rest}` : ''}` : `${rest} min`;
}

export function deriveAgendaDaySummary({ events, selectedDate, eventTypesByAppointmentId, workStartTime, workEndTime }: { events: NormalizedCalendarEvent[]; selectedDate: Date; eventTypesByAppointmentId: EventTypeByAppointmentId; workStartTime: string | null; workEndTime: string | null }): AgendaDaySummary {
  const today = getSelectedDayEvents(events, selectedDate);
  const appointments = today.filter((event) => eventTypesByAppointmentId[event.rawAppointmentId || ''] !== 'travel');
  const travel = today.filter((event) => eventTypesByAppointmentId[event.rawAppointmentId || ''] === 'travel');
  const dated = today.filter((event) => event.start && event.end && new Date(event.end).getTime() > new Date(event.start).getTime());
  const incompleteDurations = today.some((event) => !event.start || !event.end || new Date(event.end).getTime() <= new Date(event.start).getTime());
  const totalDuration = (items: NormalizedCalendarEvent[]) => items.reduce((total, event) => total + Math.round((new Date(event.end!).getTime() - new Date(event.start!).getTime()) / 60_000), 0);
  const plannedMinutes = appointments.length && !appointments.some((event) => !event.start || !event.end || new Date(event.end).getTime() <= new Date(event.start).getTime()) ? totalDuration(appointments) : null;
  const travelMinutes = travel.length && !travel.some((event) => !event.start || !event.end || new Date(event.end).getTime() <= new Date(event.start).getTime()) ? totalDuration(travel) : null;
  const latestEnd = incompleteDurations || !dated.length ? null : new Date(Math.max(...dated.map((event) => new Date(event.end!).getTime())));
  const routeStops = appointments.length >= 2 && appointments.every((event) => Boolean(event.address || event.location)) ? appointments.map((event) => ({ id: event.id, time: formatTime(event.start), label: event.clientName || event.projectTitle || event.title || 'Rendez-vous', address: event.address || event.location || '' })) : null;
  const mapsUrl = routeStops ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(routeStops[0].address)}&destination=${encodeURIComponent(routeStops[routeStops.length - 1].address)}${routeStops.length > 2 ? `&waypoints=${encodeURIComponent(routeStops.slice(1, -1).map((stop) => stop.address).join('|'))}` : ''}` : null;
  const workStart = toMinutes(workStartTime);
  const workEnd = toMinutes(workEndTime);
  if (workStart === null || workEnd === null || workEnd <= workStart || incompleteDurations) return { appointmentCount: appointments.length, plannedMinutes, travelMinutes, estimatedEnd: latestEnd ? formatTime(latestEnd.toISOString()) : null, incompleteDurations, availableMinutes: null, availableSlots: null, routeStops, mapsUrl };

  const occupied = dated.map((event) => ({ start: Math.max(workStart, minutesSinceStartOfDay(new Date(event.start!))), end: Math.min(workEnd, minutesSinceStartOfDay(new Date(event.end!))) })).filter((slot) => slot.end > slot.start).sort((left, right) => left.start - right.start);
  const slots: AvailableSlot[] = [];
  let cursor = workStart;
  for (const slot of occupied) {
    if (slot.start > cursor) {
      const minutes = slot.start - cursor;
      if (minutes >= 30) slots.push({ start: timeLabel(cursor), end: timeLabel(slot.start), minutes, label: minutes >= 45 ? 'Suffisant pour une courte intervention' : 'Suffisant pour un appel' });
    }
    cursor = Math.max(cursor, slot.end);
  }
  if (cursor < workEnd) {
    const minutes = workEnd - cursor;
    if (minutes >= 30) slots.push({ start: timeLabel(cursor), end: timeLabel(workEnd), minutes, label: minutes >= 45 ? 'Suffisant pour une courte intervention' : 'Suffisant pour un appel' });
  }
  return { appointmentCount: appointments.length, plannedMinutes, travelMinutes, estimatedEnd: latestEnd ? formatTime(latestEnd.toISOString()) : null, incompleteDurations, availableMinutes: slots.reduce((total, slot) => total + slot.minutes, 0), availableSlots: slots, routeStops, mapsUrl };
}

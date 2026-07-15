import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';

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

export function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
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

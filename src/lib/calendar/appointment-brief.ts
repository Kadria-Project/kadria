import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';

function clean(value: string | null | undefined, maximum = 170) {
  const normalized = value?.replace(/\s+/g, ' ').trim() || '';
  return normalized.length > maximum ? `${normalized.slice(0, maximum - 1).trimEnd()}…` : normalized;
}

export function buildAppointmentBrief(event: NormalizedCalendarEvent) {
  const lines = [
    clean(event.projectSummary || event.description),
    event.budget ? `Budget annoncé : ${clean(event.budget, 80)}.` : '',
    event.desiredTimeline ? `Délai souhaité : ${clean(event.desiredTimeline, 80)}.` : '',
  ].filter(Boolean).slice(0, 3);

  return lines.length ? lines : ['Consultez le dossier pour préparer ce rendez-vous.'];
}

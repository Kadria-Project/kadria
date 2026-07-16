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
    event.photoCount > 0 ? `${event.photoCount} photo${event.photoCount > 1 ? 's' : ''} disponible${event.photoCount > 1 ? 's' : ''}.` : '',
  ].filter(Boolean).slice(0, 4);

  return lines.length ? lines : ['Consultez le dossier pour préparer ce rendez-vous.'];
}

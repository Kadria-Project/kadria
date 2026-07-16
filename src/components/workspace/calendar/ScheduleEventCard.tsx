import { BriefcaseBusiness, CalendarDays, CarFront, MapPin, UserRound } from 'lucide-react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { QUALIFICATION_STATUS_LABELS } from '@/src/lib/appointment-qualification';
import { getAppointmentStatusPresentation } from '@/src/lib/calendar/appointment-status-presentation';
import { durationMinutes, formatDuration, formatTime } from './calendar-workspace-utils';

function compactAssigneeName(event: NormalizedCalendarEvent) {
  if (event.isAssignedToCurrentUser) return 'Moi';
  if (!event.assignedUserName) return null;

  const parts = event.assignedUserName.split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];
}

export default function ScheduleEventCard({ event, onOpen }: { event: NormalizedCalendarEvent; onOpen: (event: NormalizedCalendarEvent) => void }) {
  const start = formatTime(event.start);
  const end = formatTime(event.end);
  const place = event.address || event.location;
  const assigneeLabel = compactAssigneeName(event);
  const statusPresentation = getAppointmentStatusPresentation(event.confirmation);

  return (
    <button type="button" onClick={() => onOpen(event)} className={['group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.025)] transition duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500', event.source === 'kadria-appointment' ? statusPresentation.cardClassName : 'border-slate-200 bg-white text-slate-900'].join(' ')}>
      <span className="w-11 shrink-0 text-xs font-semibold text-slate-500">{start || '-'}<br />{end || ''}</span>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
        {event.type === 'chantier' ? <BriefcaseBusiness className="size-4" /> : event.type === 'google-event' ? <CalendarDays className="size-4" /> : <CarFront className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{event.title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{event.clientName || event.projectTitle || 'Rendez-vous'}</span>
        {event.source === 'kadria-appointment' ? <span className={['mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold', statusPresentation.badgeClassName].join(' ')}>{statusPresentation.label}</span> : null}
        {event.qualification ? <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{QUALIFICATION_STATUS_LABELS[event.qualification.status as keyof typeof QUALIFICATION_STATUS_LABELS] || 'Qualifié'}</span> : null}
      </span>
      {assigneeLabel ? <span className="hidden items-center gap-1 text-xs text-slate-500 md:flex"><UserRound className="size-3.5 shrink-0" />{assigneeLabel}</span> : null}
      {place ? <span className="hidden max-w-44 items-center gap-1 truncate text-xs text-slate-500 lg:flex"><MapPin className="size-3.5 shrink-0" />{place}</span> : null}
      <span className="shrink-0 text-xs font-medium text-slate-500">{formatDuration(durationMinutes(event))}</span>
    </button>
  );
}

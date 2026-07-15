import { History } from 'lucide-react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { eventLabel, formatTime } from './calendar-workspace-utils';

export default function DayActivityTimeline({ events }: { events: NormalizedCalendarEvent[] }) {
  const activities = [...events].sort((left, right) => new Date(left.start || 0).getTime() - new Date(right.start || 0).getTime());

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        <History className="size-4 text-emerald-600" /> Activité du jour
      </p>
      {activities.length ? (
        <ol className="mt-4 space-y-3">
          {activities.map((event) => (
            <li key={event.id} className="grid grid-cols-[48px_1fr] gap-3">
              <time className="pt-0.5 text-xs font-semibold text-slate-500">{formatTime(event.start) || '—'}</time>
              <div className="border-l-2 border-emerald-200 pl-3">
                <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{eventLabel(event)}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Aucune activité prévue aujourd’hui.</p>
      )}
    </section>
  );
}

import { History } from 'lucide-react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { eventDate, eventLabel, formatTime } from './calendar-workspace-utils';

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 18;
const HOURS = [8, 10, 12, 14, 16, 18];

function getPosition(event: NormalizedCalendarEvent) {
  const date = eventDate(event);
  if (!date) return 0;

  const minutes = (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes();
  return Math.min(96, Math.max(2, (minutes / ((DAY_END_HOUR - DAY_START_HOUR) * 60)) * 100));
}

export default function DayActivityTimeline({ events }: { events: NormalizedCalendarEvent[] }) {
  const activities = [...events]
    .filter((event) => eventDate(event))
    .sort((left, right) => new Date(left.start || 0).getTime() - new Date(right.start || 0).getTime());

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.025)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          <History className="size-4 text-emerald-600" /> Activité du jour
        </p>
        <span className="text-[11px] font-medium text-slate-400">{activities.length} rendez-vous</span>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="relative min-w-[620px] px-3 pt-5">
          <div className="absolute left-3 right-3 top-10 h-px bg-[#DCE5E2]" />
          <div className="relative flex justify-between text-[10px] font-medium text-slate-400">
            {HOURS.map((hour) => <span key={hour}>{String(hour).padStart(2, '0')} h</span>)}
          </div>

          {activities.length ? (
            <div className="relative mt-2 h-[70px]">
              {activities.map((event, index) => (
                <div
                  key={event.id}
                  className="absolute w-28 -translate-x-1/2"
                  style={{ left: getPosition(event) + '%', top: index % 2 === 0 ? 0 : 31 }}
                  title={eventLabel(event)}
                >
                  <span className="mx-auto block size-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                  <p className="mt-1 truncate text-center text-[10px] font-semibold text-slate-700">{formatTime(event.start)} · {event.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative mt-2 h-[70px]">
              <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-50 px-3 py-1.5 text-xs text-slate-500">Aucune activité prévue aujourd’hui.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

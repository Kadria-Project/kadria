import { Clock3 } from 'lucide-react';
import { formatDuration } from './calendar-workspace-utils';

export default function ScheduleAvailabilityPanel({ minutes }: { minutes: number }) {
  const percentage = Math.min(100, Math.max(0, Math.round((minutes / 480) * 100)));
  return <section className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><Clock3 className="size-4 text-emerald-600" />Temps non planifié</p><div className="mt-3 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Clock3 className="size-5" /></span><div><p className="text-xl font-semibold tracking-tight text-slate-950">{formatDuration(minutes)}</p><p className="text-xs text-slate-500">sur une journée de 8 h</p></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentage}%` }} /></div><p className="mt-2 text-[11px] leading-4 text-slate-500">Trajets et pauses non inclus.</p></section>;
}

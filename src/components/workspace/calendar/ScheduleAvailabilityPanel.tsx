import { Gauge } from 'lucide-react';
import { formatDuration } from './calendar-workspace-utils';

export default function ScheduleAvailabilityPanel({ minutes }: { minutes: number }) {
  const percentage = Math.min(100, Math.max(0, Math.round((minutes / 480) * 100)));
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Temps non planifié</p><div className="mt-4 flex items-center gap-4"><span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Gauge className="size-6" /></span><div><p className="text-xl font-semibold tracking-tight text-slate-950">{formatDuration(minutes)}</p><p className="text-xs text-slate-500">sur une journée de 8 h</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentage}%` }} /></div><p className="mt-3 text-xs leading-5 text-slate-500">Calculé à partir des rendez-vous horaires. Les trajets et pauses ne sont pas inclus.</p></section>;
}

import { TriangleAlert } from 'lucide-react';
import type { PlanningInsights } from './calendar-workspace-types';
import { formatTime } from './calendar-workspace-utils';

export default function ScheduleConflictPanel({ conflict }: { conflict: PlanningInsights['conflicts'][number] | null }) {
  if (!conflict) return null;
  const start = formatTime(conflict.start);
  const previousStart = formatTime(conflict.conflictingStart);
  return (
    <section className="rounded-2xl border border-red-100 bg-red-50/70 p-5">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-red-600"><TriangleAlert className="size-4" /> Conflit détecté</p>
      <h3 className="mt-4 text-base font-semibold text-slate-950">Deux rendez-vous se chevauchent</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{conflict.title}{start ? ` commence à ${start}` : ''} alors que {conflict.conflictingTitle}{previousStart ? ` est prévu depuis ${previousStart}` : ''}.</p>
      <p className="mt-3 text-xs font-medium text-red-700">Vérifiez l’ordre de ces deux rendez-vous avant de confirmer votre journée.</p>
    </section>
  );
}

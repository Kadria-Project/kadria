import { CircleCheck, TriangleAlert } from 'lucide-react';
import type { PlanningInsights } from './calendar-workspace-types';
import { formatTime } from './calendar-workspace-utils';

type ScheduleConflictPanelProps = {
  conflict: PlanningInsights['conflicts'][number] | null;
  onOpenConflict?: () => void;
};

export default function ScheduleConflictPanel({ conflict, onOpenConflict }: ScheduleConflictPanelProps) {
  if (!conflict) {
    return (
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700"><CircleCheck className="size-4" /> Conflits</p>
        <p className="mt-2 text-sm font-semibold text-emerald-950">Aucun conflit détecté.</p>
        <p className="mt-1 text-xs leading-5 text-emerald-800/75">Votre planning est fluide.</p>
      </section>
    );
  }

  const start = formatTime(conflict.start);
  const previousStart = formatTime(conflict.conflictingStart);

  return (
    <section className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-red-600"><TriangleAlert className="size-4" /> Conflit détecté</p>
      <h3 className="mt-2 text-sm font-semibold text-slate-950">Deux rendez-vous se chevauchent</h3>
      <p className="mt-1.5 text-xs leading-5 text-slate-600">{conflict.title}{start ? ' commence à ' + start : ''} alors que {conflict.conflictingTitle}{previousStart ? ' est prévu depuis ' + previousStart : ''}.</p>
      {onOpenConflict ? <button type="button" onClick={onOpenConflict} className="mt-3 text-xs font-semibold text-red-700 hover:text-red-800">Voir le détail →</button> : null}
    </section>
  );
}

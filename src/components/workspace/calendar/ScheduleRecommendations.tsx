import { CalendarClock, ChevronRight, Route } from 'lucide-react';
import type { PlanningInsights } from './calendar-workspace-types';

type ScheduleRecommendationsProps = {
  insights: PlanningInsights | null;
  onOpenConflict: () => void;
};

export default function ScheduleRecommendations({ insights, onOpenConflict }: ScheduleRecommendationsProps) {
  const conflict = insights?.conflicts[0];
  const travelWarning = insights?.travelWarnings[0];
  if (!conflict && !travelWarning) return null;

  const recommendations = [
    conflict ? { icon: CalendarClock, title: 'Vérifier les deux rendez-vous concernés', benefit: 'Ils se chevauchent dans le planning.', action: 'Voir' } : null,
    travelWarning ? { icon: Route, title: 'Vérifier la marge entre deux visites', benefit: `${travelWarning.gapMinutes} min disponibles pour ${travelWarning.distanceKm} km.`, action: 'Voir' } : null,
  ].filter(Boolean) as Array<{ icon: typeof CalendarClock; title: string; benefit: string; action: string }>;

  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Recommandations Kadria</p><div className="mt-3 divide-y divide-slate-100">{recommendations.map((recommendation) => { const Icon = recommendation.icon; return <div key={recommendation.title} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{recommendation.title}</p><p className="mt-0.5 text-xs text-slate-500">{recommendation.benefit}</p></div><button type="button" onClick={onOpenConflict} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800">{recommendation.action}<ChevronRight className="size-3.5" /></button></div>; })}</div></section>;
}

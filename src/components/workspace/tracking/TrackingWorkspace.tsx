'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, ChartNoAxesCombined, ChevronDown, ShieldCheck } from 'lucide-react';
import type { Project } from '@/src/components/ArtisanDashboard';
import type { OperationsCenterResult } from '@/src/lib/recommendations';
import { buildTrackingProject, formatAmount, TRACKING_STAGES } from './tracking-utils';
import LivingPipeline from './LivingPipeline';

type Props = { projects: Project[]; priorityProjects: Project[]; operationsCenter: OperationsCenterResult | null; onOpenProject: (projectId: string) => void };

export default function TrackingWorkspace({ projects, onOpenProject }: Props) {
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const data = useMemo(() => projects.filter((project) => project.leadStatus !== 'archived').map(buildTrackingProject), [projects]);
  const active = data.filter((item) => item.project.status !== 'Gagné' && item.project.status !== 'Perdu');
  const risks = active.filter((item) => item.isRisk).slice(0, 3);
  const potential = active.reduce((sum, item) => sum + (item.amount || 0), 0);
  return <div className="mx-auto max-w-[1440px] space-y-5 pb-6"><section className="rounded-2xl border border-slate-200 bg-white px-5 py-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Suivi commercial</p><h2 className="mt-1 text-2xl font-semibold text-[#0b2232]">Votre pipeline reste dynamique.</h2><p className="mt-1 text-sm text-slate-600">{active.length} dossiers actifs · {formatAmount(potential)} de potentiel estimé.</p></section><LivingPipeline stages={TRACKING_STAGES} projects={active} onOpenProject={onOpenProject} /><section className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"><section className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-slate-600"><AlertTriangle className="size-4 text-amber-600" />Risques commerciaux</p>{risks.length ? <div className="mt-3 space-y-3">{risks.map((item) => <article key={item.project.id} className="border-l-2 border-amber-400 pl-3"><p className="font-semibold text-slate-800">{item.clientLabel}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.reason}</p><button type="button" onClick={() => onOpenProject(item.project.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">Ouvrir le dossier <ArrowRight className="size-3" /></button></article>)}</div> : <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="size-4 text-emerald-600" />Aucun risque commercial à signaler.</p>}</section><section className="rounded-2xl border border-slate-200 bg-white p-3"><button type="button" onClick={() => setAnalysisOpen((value) => !value)} aria-expanded={analysisOpen} aria-controls="tracking-analysis" className="flex w-full items-center justify-between text-left text-sm font-semibold text-[#0b2232]">Analyse détaillée <ChevronDown className={`size-4 transition-transform ${analysisOpen ? 'rotate-180' : ''}`} /></button>{analysisOpen && <div id="tracking-analysis" className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-slate-50 p-3"><ChartNoAxesCombined className="size-4 text-emerald-700" /><p className="mt-2 text-lg font-semibold">{active.length}</p><p className="text-[11px] text-slate-500">Dossiers actifs</p></div><div className="rounded-lg bg-slate-50 p-3"><ChartNoAxesCombined className="size-4 text-emerald-700" /><p className="mt-2 text-lg font-semibold">{active.length ? formatAmount(Math.round(potential / active.length)) : '—'}</p><p className="text-[11px] text-slate-500">Valeur moyenne</p></div></div>}</section></section></div>;
}

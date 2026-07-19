'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Project } from '@/src/components/ArtisanDashboard';
import type { OperationsCenterResult, OperationsWorkbenchItem } from '@/src/lib/recommendations';
import { ArrowRight, CheckCircle2, Eye } from 'lucide-react';
import { briefSituationSentence, selectBriefSituations, understandingFor, workspaceDestinationFor } from './home-brief';

type Props = {
  firstName: string | null;
  todayLabel: string;
  projects: Project[];
  todayEvents: unknown[];
  operationsCenter: OperationsCenterResult | null;
  onOpenProject: (projectId: string) => void;
  onOpenAgenda: () => void;
};

function isToday(value: unknown) {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function isSince(value: unknown, since: string | null) {
  if (typeof value !== 'string' || !since) return false;
  const date = new Date(value);
  const reference = new Date(since);
  return !Number.isNaN(date.getTime()) && !Number.isNaN(reference.getTime()) && date.getTime() >= reference.getTime() && date.getTime() <= Date.now();
}

function clientLabel(project: Project) {
  return [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || project.projectType || 'Dossier';
}

function getTodayEvents(events: unknown[]) {
  return events.flatMap((event) => {
    if (!event || typeof event !== 'object') return [];
    const value = event as Record<string, unknown>;
    const date = typeof value.date === 'string' ? value.date : typeof value.start === 'string' ? value.start : null;
    if (!date || !isToday(date)) return [];
    return [event];
  });
}

function significantActivity(projects: Project[], situationProjectIds: Set<string>, lastVisitAt: string | null) {
  return projects
    .filter((project) => isSince(project.acceptedAt, lastVisitAt) && !situationProjectIds.has(project.id))
    .slice(0, 2);
}

function SituationCard({ item, primary }: { item: OperationsWorkbenchItem; primary?: boolean }) {
  const router = useRouter();
  const actionLabel = item.primaryActionLabel || 'Préparer la suite';
  const destination = workspaceDestinationFor(item);

  if (!destination) return null;

  return (
    <article className={`rounded-2xl border p-5 ${primary ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full ${primary ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><Eye className="size-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Situation</p>
          <h3 className="mt-1 text-base font-semibold text-[#0b2232]">{item.description}</h3>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Compréhension</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{understandingFor(item.sourceType, item.title)}</p>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Pourquoi cela compte</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{item.reason}</p>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Je vous recommande</p>
          <p className="mt-1 text-sm font-medium text-[#0b2232]">{actionLabel}.</p>
          <button type="button" onClick={() => router.push(destination as Route)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2">
            {actionLabel}<ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function HomeWorkspace({ firstName, todayLabel, projects, todayEvents: rawEvents, operationsCenter, onOpenProject, onOpenAgenda }: Props) {
  const [lastVisitAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem('kadria-home-last-visit');
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('kadria-home-last-visit', new Date().toISOString());
    } catch {}
  }, []);
  const todayEvents = getTodayEvents(rawEvents);
  const situations = selectBriefSituations<OperationsWorkbenchItem>(operationsCenter
    ? [...operationsCenter.workbench.waitingForApproval, ...operationsCenter.workbench.todayActions, ...operationsCenter.workbench.needsAttention]
    : []);
  const activity = significantActivity(projects, new Set(situations.map((item) => item.projectId).filter((id): id is string => Boolean(id))), lastVisitAt);

  if (!operationsCenter) {
    return <div className="mx-auto max-w-[920px] pb-4"><section className="rounded-2xl border border-slate-200 bg-white px-6 py-6"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{todayLabel}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2232]">Bonjour{firstName ? ` ${firstName}` : ''}.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Je termine de vérifier vos dossiers et votre journée.</p></section></div>;
  }

  const calm = situations.length === 0;

  return <div className="mx-auto max-w-[920px] space-y-5 pb-4">
    <section id="workspace-section-briefing" className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{todayLabel}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2232]">Bonjour{firstName ? ` ${firstName}` : ''}.</h2>
      <p className="mt-2 max-w-2xl text-base leading-7 text-slate-700">{briefSituationSentence(situations.length)}</p>
      {calm && <p className="mt-2 text-sm leading-6 text-slate-500">Je continue simplement de surveiller votre activité.</p>}
    </section>

    {situations.length > 0 && <section id="workspace-section-decisions"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Les situations à traiter</p><div className="mt-3 space-y-3">{situations.map((item, index) => <SituationCard key={item.id} item={item} primary={index === 0} />)}</div></section>}

    {calm && <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" /><div><p className="font-semibold text-emerald-950">Votre journée est sous contrôle.</p><p className="mt-1 text-sm leading-6 text-emerald-900/80">Aucun dossier ne nécessite de décision immédiate.</p></div></div></section>}

    {(activity.length > 0 || (calm && todayEvents.length > 0)) && <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">{activity.length > 0 ? 'Depuis votre dernière visite' : 'Aujourd’hui'}</p>{activity.length > 0 && <div className="mt-3 space-y-3">{activity.map((project) => <button key={project.id} type="button" onClick={() => onOpenProject(project.id)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 text-left transition-colors hover:bg-slate-100"><span><span className="block text-sm font-semibold text-slate-800">Bonne nouvelle : devis accepté</span><span className="mt-0.5 block text-xs text-slate-500">{clientLabel(project)}. Le chantier peut désormais être préparé.</span></span><ArrowRight className="size-4 shrink-0 text-emerald-700" aria-hidden="true" /></button>)}</div>}{calm && todayEvents.length > 0 && <button type="button" onClick={onOpenAgenda} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">{todayEvents.length} rendez-vous prévu{todayEvents.length > 1 ? 's' : ''} aujourd’hui <ArrowRight className="size-4" aria-hidden="true" /></button>}</section>}
  </div>;
}

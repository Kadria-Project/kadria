'use client';

import { useMemo } from 'react';
import { ArrowRight, ChevronDown, Eye, Flame, TrendingDown, TrendingUp } from 'lucide-react';
import type { Project } from '@/src/components/ArtisanDashboard';
import { buildTrackingProject, formatAmount, TRACKING_STAGES } from './tracking-utils';
import type { TrackingProject } from './tracking-types';

type Props = {
  projects: Project[];
  priorityProjects: Project[];
  onOpenProject: (projectId: string) => void;
};

const temperatureTone = {
  slate: 'bg-slate-100 text-slate-600',
  amber: 'bg-amber-50 text-amber-700',
  orange: 'bg-orange-50 text-orange-700',
  emerald: 'bg-emerald-50 text-emerald-700',
};

function OpportunityCard({ item, rank, onOpen }: { item: TrackingProject; rank: number; onOpen: (id: string) => void }) {
  const primary = rank === 0;
  return <article className={`rounded-2xl border p-4 ${primary ? 'border-orange-200 bg-[#fffaf0]' : 'border-slate-200 bg-white'}`}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] ${primary ? 'text-orange-700' : 'text-slate-500'}`}>{primary ? <Flame className="size-4 text-orange-500" aria-hidden="true" /> : <Eye className="size-4 text-slate-500" aria-hidden="true" />}Priorité {rank + 1}</p><h3 className="mt-2 truncate text-base font-semibold text-[#0b2232]">{item.projectLabel}</h3><p className="text-sm text-slate-600">{item.clientLabel}</p></div>{item.amount !== null && <span className="shrink-0 rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">{formatAmount(item.amount)}</span>}</div>
    <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className={`rounded-full px-2 py-1 font-semibold ${temperatureTone[item.temperature.tone]}`}>{item.temperature.label}</span><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${item.momentum.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : item.momentum.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{item.momentum.tone === 'emerald' ? <TrendingUp className="size-3" /> : item.momentum.tone === 'amber' ? <TrendingDown className="size-3" /> : null}{item.momentum.label}</span></div>
    <p className="mt-3 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-700">À décider :</span> {item.nextDecision}</p><p className="mt-1 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-700">Pourquoi :</span> {item.reason}</p>
    <div className="mt-3 flex items-center justify-between"><details className="text-xs text-slate-500"><summary className="cursor-pointer font-medium hover:text-slate-700">Pourquoi ?</summary><p className="mt-1 max-w-xs leading-5">{item.temperature.reason}</p></details><button type="button" onClick={() => onOpen(item.project.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-600">Ouvrir <ArrowRight className="size-3.5" /></button></div>
  </article>;
}

function PipelineColumn({ stage, items, onOpen }: { stage: { id: string; label: string }; items: TrackingProject[]; onOpen: (id: string) => void }) {
  const amount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  return <section className="w-[270px] shrink-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-[#0b2232]">{stage.label}</h3><p className="mt-0.5 text-xs text-slate-500">{items.length} opportunité{items.length > 1 ? 's' : ''}</p></div>{amount > 0 && <span className="text-xs font-semibold text-slate-600">{formatAmount(amount)}</span>}</div><div className="mt-3 space-y-2">{items.length ? items.map((item) => <button key={item.project.id} type="button" onClick={() => onOpen(item.project.id)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"><div className="flex items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{item.clientLabel}</span><span className="block truncate text-xs text-slate-500">{item.projectLabel}</span></span>{item.amount !== null && <span className="text-xs font-semibold text-slate-700">{formatAmount(item.amount)}</span>}</div><div className="mt-2 flex items-center justify-between gap-2 text-[11px]"><span className={item.isRisk ? 'text-amber-700' : 'text-slate-500'}>{item.momentum.label}</span><span className="truncate text-slate-500">{item.nextDecision}</span></div></button>) : <p className="px-1 py-3 text-xs text-slate-500">Aucune opportunité à cette étape.</p>}</div></section>;
}

export default function TrackingWorkspace({ projects, priorityProjects, onOpenProject }: Props) {
  const data = useMemo(() => projects.filter((project) => project.leadStatus !== 'archived').map(buildTrackingProject), [projects]);
  const active = data.filter((item) => item.project.status !== 'Gagné' && item.project.status !== 'Perdu');
  const priorities = useMemo(() => priorityProjects.map(buildTrackingProject).filter((item) => item.project.status !== 'Gagné' && item.project.status !== 'Perdu').slice(0, 3), [priorityProjects]);
  const risks = active.filter((item) => item.isRisk).slice(0, 3);
  const quoteCount = active.filter((item) => item.stage === 'quote_sent').length;
  const potential = active.reduce((sum, item) => sum + (item.amount || 0), 0);
  const signed = data.filter((item) => item.project.status === 'Gagné' || item.project.acceptedAt).reduce((sum, item) => sum + (item.amount || 0), 0);
  const wonCount = data.filter((item) => item.project.status === 'Gagné').length;
  const lostCount = data.filter((item) => item.project.status === 'Perdu').length;
  const briefing = risks.length ? `${risks.length} opportunité${risks.length > 1 ? 's demandent' : ' demande'} une attention ciblée.` : priorities.length ? `${priorities.length} opportunité${priorities.length > 1 ? 's peuvent' : ' peut'} raisonnablement avancer cette semaine.` : 'Votre activité commerciale est stable. Aucun risque majeur n’est détecté aujourd’hui.';

  return <div className="mx-auto max-w-[1680px] space-y-5 pb-6">
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_204px]"><div className="rounded-2xl border border-slate-200 bg-white px-6 py-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Briefing commercial</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2232]">Votre pipeline reste dynamique.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{briefing} Les montants affichés distinguent le budget déclaré du montant réellement chiffré.</p><div className="mt-4 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"><Metric value={active.length} label="opportunités actives" /><Metric value={formatAmount(potential)} label="potentiel estimé" /><Metric value={quoteCount} label="devis en attente" /><Metric value={risks.length} label="risques à traiter" alert={risks.length > 0} /></div></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Température globale</p><div className="mt-5 flex h-20 items-end justify-center gap-1"><span className="h-6 w-4 rounded-t bg-amber-300" /><span className="h-11 w-4 rounded-t bg-amber-400" /><span className="h-16 w-4 rounded-t bg-emerald-500" /></div><p className="mt-3 text-center text-sm font-semibold text-[#0b2232]">{risks.length ? 'À surveiller' : 'Stable'}</p><p className="mt-1 text-center text-xs leading-5 text-slate-500">Lecture fondée sur les signaux déjà disponibles.</p></div></section>

    <section><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Synthèse commerciale</p><span className="text-xs text-slate-500">{wonCount} gagné{wonCount > 1 ? 's' : ''} · {lostCount} perdu{lostCount > 1 ? 's' : ''}</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Potentiel estimé" value={formatAmount(potential)} note="Budgets déclarés et devis ouverts" /><Summary label="Devis en attente" value={String(quoteCount)} note="Devis envoyés sans décision" /><Summary label="Opportunités prioritaires" value={String(priorities.length)} note="À suivre en premier" /><Summary label="Montant signé" value={formatAmount(signed)} note="Devis acceptés ou dossiers gagnés" /></div></section>

    <section><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Opportunités prioritaires</p>{priorities.length ? <div className="mt-3 grid gap-3 lg:grid-cols-3">{priorities.map((item, index) => <OpportunityCard key={item.project.id} item={item} rank={index} onOpen={onOpenProject} />)}</div> : <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-950">Aucune opportunité prioritaire pour le moment.</div>}</section>

    <section><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Pipeline vivant</p><span className="text-xs text-slate-500">Les dossiers gagnés et perdus restent hors de cette vue active.</span></div><div className="overflow-x-auto pb-2"><div className="flex min-w-max gap-3">{TRACKING_STAGES.map((stage) => <PipelineColumn key={stage.id} stage={stage} items={active.filter((item) => item.stage === stage.id)} onOpen={onOpenProject} />)}</div></div></section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]"><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Risques commerciaux</p>{risks.length ? <div className="mt-3 grid gap-3 md:grid-cols-3">{risks.map((item) => <div key={item.project.id} className="border-l-2 border-amber-400 pl-3"><p className="text-sm font-semibold text-slate-800">{item.clientLabel}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p><button type="button" onClick={() => onOpenProject(item.project.id)} className="mt-2 text-xs font-semibold text-emerald-700">Ouvrir le dossier <ArrowRight className="inline size-3" /></button></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Aucun risque commercial à signaler.</p>}</div><details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer list-none text-sm font-semibold text-[#0b2232]"><span className="flex items-center justify-between">Analyse détaillée <ChevronDown className="size-4 text-slate-400" /></span></summary><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Summary label="Dossiers actifs" value={String(active.length)} note="Hors gagnés et perdus" /><Summary label="Valeur moyenne" value={active.length ? formatAmount(Math.round(potential / active.length)) : '—'} note="Potentiel estimé" /></div></details></section>
  </div>;
}

function Metric({ value, label, alert = false }: { value: string | number; label: string; alert?: boolean }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className={`text-lg font-semibold ${alert ? 'text-orange-600' : 'text-[#0b2232]'}`}>{value}</p><p className="mt-0.5 text-[10px] leading-4 text-slate-500">{label}</p></div>;
}

function Summary({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="text-lg font-semibold text-[#0b2232]">{value}</p><p className="mt-0.5 text-sm font-medium text-slate-700">{label}</p><p className="mt-0.5 text-[11px] text-slate-500">{note}</p></div>;
}

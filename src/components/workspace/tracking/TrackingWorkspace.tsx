'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, CircleAlert, Eye, Lightbulb, ShieldCheck, Sparkles, Target, TriangleAlert } from 'lucide-react';
import type { Project } from '@/src/components/ArtisanDashboard';
import type { OperationsCenterResult } from '@/src/lib/recommendations';
import LivingPipeline from './LivingPipeline';
import { buildTrackingProject, formatAmount, TRACKING_STAGES } from './tracking-utils';
import {
  deduplicateCommercialSituations,
  deriveCommercialCalmState,
  deriveCommercialSituations,
  prioritizeCommercialSituations,
  type CommercialLoadState,
  type CommercialSituation,
} from './commercial-situations';

type Props = {
  projects: Project[];
  operationsCenter: OperationsCenterResult | null;
  loadState: CommercialLoadState;
  onOpenProject: (projectId: string, target?: string) => void;
};

function amountLabel(situation: CommercialSituation) {
  if (!situation.amount) return null;
  const origin = situation.amount.origin === 'quote' ? 'Devis envoyé' : 'Budget déclaré';
  return `${origin} : ${formatAmount(situation.amount.value)}`;
}

function confidenceLabel(confidence: CommercialSituation['confidence']) {
  if (confidence === 'high') return 'Les faits disponibles indiquent clairement cette situation.';
  if (confidence === 'medium') return 'La situation semble l’indiquer ; elle reste à confirmer dans le dossier.';
  return 'Je ne dispose pas encore d’assez d’éléments pour conclure.';
}

function CommercialSituationCard({ situation, onAct }: { situation: CommercialSituation; onAct: (situation: CommercialSituation) => void }) {
  return (
    <article className="group rounded-[22px] border border-slate-200/80 bg-[linear-gradient(145deg,#ffffff_0%,#fbfcfd_100%)] p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-emerald-200/80 hover:shadow-[0_12px_28px_rgba(15,34,50,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><Target className="size-[18px]" aria-hidden /></span>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Décision commerciale</p><h3 className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-[#0b2232]">{situation.projectTitle}</h3>{situation.clientName && <p className="mt-0.5 text-sm text-slate-500">{situation.clientName}</p>}</div>
        </div>
        {amountLabel(situation) && <span className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-100">{amountLabel(situation)}</span>}
      </div>
      <div className="mt-5 space-y-3.5 border-y border-slate-100 py-4 text-[13px] leading-5 text-slate-600">
        <SituationPart icon={Eye} tone="slate" label="Ce que Kadria a observé">{situation.observedFacts.slice(0, 2).join(' ')}</SituationPart>
        <SituationPart icon={Lightbulb} tone="amber" label="Ce que cela signifie">{situation.understanding}</SituationPart>
        <SituationPart icon={CircleAlert} tone="rose" label="Pourquoi cela compte">{situation.importance}</SituationPart>
        {situation.consequence && <SituationPart icon={TriangleAlert} tone="violet" label="Ce qui peut arriver">{situation.consequence}</SituationPart>}
        {situation.recommendation && <SituationPart icon={ShieldCheck} tone="emerald" label="Je vous recommande">{situation.recommendation}</SituationPart>}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-400">{confidenceLabel(situation.confidence)}</p>
      {situation.missingInformation?.length ? <p className="mt-1 text-xs leading-5 text-amber-800">À vérifier : {situation.missingInformation.join(', ')}.</p> : null}
      {situation.primaryAction && <button type="button" onClick={() => onAct(situation)} className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(5,150,105,0.16)] transition-all duration-200 hover:bg-emerald-700 hover:shadow-[0_8px_16px_rgba(5,150,105,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">{situation.primaryAction.label}<ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden /></button>}
    </article>
  );
}

function SituationPart({ icon: Icon, tone, label, children }: { icon: typeof Eye; tone: 'slate' | 'amber' | 'rose' | 'violet' | 'emerald'; label: string; children: string }) {
  const toneClasses = { slate: 'bg-slate-100 text-slate-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', violet: 'bg-violet-50 text-violet-600', emerald: 'bg-emerald-50 text-emerald-600' };
  return <div className="flex gap-2.5"><span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full ${toneClasses[tone]}`}><Icon className="size-3" aria-hidden /></span><p><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-700">{label}</span>{children}</p></div>;
}

export default function TrackingWorkspace({ projects, operationsCenter, loadState, onOpenProject }: Props) {
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const activeProjects = useMemo(() => projects.filter((project) => project.leadStatus !== 'archived' && project.status !== 'Gagné' && project.status !== 'Perdu').map(buildTrackingProject), [projects]);
  const situations = useMemo(() => prioritizeCommercialSituations(deduplicateCommercialSituations(deriveCommercialSituations(projects, operationsCenter))), [projects, operationsCenter]);
  const state = deriveCommercialCalmState(loadState, operationsCenter, situations);

  const act = (situation: CommercialSituation) => onOpenProject(situation.projectId, situation.primaryAction?.target);

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-6">
      <section id="workspace-section-briefing" className={`relative overflow-hidden rounded-[22px] border px-6 py-6 ${state.kind === 'insufficient' ? 'border-amber-200 bg-amber-50' : state.kind === 'calm' ? 'border-emerald-100 bg-emerald-50' : 'border-slate-200/80 bg-[linear-gradient(112deg,#ffffff_0%,#fbfefd_58%,#eefbf6_100%)]'}`}>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[45%] opacity-80 [background:radial-gradient(circle_at_80%_20%,rgba(110,231,183,.32),transparent_42%),radial-gradient(circle_at_50%_110%,rgba(186,230,253,.26),transparent_45%)]" />
        <div className="relative"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700"><Sparkles className="size-3.5" aria-hidden />Suivi commercial</p>
        <h2 className="mt-2 max-w-3xl text-[25px] font-semibold tracking-[-0.035em] text-[#0b2232]">{state.message}</h2>
        {state.kind === 'loading' && <p className="mt-2 text-sm leading-6 text-slate-600">Aucune conclusion n’est affichée tant que la vérification n’est pas terminée.</p>}
        {state.kind === 'calm' && <p className="mt-2 flex items-center gap-2 text-sm leading-6 text-emerald-950"><ShieldCheck className="size-4 shrink-0 text-emerald-700" aria-hidden />Je continue de surveiller les devis et les dossiers actifs à partir des données vérifiées.</p>}
        {state.kind === 'insufficient' && <p className="mt-2 flex items-center gap-2 text-sm leading-6 text-amber-950"><TriangleAlert className="size-4 shrink-0 text-amber-700" aria-hidden />Aucune situation calme n’est déduite tant que la collecte reste limitée.</p>}</div>
      </section>

      {state.kind === 'active' && <section id="workspace-section-priorities">
        <div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Décisions à prendre</p><span className="text-xs text-slate-500">Maximum trois situations</span></div>
        <div className="grid gap-3 lg:grid-cols-3">{situations.map((situation) => <CommercialSituationCard key={situation.id} situation={situation} onAct={act} />)}</div>
      </section>}

      <section className="rounded-[22px] border border-slate-200/80 bg-white/80 p-4 transition-colors hover:border-emerald-100">
        <button type="button" onClick={() => setPortfolioOpen((open) => !open)} aria-expanded={portfolioOpen} aria-controls="commercial-portfolio" className="flex w-full items-center justify-between gap-3 text-left">
          <span><span className="block text-sm font-semibold text-[#0b2232]">Explorer le portefeuille commercial</span><span className="mt-1 block text-xs text-slate-500">Consultez les étapes et les dossiers sans concurrencer les décisions ci-dessus.</span></span>
          <ChevronDown className={`size-5 shrink-0 text-slate-500 transition-transform ${portfolioOpen ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {portfolioOpen && <div id="commercial-portfolio" className="mt-4"><LivingPipeline stages={TRACKING_STAGES} projects={activeProjects} onOpenProject={(projectId) => onOpenProject(projectId)} /></div>}
      </section>

      {state.kind === 'calm' && <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600"><p className="flex items-center gap-2 font-medium text-[#0b2232]"><Eye className="size-4 text-emerald-700" aria-hidden />Ce que Kadria continue de surveiller</p><p className="mt-1">Les réponses aux devis, les rappels planifiés et les dossiers dont l’activité ralentit.</p></section>}
    </div>
  );
}

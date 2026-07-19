'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, Eye, ShieldCheck, TriangleAlert } from 'lucide-react';
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
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,34,50,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Décision commerciale</p>
          <h3 className="mt-1 text-base font-semibold text-[#0b2232]">{situation.projectTitle}</h3>
          {situation.clientName && <p className="mt-0.5 text-sm text-slate-600">{situation.clientName}</p>}
        </div>
        {amountLabel(situation) && <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{amountLabel(situation)}</span>}
      </div>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
        <SituationPart label="Ce que Kadria a observé">{situation.observedFacts.slice(0, 2).join(' ')}</SituationPart>
        <SituationPart label="Ce que cela signifie">{situation.understanding}</SituationPart>
        <SituationPart label="Pourquoi cela compte">{situation.importance}</SituationPart>
        {situation.consequence && <SituationPart label="Ce qui peut arriver">{situation.consequence}</SituationPart>}
        {situation.recommendation && <SituationPart label="Je vous recommande">{situation.recommendation}</SituationPart>}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{confidenceLabel(situation.confidence)}</p>
      {situation.missingInformation?.length ? <p className="mt-1 text-xs leading-5 text-amber-800">À vérifier : {situation.missingInformation.join(', ')}.</p> : null}
      {situation.primaryAction && <button type="button" onClick={() => onAct(situation)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">{situation.primaryAction.label}<ArrowRight className="size-4" aria-hidden /></button>}
    </article>
  );
}

function SituationPart({ label, children }: { label: string; children: string }) {
  return <p><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>{children}</p>;
}

export default function TrackingWorkspace({ projects, operationsCenter, loadState, onOpenProject }: Props) {
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const activeProjects = useMemo(() => projects.filter((project) => project.leadStatus !== 'archived' && project.status !== 'Gagné' && project.status !== 'Perdu').map(buildTrackingProject), [projects]);
  const situations = useMemo(() => prioritizeCommercialSituations(deduplicateCommercialSituations(deriveCommercialSituations(projects, operationsCenter))), [projects, operationsCenter]);
  const state = deriveCommercialCalmState(loadState, operationsCenter, situations);

  const act = (situation: CommercialSituation) => onOpenProject(situation.projectId, situation.primaryAction?.target);

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-6">
      <section id="workspace-section-briefing" className={`rounded-2xl border px-6 py-5 ${state.kind === 'insufficient' ? 'border-amber-200 bg-amber-50' : state.kind === 'calm' ? 'border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Suivi commercial</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2232]">{state.message}</h2>
        {state.kind === 'loading' && <p className="mt-2 text-sm leading-6 text-slate-600">Aucune conclusion n’est affichée tant que la vérification n’est pas terminée.</p>}
        {state.kind === 'calm' && <p className="mt-2 flex items-center gap-2 text-sm leading-6 text-emerald-950"><ShieldCheck className="size-4 shrink-0 text-emerald-700" aria-hidden />Je continue de surveiller les devis et les dossiers actifs à partir des données vérifiées.</p>}
        {state.kind === 'insufficient' && <p className="mt-2 flex items-center gap-2 text-sm leading-6 text-amber-950"><TriangleAlert className="size-4 shrink-0 text-amber-700" aria-hidden />Aucune situation calme n’est déduite tant que la collecte reste limitée.</p>}
      </section>

      {state.kind === 'active' && <section id="workspace-section-priorities">
        <div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Décisions à prendre</p><span className="text-xs text-slate-500">Maximum trois situations</span></div>
        <div className="grid gap-3 lg:grid-cols-3">{situations.map((situation) => <CommercialSituationCard key={situation.id} situation={situation} onAct={act} />)}</div>
      </section>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
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

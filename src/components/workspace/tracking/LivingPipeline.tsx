'use client';

import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FilePenLine,
  Hourglass,
  Inbox,
  SearchCheck,
  Send,
} from 'lucide-react';
import { formatAmount } from './tracking-utils';
import type { PipelineStageId, TrackingProject, TrackingStage } from './tracking-types';

type Props = {
  stages: TrackingStage[];
  projects: TrackingProject[];
  onOpenProject: (projectId: string) => void;
};

type StageStyle = {
  accent: string;
  tint: string;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

const stageStyles: Record<PipelineStageId, StageStyle> = {
  new: { accent: '#3B82F6', tint: '#EFF6FF', Icon: Inbox },
  qualify: { accent: '#0EA5E9', tint: '#F0F9FF', Icon: SearchCheck },
  qualified: { accent: '#16A36A', tint: '#F0FDF4', Icon: BadgeCheck },
  quote_preparation: { accent: '#F59E0B', tint: '#FFFBEB', Icon: FilePenLine },
  quote_sent: { accent: '#8B5CF6', tint: '#F5F3FF', Icon: Send },
  decision: { accent: '#F97316', tint: '#FFF7ED', Icon: Hourglass },
};

function PipelineOpportunityCard({ item, onOpen }: { item: TrackingProject; onOpen: (projectId: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.project.id)}
      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,34,50,0.05)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_8px_18px_rgba(15,34,50,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-800">{item.clientLabel}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">{item.projectLabel}</span>
        </span>
        {item.amount !== null && <span className="shrink-0 text-xs font-bold text-slate-700">{formatAmount(item.amount)}</span>}
      </div>
      <p className="mt-3 truncate text-[11px] text-slate-500">Étape actuelle : {item.stageLabel}</p>
    </button>
  );
}

function PipelineColumn({ stage, items, onOpenProject }: { stage: TrackingStage; items: TrackingProject[]; onOpenProject: (projectId: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const style = stageStyles[stage.id];
  const amount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const remaining = items.length - 3;
  const displayedItems = expanded ? items : items.slice(0, 3);
  const controlsId = `pipeline-column-${stage.id}`;
  const Icon = style.Icon;

  return (
    <section
      className="w-[268px] shrink-0 self-start rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-[0_3px_10px_rgba(15,34,50,0.04)]"
      style={{ borderTopWidth: '4px', borderTopColor: style.accent }}
    >
      <header className="flex items-start justify-between gap-3 rounded-xl px-2 py-2" style={{ backgroundColor: style.tint }}>
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#0b2232]">
            <span style={{ color: style.accent }}><Icon className="size-4 shrink-0" aria-hidden /></span>
            {stage.label}
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-600">{items.length} opportunité{items.length > 1 ? 's' : ''}</p>
        </div>
        {amount > 0 && <span className="shrink-0 pt-0.5 text-xs font-bold text-slate-700">{formatAmount(amount)}</span>}
      </header>
      <div id={controlsId} className="mt-3 space-y-2">
        {items.length ? displayedItems.map((item) => <PipelineOpportunityCard key={item.project.id} item={item} onOpen={onOpenProject} />) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-4 text-xs leading-5 text-slate-500">Aucune opportunité à cette étape.</p>
        )}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls={controlsId}
            aria-label={expanded ? `Réduire la colonne ${stage.label}` : `Afficher ${remaining} opportunité${remaining > 1 ? 's' : ''} supplémentaire${remaining > 1 ? 's' : ''} dans la colonne ${stage.label}`}
            className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {expanded ? <><ChevronUp className="size-3.5" aria-hidden />Afficher moins</> : <><ChevronDown className="size-3.5" aria-hidden />+ {remaining} autre{remaining > 1 ? 's' : ''}</>}
          </button>
        )}
      </div>
    </section>
  );
}

export default function LivingPipeline({ stages, projects, onOpenProject }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateControls = () => {
      setReducedMotion(media.matches);
      setCanScrollLeft(container.scrollLeft > 2);
      setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 2);
    };
    const dismissHint = () => setShowSwipeHint(false);
    const observer = new ResizeObserver(updateControls);
    const hintTimer = window.setTimeout(() => {
      if (!media.matches && container.scrollWidth > container.clientWidth + 2) setShowSwipeHint(true);
    }, 450);

    updateControls();
    observer.observe(container);
    container.addEventListener('scroll', updateControls, { passive: true });
    container.addEventListener('wheel', dismissHint, { passive: true });
    container.addEventListener('pointerdown', dismissHint, { passive: true });
    media.addEventListener('change', updateControls);

    return () => {
      window.clearTimeout(hintTimer);
      container.removeEventListener('scroll', updateControls);
      container.removeEventListener('wheel', dismissHint);
      container.removeEventListener('pointerdown', dismissHint);
      observer.disconnect();
      media.removeEventListener('change', updateControls);
    };
  }, [projects.length]);

  const scroll = (direction: 1 | -1) => {
    const container = scrollRef.current;
    if (!container) return;
    setShowSwipeHint(false);
    container.scrollBy({
      left: direction * Math.max(268, Math.round(container.clientWidth * 0.78)),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scroll(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scroll(1);
    }
  };

  return (
    <section className="rounded-[18px] border border-[#DCE6E3] bg-[#f5f8f7] p-3 shadow-[0_6px_18px_rgba(15,34,50,0.05)]">
      <div className="mb-3 flex items-start justify-between gap-4 px-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">Pipeline vivant</p>
          <p className="mt-1 text-xs text-slate-500">Les dossiers gagnés et perdus restent hors de cette vue active.</p>
          {showSwipeHint && <p className="mt-1 text-[11px] font-medium text-emerald-700">Faites glisser pour voir la suite</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => scroll(-1)} disabled={!canScrollLeft} aria-label="Faire défiler le pipeline vers la gauche" className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><ChevronLeft className="size-4" aria-hidden /></button>
          <button type="button" onClick={() => scroll(1)} disabled={!canScrollRight} aria-label="Faire défiler le pipeline vers la droite" className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><ChevronRight className="size-4" aria-hidden /></button>
        </div>
      </div>
      <div className="relative">
        <div ref={scrollRef} tabIndex={0} onKeyDown={handleKeyDown} aria-label="Pipeline commercial, utilisez les flèches gauche et droite pour le faire défiler" className="kadria-living-pipeline-scroll overflow-x-auto scroll-smooth pb-2 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset">
          <div className="flex min-w-max items-start gap-3">
            {stages.map((stage) => <PipelineColumn key={stage.id} stage={stage} items={projects.filter((item) => item.stage === stage.id)} onOpenProject={onOpenProject} />)}
          </div>
        </div>
      </div>
      <style jsx>{`
        .kadria-living-pipeline-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .kadria-living-pipeline-scroll::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) { .kadria-living-pipeline-scroll { scroll-behavior: auto; } }
      `}</style>
    </section>
  );
}

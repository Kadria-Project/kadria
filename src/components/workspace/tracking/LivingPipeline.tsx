'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TrackingProject, TrackingStage } from './tracking-types';

type Props = { stages: TrackingStage[]; projects: TrackingProject[]; onOpenProject: (projectId: string) => void };

export default function LivingPipeline({ stages, projects, onOpenProject }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [hint, setHint] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReduced(media.matches); setLeft(node.scrollLeft > 2); setRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 2); };
    const interacted = () => setHint(false);
    const observer = new ResizeObserver(update);
    update(); observer.observe(node); node.addEventListener('scroll', update, { passive: true }); node.addEventListener('wheel', interacted, { passive: true }); node.addEventListener('pointerdown', interacted, { passive: true }); media.addEventListener('change', update);
    const timer = window.setTimeout(() => { if (!media.matches && node.scrollWidth > node.clientWidth + 2) setHint(true); }, 450);
    return () => { window.clearTimeout(timer); observer.disconnect(); node.removeEventListener('scroll', update); node.removeEventListener('wheel', interacted); node.removeEventListener('pointerdown', interacted); media.removeEventListener('change', update); };
  }, [projects.length]);
  const move = (direction: 1 | -1) => { const node = ref.current; if (!node) return; setHint(false); node.scrollBy({ left: direction * Math.max(268, Math.round(node.clientWidth * .75)), behavior: reduced ? 'auto' : 'smooth' }); };

  return <section className="rounded-2xl border border-[#DCE6E3] bg-[#f5f8f7] p-3 shadow-sm"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-700">Pipeline vivant</p><p className="mt-1 text-xs text-slate-500">Les dossiers gagnés et perdus restent hors de cette vue active.</p>{hint && <p className="mt-1 text-[11px] font-medium text-emerald-700">Faites glisser pour voir la suite</p>}</div><div className="flex gap-2"><button type="button" aria-label="Voir les étapes précédentes" disabled={!left} onClick={() => move(-1)} className="grid size-9 place-items-center rounded-full border bg-white disabled:opacity-30"><ChevronLeft className="size-4" /></button><button type="button" aria-label="Voir les étapes suivantes" disabled={!right} onClick={() => move(1)} className="grid size-9 place-items-center rounded-full border bg-white disabled:opacity-30"><ChevronRight className="size-4" /></button></div></div><div className="relative"><div ref={ref} tabIndex={0} onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } }} aria-label="Le pipeline peut être parcouru horizontalement." className="kadria-pipeline-scroll overflow-x-auto scroll-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><div className="flex min-w-max gap-3">{stages.map((stage) => <section key={stage.id} className="w-[268px] shrink-0 rounded-xl border border-slate-200 bg-white p-3"><h3 className="font-semibold text-slate-800">{stage.label}</h3><div className="mt-3 space-y-2">{projects.filter((item) => item.stage === stage.id).slice(0, 3).map((item) => <button key={item.project.id} type="button" onClick={() => onOpenProject(item.project.id)} className="w-full rounded-lg border border-slate-100 p-2 text-left text-sm hover:border-emerald-200"><strong className="block truncate">{item.clientLabel}</strong><span className="block truncate text-xs text-slate-500">{item.projectLabel}</span></button>)}</div></section>)}</div></div>{left && <span className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#f5f8f7] to-transparent" />}{right && <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#f5f8f7] to-transparent" />}</div><style jsx>{`.kadria-pipeline-scroll{scrollbar-width:none;-ms-overflow-style:none}.kadria-pipeline-scroll::-webkit-scrollbar{display:none}@media(prefers-reduced-motion:reduce){.kadria-pipeline-scroll{scroll-behavior:auto}}`}</style></section>;
}

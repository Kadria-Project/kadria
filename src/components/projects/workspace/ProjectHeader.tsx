'use client';

import { ArrowLeft, CalendarDays, ChevronDown, Mail, MoreHorizontal, Phone } from 'lucide-react';
import type { ProjectWorkspaceProps } from './ProjectWorkspace.types';

export function ProjectHeader({ project, projectTitle, clientLabel, onBack, onCall, onWrite, onPlanAppointment, onEditProject, onExportPdf, onArchive, latestDevis, formatAmount }: Pick<ProjectWorkspaceProps, 'project' | 'projectTitle' | 'clientLabel' | 'onBack' | 'onCall' | 'onWrite' | 'onPlanAppointment' | 'onEditProject' | 'onExportPdf' | 'onArchive' | 'latestDevis' | 'formatAmount'>) {
  const meta = [project.trade || project.projectType, [project.city, project.postalCode].filter(Boolean).join(' ')].filter(Boolean);
  return (
    <header className="flex min-h-[76px] items-center gap-4 border-b border-slate-200 py-3">
      <button type="button" onClick={onBack} aria-label="Retour aux dossiers" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"><ArrowLeft size={19} /></button>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-3"><h1 className="truncate text-[23px] font-semibold tracking-[-0.03em] text-slate-950">{projectTitle}</h1></div>
        <p className="mt-1 truncate text-sm text-slate-500"><span className="font-medium text-slate-700">{clientLabel}</span>{meta.length > 0 && <><span className="mx-2 text-slate-300">•</span>{meta.join('  •  ')}</>}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-4 min-[1400px]:flex"><span className="rounded-l border-l border-slate-200 pl-4 text-right"><strong className="block text-base font-semibold tabular-nums text-slate-950">{latestDevis ? formatAmount(latestDevis.amount) : '—'}</strong><span className="text-[11px] text-slate-500">{latestDevis ? 'Montant du devis' : 'Aucun devis'}</span></span></div>
      <div className="flex shrink-0 items-center gap-2"><button type="button" onClick={onCall} className="hidden h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 lg:inline-flex"><Phone size={16} />Appeler</button><button type="button" onClick={onWrite} className="hidden h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 lg:inline-flex"><Mail size={16} />Écrire</button><button type="button" onClick={onPlanAppointment} className="hidden h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-[1400px]:inline-flex"><CalendarDays size={16} />Planifier</button><details className="relative"><summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MoreHorizontal size={18} /><span className="hidden sm:inline">Plus</span><ChevronDown size={14} /></summary><div className="absolute right-0 z-30 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"><button type="button" onClick={onEditProject} className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Modifier le dossier</button><button type="button" onClick={onExportPdf} className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Exporter en PDF</button><button type="button" onClick={onArchive} className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Archiver le dossier</button></div></details></div>
    </header>
  );
}

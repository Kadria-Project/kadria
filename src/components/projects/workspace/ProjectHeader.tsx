'use client';

import { ArrowLeft, FileText, MoreHorizontal } from 'lucide-react';
import type { ProjectWorkspaceBrief, ProjectWorkspaceCapabilities, ProjectWorkspaceNavigation } from './ProjectWorkspace.types';

export function ProjectHeader({ brief, capabilities, navigation }: { brief: ProjectWorkspaceBrief; capabilities: ProjectWorkspaceCapabilities; navigation: ProjectWorkspaceNavigation }) {
  const meta = [brief.project.trade, brief.project.city].filter(Boolean);
  const pdf = capabilities.managePdf;
  const portal = capabilities.openClientPortal;
  return <header className="flex min-h-[76px] items-center gap-4 border-b border-slate-200 py-3">
    {navigation.onBack && <button type="button" onClick={navigation.onBack} aria-label="Retour aux dossiers" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"><ArrowLeft size={19} /></button>}
    <div className="min-w-0 flex-1"><h1 className="truncate text-[23px] font-semibold tracking-[-0.03em] text-slate-950">{brief.project.title}</h1><p className="mt-1 truncate text-sm text-slate-500"><span className="font-medium text-slate-700">{brief.project.clientLabel || 'Client non renseigné'}</span>{meta.length > 0 && <><span className="mx-2 text-slate-300">•</span>{meta.join(' • ')}</>}</p></div>
    {(pdf?.available || portal?.available) && <details className="relative"><summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MoreHorizontal size={18} /><span className="hidden sm:inline">Plus</span></summary><div className="absolute right-0 z-30 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">{pdf?.available && <button type="button" onClick={pdf.action} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"><FileText size={15} />PDF</button>}{portal?.available && <button type="button" onClick={portal.action} className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Portail client</button>}</div></details>}
  </header>;
}

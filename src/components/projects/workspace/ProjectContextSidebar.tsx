'use client';

import { CalendarClock, FileText, UserRound } from 'lucide-react';
import type { ProjectWorkspaceBrief, ProjectWorkspaceCapabilities, ProjectWorkspaceSections } from './ProjectWorkspace.types';

function EntryPoint({ label, capability }: { label: string; capability?: { available: boolean; action?: () => void } }) {
  return capability?.available ? <button type="button" onClick={capability.action} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">{label}</button> : null;
}

export function ProjectContextSidebar({ brief, sections, capabilities }: { brief: ProjectWorkspaceBrief; sections: ProjectWorkspaceSections; capabilities: ProjectWorkspaceCapabilities }) {
  const engagement = brief.nextEngagement;
  return <aside className="min-w-0 space-y-3 self-start 2xl:sticky 2xl:top-4">
    <section aria-label="Décision du dossier" className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Décision</p><p className="mt-1 text-sm font-semibold text-emerald-950">{brief.decision.understanding}</p></section>
    <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950"><UserRound size={15} />Compréhension</h2><EntryPoint label="Ouvrir le client" capability={capabilities.openClientContact} /></div><p className="mt-3 text-sm leading-6 text-slate-700">{brief.qualification.consequence}</p><p className="mt-3 text-xs text-slate-500">{brief.qualification.confirmed.length} information(s) confirmée(s) · {brief.qualification.missing.length} à préciser</p>{sections.client.status === 'not_loaded' && <p className="mt-2 text-xs text-slate-500">Coordonnées non chargées.</p>}</section>
    <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950"><FileText size={15} />Commercial</h2><EntryPoint label="Ouvrir" capability={capabilities.openCommercial} /></div><p className="mt-3 text-sm font-semibold text-slate-900">{brief.commercialSummary.state}</p><p className="mt-1 text-xs leading-5 text-slate-600">{brief.commercialSummary.understanding}</p></section>
    <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950"><CalendarClock size={15} />Prochain engagement</h2><EntryPoint label="Ouvrir" capability={capabilities.openEngagement} /></div><p className="mt-3 text-sm font-semibold text-slate-900">{engagement.label}</p>{engagement.objective && <p className="mt-1 text-xs leading-5 text-slate-600">{engagement.objective}</p>}</section>
    <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-950">Preuves</h2><EntryPoint label="Documents" capability={capabilities.openDocuments} /></div><p className="mt-3 text-sm text-slate-700">{brief.evidence.photosCount} photo(s) · {brief.evidence.documentsCount} document(s)</p></section>
  </aside>;
}

'use client';

import { CalendarDays, CheckSquare, FileText, History, Image as ImageIcon } from 'lucide-react';
import type { ProjectWorkspaceBrief, ProjectWorkspaceCapabilities, ProjectWorkspaceNavigation, ProjectWorkspaceSection, ProjectWorkspaceSections, ProjectWorkspaceTab } from './ProjectWorkspace.types';
import { ProjectWorkspaceSectionContent } from './ProjectWorkspaceSectionContent';

const tabs: Array<{ id: ProjectWorkspaceTab; label: string; icon: typeof History; section: keyof ProjectWorkspaceSections }> = [
  { id: 'activity', label: 'Activité', icon: History, section: 'history' }, { id: 'commercial', label: 'Commercial', icon: FileText, section: 'commercial' }, { id: 'qualification', label: 'Qualification', icon: CheckSquare, section: 'client' }, { id: 'planning', label: 'Planning', icon: CalendarDays, section: 'engagement' }, { id: 'documents', label: 'Documents', icon: ImageIcon, section: 'documents' },
];

function SectionState({ section, label }: { section: ProjectWorkspaceSection; label: string }) {
  if (section.status === 'ready') return null;
  const message = section.status === 'not_loaded' ? `${label} non chargé.` : section.status === 'loading' ? `Chargement de ${label.toLowerCase()}…` : section.status === 'empty' ? section.message || `Aucun élément dans ${label.toLowerCase()}.` : section.status === 'error' ? section.message || `Erreur de chargement de ${label.toLowerCase()}.` : section.message || `${label} indisponible.`;
  return <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</p>;
}

export function ProjectWorkspaceTabs({ brief, sections, capabilities, navigation }: { brief: ProjectWorkspaceBrief; sections: ProjectWorkspaceSections; capabilities: ProjectWorkspaceCapabilities; navigation: ProjectWorkspaceNavigation }) {
  const tab = tabs.find(({ id }) => id === navigation.activeTab) || tabs[0];
  const section = sections[tab.section];
  const title = tab.id === 'commercial' ? brief.commercialSummary.understanding : tab.id === 'qualification' ? brief.qualification.consequence : tab.id === 'planning' ? brief.nextEngagement.objective || brief.nextEngagement.label : tab.id === 'activity' ? brief.decision.understanding : `${brief.evidence.photosCount + brief.evidence.documentsCount} preuve(s) disponible(s).`;
  const capability = tab.id === 'activity' ? capabilities.openHistory : tab.id === 'commercial' ? capabilities.openCommercial : tab.id === 'planning' ? capabilities.openEngagement : tab.id === 'documents' ? capabilities.openDocuments : capabilities.openClientContact;
  return <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]"><nav aria-label="Espaces métier" className="flex overflow-x-auto border-b border-slate-200 bg-white px-5">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => navigation.onTabChange(id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold first:pl-0 ${navigation.activeTab === id ? 'border-emerald-500 text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon size={15} />{label}</button>)}</nav><div className="min-h-[420px] p-5"><h2 className="text-base font-semibold text-slate-950">{tab.label}</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">{title}</p><SectionState section={section} label={tab.label} /><ProjectWorkspaceSectionContent section={tab.section} state={section} />{capability?.available && section.status !== 'ready' && <button type="button" onClick={capability.action} className="mt-5 text-sm font-semibold text-emerald-700 hover:text-emerald-800">Ouvrir {tab.label.toLowerCase()}</button>}{section.status === 'ready' && <button type="button" onClick={capability?.action} className="mt-5 text-sm font-semibold text-emerald-700 hover:text-emerald-800">Actualiser</button>}</div></section>;
}

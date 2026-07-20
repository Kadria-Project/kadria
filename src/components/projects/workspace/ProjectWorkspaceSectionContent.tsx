'use client';

import type { ProjectWorkspaceSectionData, ProjectWorkspaceSectionKey } from '@/src/lib/projects/project-workspace-section-contract';
import type { ProjectWorkspaceSection } from './ProjectWorkspace.types';

type Props<K extends ProjectWorkspaceSectionKey> = { section: K; state: ProjectWorkspaceSection<ProjectWorkspaceSectionData[K]> };

export function ProjectWorkspaceSectionContent<K extends ProjectWorkspaceSectionKey>({ section, state }: Props<K>) {
  if (state.status !== 'ready') return null;
  if (section === 'client') {
    const client = state.data as ProjectWorkspaceSectionData['client'];
    return <dl className="mt-5 grid gap-3 text-sm text-slate-700"><div><dt className="text-xs font-semibold uppercase text-slate-500">Client</dt><dd>{client.label || 'Non renseigné'}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">Téléphone</dt><dd>{client.phone || 'Non renseigné'}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">E-mail</dt><dd>{client.email || 'Non renseigné'}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">Adresse</dt><dd>{client.address || 'Non renseignée'}</dd></div></dl>;
  }
  if (section === 'documents') {
    const documents = state.data as ProjectWorkspaceSectionData['documents'];
    return <ul className="mt-5 space-y-2 text-sm text-slate-700">{documents.items.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><span>{item.name}</span><a href={item.url} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700">Ouvrir</a></li>)}</ul>;
  }
  if (section === 'commercial') {
    const commercial = state.data as ProjectWorkspaceSectionData['commercial'];
    return <ul className="mt-5 space-y-2 text-sm text-slate-700">{commercial.quotes.map((quote) => <li key={quote.id} className="rounded-lg border border-slate-200 p-3"><p className="font-semibold text-slate-900">{quote.number || 'Devis sans numéro'} · {quote.status}</p><p className="mt-1">{quote.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p></li>)}</ul>;
  }
  if (section === 'history') {
    const history = state.data as ProjectWorkspaceSectionData['history'];
    return <ul className="mt-5 space-y-3 text-sm text-slate-700">{history.events.map((event) => <li key={event.id} className="border-l-2 border-emerald-300 pl-3"><p className="font-semibold text-slate-900">{event.label}</p>{event.summary && <p className="mt-1">{event.summary}</p>}<p className="mt-1 text-xs text-slate-500">{event.occurredAt}</p></li>)}</ul>;
  }
  const engagement = state.data as ProjectWorkspaceSectionData['engagement'];
  return <ul className="mt-5 space-y-2 text-sm text-slate-700">{engagement.appointments.map((appointment) => <li key={appointment.id} className="rounded-lg border border-slate-200 p-3"><p className="font-semibold text-slate-900">{appointment.label || appointment.type}</p><p className="mt-1">{appointment.startsAt} · {appointment.status}</p>{appointment.location && <p className="mt-1">{appointment.location}</p>}</li>)}</ul>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarCheck2, CalendarDays, CircleAlert, Clock3, FolderKanban, Mail, MapPin, Phone, Search, X } from 'lucide-react';
import { EVENT_TYPES_UI, EVENT_TYPE_LABELS, type EventType } from '@/src/lib/calendar/event-types';
import AppointmentAssigneeSelect from './AppointmentAssigneeSelect';
import AddressAutocomplete from '@/components/AddressAutocomplete';

export type AppointmentProjectOption = { id: string; clientName: string; clientFirstName: string; clientEmail?: string | null; clientPhone?: string | null; projectTitle: string; projectType: string; status: string; city: string; siteAddress: string };
export type AppointmentCreateForm = { title: string; start: string; end: string; location: string; description: string; clientName: string; clientEmail: string; clientPhone: string; projectId: string | null; assignedUserId: string; eventType: EventType };

export function projectContactFields(project: AppointmentProjectOption) {
  return {
    location: [project.siteAddress, project.city].filter(Boolean).join(', '),
    clientName: [project.clientFirstName, project.clientName].filter(Boolean).join(' '),
    clientEmail: project.clientEmail || '',
    clientPhone: project.clientPhone || '',
  };
}

type Props = {
  form: AppointmentCreateForm;
  selectedProject: AppointmentProjectOption | null;
  creating: boolean;
  error: string | null;
  endIsValid: boolean;
  mode?: 'create' | 'edit';
  deleting?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
  onFieldChange: (field: Exclude<keyof AppointmentCreateForm, 'projectId'>, value: string) => void;
  onProjectChange: (project: AppointmentProjectOption | null) => void;
  initialProjectId?: string | null;
};

const fieldClassName = 'w-full rounded-lg border border-[#3A4A59] bg-[#111F2E] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none placeholder:text-[#8291A2] focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/25';
const labelFor = (project: AppointmentProjectOption) => [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || project.projectTitle || 'Dossier';
const detailsFor = (project: AppointmentProjectOption) => [project.projectTitle || project.projectType, project.city].filter(Boolean).join(' \u00b7 ');

export default function AppointmentCreateModal({ form, selectedProject, creating, error, endIsValid, mode = 'create', deleting = false, onClose, onSubmit, onDelete, onFieldChange, onProjectChange, initialProjectId = null }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<AppointmentProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const initialProjectIdRef = useRef(initialProjectId);
  const selectedProjectRef = useRef(selectedProject);
  const onProjectChangeRef = useRef(onProjectChange);

  useEffect(() => {
    const controller = new AbortController();
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects', { signal: controller.signal });
        const json = await response.json();
        if (!response.ok || !json?.success) throw new Error('Unable to load projects.');
        const nextProjects: AppointmentProjectOption[] = Array.isArray(json.projects) ? json.projects : [];
        setProjects(nextProjects);
        if (initialProjectIdRef.current && !selectedProjectRef.current) onProjectChangeRef.current(nextProjects.find((project) => project.id === initialProjectIdRef.current) || null);
      } catch {
        if (!controller.signal.aborted) setProjects([]);
      } finally {
        if (!controller.signal.aborted) setLoadingProjects(false);
      }
    };
    void loadProjects();
    window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => controller.abort();
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase('fr-FR');
  const matchingProjects = projects.filter((project) => !normalizedQuery || [
    project.clientFirstName, project.clientName, project.projectTitle, project.projectType, project.city,
  ].join(' ').toLocaleLowerCase('fr-FR').includes(normalizedQuery)).slice(0, 8);

  const selectProject = (project: AppointmentProjectOption) => {
    onProjectChange(project);
    setQuery('');
    setOpen(false);
    setActiveIndex(0);
  };

  const onDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(0, matchingProjects.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(0, current - 1));
    } else if (event.key === 'Enter' && open && matchingProjects[activeIndex]) {
      event.preventDefault();
      selectProject(matchingProjects[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,16,26,0.55)] p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="appointment-create-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={onDialogKeyDown} className="max-h-[calc(100vh-32px)] w-full max-w-[470px] overflow-y-auto rounded-[18px] border border-[#2A3948] bg-[#0E1926] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="appointment-create-title" className="text-xl font-bold tracking-tight text-white">{mode === 'edit' ? 'Modifier le rendez-vous' : <>Ajouter un cr{'\u00e9'}neau</>}</h2><p className="mt-1 text-sm leading-5 text-[#B7C4D1]">{mode === 'edit' ? 'Mettez a jour les informations de ce rendez-vous.' : <>Planifiez un rendez-vous et rattachez-le {'\u00e0'} un dossier Kadria.</>}</p></div>
          <button type="button" onClick={onClose} aria-label="Fermer la modale" className="grid size-9 shrink-0 place-items-center rounded-lg text-[#B7C4D1] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"><X className="size-5" /></button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-[#E7EDF4]">Motif du rendez-vous<input ref={titleRef} value={form.title} onChange={(event) => onFieldChange('title', event.target.value)} placeholder="Ex. : Visite chantier, rendez-vous client..." className={'mt-2 ' + fieldClassName} /></label>
          <div className="relative">
            <label className="block text-sm font-medium text-[#E7EDF4]" htmlFor="appointment-project-search">Projet li{'\u00e9'} <span className="font-normal text-[#8291A2]">- facultatif</span></label>
            <div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8291A2]" /><input id="appointment-project-search" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }} onFocus={() => setOpen(true)} onKeyDown={onSearchKeyDown} placeholder="Rechercher un client ou un projet..." role="combobox" aria-expanded={open} aria-controls="appointment-project-options" aria-autocomplete="list" className={'pl-9 ' + fieldClassName} /></div>
            {open ? <div id="appointment-project-options" role="listbox" className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-[#3A4A59] bg-[#101C2A] p-1 shadow-xl">
              {loadingProjects ? <p className="px-3 py-2 text-sm text-[#B7C4D1]">Chargement des projets...</p> : null}
              {!loadingProjects && !projects.length ? <p className="px-3 py-2 text-sm text-[#B7C4D1]">Aucun projet disponible.</p> : null}
              {!loadingProjects && projects.length && !matchingProjects.length ? <p className="px-3 py-2 text-sm text-[#B7C4D1]">Aucun projet trouv{'\u00e9'}.</p> : null}
              {matchingProjects.map((project, index) => <button key={project.id} type="button" role="option" aria-selected={selectedProject?.id === project.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectProject(project)} className={['flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors', activeIndex === index ? 'bg-emerald-400/10 text-white' : 'text-[#E7EDF4] hover:bg-white/5'].join(' ')}><FolderKanban className="mt-0.5 size-4 shrink-0 text-emerald-400" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{labelFor(project)}</span><span className="mt-0.5 block truncate text-xs text-[#B7C4D1]">{detailsFor(project) || project.status || 'Dossier Kadria'}</span></span></button>)}
            </div> : null}
          </div>
          {selectedProject ? <div className="rounded-xl border border-[#344657] bg-[#111F2E] p-3"><div className="flex items-start gap-3"><FolderKanban className="mt-0.5 size-4 shrink-0 text-emerald-400" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-[#B7C4D1]">Projet li{'\u00e9'}</p><p className="mt-1 truncate text-sm font-semibold text-white">{labelFor(selectedProject)} {'\u00b7'} {selectedProject.projectTitle || selectedProject.projectType || 'Dossier'}</p><p className="mt-1 truncate text-xs text-[#B7C4D1]">Statut : {selectedProject.status || 'Non renseign\u00e9'}{selectedProject.city ? ' \u00b7 ' + selectedProject.city : ''}</p></div><button type="button" onClick={() => onProjectChange(null)} aria-label={'Retirer le projet li\u00e9'} className="grid size-7 place-items-center rounded-md text-[#B7C4D1] hover:bg-white/10 hover:text-white"><X className="size-4" /></button></div></div> : null}
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-[#E7EDF4]"><span className="flex items-center gap-2"><CalendarDays className="size-4 text-[#B7C4D1]" />D{'\u00e9'}but</span><input type="datetime-local" value={form.start} onChange={(event) => onFieldChange('start', event.target.value)} className={'mt-2 ' + fieldClassName} /></label><label className="block text-sm font-medium text-[#E7EDF4]"><span className="flex items-center gap-2"><Clock3 className="size-4 text-[#B7C4D1]" />Fin</span><input type="datetime-local" value={form.end} onChange={(event) => onFieldChange('end', event.target.value)} className={'mt-2 ' + fieldClassName} /></label></div>
          <AppointmentAssigneeSelect value={form.assignedUserId} onChange={(assignedUserId) => onFieldChange('assignedUserId', assignedUserId)} disabled={creating || deleting} />
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-[#E7EDF4]">Nom du contact<input value={form.clientName} onChange={(event) => onFieldChange('clientName', event.target.value)} className={'mt-2 ' + fieldClassName} /></label><label className="block text-sm font-medium text-[#E7EDF4]"><span className="flex items-center gap-2"><Mail className="size-4 text-[#B7C4D1]" />E-mail</span><input type="email" value={form.clientEmail} onChange={(event) => onFieldChange('clientEmail', event.target.value)} className={'mt-2 ' + fieldClassName} /></label><label className="block text-sm font-medium text-[#E7EDF4]"><span className="flex items-center gap-2"><Phone className="size-4 text-[#B7C4D1]" />Téléphone</span><input type="tel" value={form.clientPhone} onChange={(event) => onFieldChange('clientPhone', event.target.value)} className={'mt-2 ' + fieldClassName} /></label></div>
          <label className="block text-sm font-medium text-[#E7EDF4]">Notes <span className="font-normal text-[#8291A2]">- facultatif</span><textarea value={form.description} onChange={(event) => onFieldChange('description', event.target.value)} placeholder="Informations utiles pour ce rendez-vous..." rows={3} className={'mt-2 resize-y ' + fieldClassName} /></label>
          <label className="block text-sm font-medium text-[#E7EDF4]">Type de rendez-vous<select value={form.eventType} onChange={(event) => onFieldChange('eventType', event.target.value)} className={'mt-2 ' + fieldClassName}>{EVENT_TYPES_UI.map((eventType) => <option key={eventType} value={eventType}>{EVENT_TYPE_LABELS[eventType]}</option>)}</select></label>
          {!endIsValid ? <p className="flex items-center gap-2 text-sm text-red-300"><CircleAlert className="size-4" />L&apos;heure de fin doit {'\u00ea'}tre apr{'\u00e8'}s l&apos;heure de d{'\u00e9'}but.</p> : null}
          <label className="block text-sm font-medium text-[#E7EDF4]"><span className="flex items-center gap-2"><MapPin className="size-4 text-[#B7C4D1]" />Adresse <span className="font-normal text-[#8291A2]">- facultatif</span></span><div className="mt-2"><AddressAutocomplete value={form.location} onChange={(value) => onFieldChange('location', value)} placeholder="Ex. : 12 rue de la Paix, 59000 Lille" inputClassName={fieldClassName} /></div></label>
          {error ? <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm text-red-200"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p> : null}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">{mode === 'edit' && onDelete ? <button type="button" onClick={onDelete} disabled={creating || deleting} className="text-sm font-semibold text-red-300 hover:text-red-200 disabled:opacity-50">Supprimer le rendez-vous</button> : <span />}<div className="flex flex-col-reverse gap-3 sm:flex-row"><button type="button" onClick={onClose} disabled={creating || deleting} className="rounded-lg border border-[#3A4A59] px-4 py-2.5 text-sm font-semibold text-[#E7EDF4] transition-colors hover:bg-white/5 disabled:opacity-60">Annuler</button><button type="button" onClick={onSubmit} disabled={creating || deleting || !form.title.trim() || !form.start || !form.end || !endIsValid} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"><CalendarCheck2 className="size-4" />{creating ? 'Enregistrement en cours...' : mode === 'edit' ? 'Enregistrer les modifications' : 'Enregistrer le rendez-vous'}</button></div></div>
      </div>
    </div>
  );
}

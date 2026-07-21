'use client';

import Link from 'next/link';
import { Bot, ChevronDown, Plus, Search } from 'lucide-react';
import NotificationBell from '@/src/components/notifications/NotificationBell';
import WorkspaceHeader from './layout/WorkspaceHeader';
import { useShellContext } from './shell/ShellContextProvider';

export default function KadriaTopbar() {
  const { shellContext, openGlobalSearch, openQuickCreate, collaboratorOpen, toggleCollaborator } = useShellContext();
  const workspace = shellContext.pageType === 'project'
    ? { eyebrow: 'Workspace / Projet', title: shellContext.entity?.label || 'Fiche projet' }
    : shellContext.pageType === 'settings'
      ? { eyebrow: 'Workspace / Paramètres', title: 'Paramètres' }
      : shellContext.pageType === 'tracking'
    ? { eyebrow: 'Workspace / Suivi', title: 'Suivi commercial' }
    : shellContext.pageType === 'tasks'
      ? { eyebrow: 'Workspace / À faire', title: 'À faire' }
      : shellContext.pageType === 'calendar'
        ? { eyebrow: 'Workspace / Agenda', title: 'Agenda' }
        : shellContext.pageType === 'clients'
          ? { eyebrow: 'Workspace / Clients', title: 'Clients' }
          : shellContext.pageType === 'performance'
            ? { eyebrow: 'Workspace / Performance', title: 'Performance' }
            : { eyebrow: 'Workspace / Accueil', title: 'Accueil' };
  return (
    <header className="flex min-h-[76px] shrink-0 items-center border-b border-slate-200 bg-white px-5 xl:px-7">
      <div className="w-full">
        <WorkspaceHeader
          eyebrow={workspace.eyebrow}
          title={workspace.title}
          actions={
            <>
              <button type="button" data-global-search-trigger onClick={openGlobalSearch} className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 lg:flex" aria-label="Ouvrir la recherche globale">
                <Search className="h-4 w-4" />
                <span className="w-40 text-left text-sm text-slate-500">Rechercher</span>
                <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400">⌘K</kbd>
              </button>
              <button type="button" onClick={openQuickCreate} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-3.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2">
                <Plus className="h-4 w-4" />
                Créer
              </button>
              <NotificationBell variant="desktop" />
              <Link href="/parametres" className="hidden items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 xl:flex">
                Mon entreprise
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/parametres" aria-label="Mon profil" className="grid h-10 w-10 place-items-center rounded-full bg-[#0b2232] text-sm font-semibold text-white transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2">
                A
              </Link>
              <button
                type="button"
                onClick={toggleCollaborator}
                aria-pressed={collaboratorOpen}
                aria-label={collaboratorOpen ? 'Fermer le Collaborateur Kadria' : 'Ouvrir le Collaborateur Kadria'}
                title={collaboratorOpen ? 'Fermer le Collaborateur Kadria' : 'Ouvrir le Collaborateur Kadria'}
                className={`hidden h-10 w-10 place-items-center rounded-xl border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 xl:grid ${
                  collaboratorOpen ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Bot className="h-5 w-5" />
              </button>
            </>
          }
        />
      </div>
    </header>
  );
}

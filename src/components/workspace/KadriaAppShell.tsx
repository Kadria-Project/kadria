'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import KadriaCollaboratorPanel from './KadriaCollaboratorPanel';
import KadriaSidebar, { type WorkspaceMode } from './KadriaSidebar';
import KadriaTopbar from './KadriaTopbar';
import WorkspaceCanvas from './WorkspaceCanvas';

const SIDEBAR_STORAGE_KEY = 'kadria-workspace-sidebar-compact';
const COLLABORATOR_STORAGE_KEY = 'kadria-workspace-collaborator-open';

export default function KadriaAppShell({ children }: { children: ReactNode }) {
  const [desktop, setDesktop] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [collaboratorOpen, setCollaboratorOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('value');
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    let frame = requestAnimationFrame(() => {
      setDesktop(media.matches);
      try {
        setCompactSidebar(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
        setCollaboratorOpen(media.matches && window.localStorage.getItem(COLLABORATOR_STORAGE_KEY) !== 'false');
      } catch {
        setCollaboratorOpen(media.matches);
      }
    });
    const updateDesktop = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setDesktop(media.matches));
    };
    media.addEventListener('change', updateDesktop);

    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener('change', updateDesktop);
    };
  }, []);

  const updateSidebar = () => {
    setCompactSidebar((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  const updateCollaborator = (next: boolean) => {
    setCollaboratorOpen(next);
    window.localStorage.setItem(COLLABORATOR_STORAGE_KEY, String(next));
  };

  const selectMode = (mode: WorkspaceMode) => {
    // Le dashboard conserve son moteur de navigation actuel pendant Sprint 0.
    const label = mode === 'value' ? 'Accueil' : mode === 'commercial' ? 'Suivi' : mode === 'calendar' ? 'Agenda' : mode === 'clients' ? 'Clients' : mode === 'tasks' ? 'À faire' : 'Performance';
    const legacyControl = canvasRef.current?.querySelector<HTMLButtonElement>(`aside button[aria-label="${label}"]`);
    if (!legacyControl) return;
    legacyControl.click();
    setActiveMode(mode);
  };

  if (!desktop) return <>{children}</>;

  return (
    <div className="kadria-app-shell flex h-screen min-w-0 overflow-hidden bg-[#f6f8f7]">
      <KadriaSidebar compact={compactSidebar} activeMode={activeMode} onToggle={updateSidebar} onSelectMode={selectMode} />
      <div className="flex min-w-0 flex-1 flex-col">
        <KadriaTopbar collaboratorOpen={collaboratorOpen} onToggleCollaborator={() => updateCollaborator(!collaboratorOpen)} />
        <div ref={canvasRef} className="flex min-h-0 flex-1 overflow-hidden">
          <WorkspaceCanvas>{children}</WorkspaceCanvas>
        </div>
      </div>
      <KadriaCollaboratorPanel open={collaboratorOpen} onClose={() => updateCollaborator(false)} />
      <style jsx global>{`
        .kadria-app-shell .kadria-workspace-canvas .dashboard-shell {
          min-height: 0 !important;
          background: transparent !important;
        }
        .kadria-app-shell .kadria-workspace-canvas .dashboard-shell > aside {
          display: none !important;
        }
        .kadria-app-shell .kadria-workspace-canvas .dashboard-shell > .min-w-0.flex-1 {
          padding: 0 !important;
        }
        .kadria-app-shell .kadria-workspace-canvas .dashboard-shell > .min-w-0.flex-1 > div[style*="justify-content: flex-end"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

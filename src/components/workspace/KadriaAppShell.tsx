'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import KadriaSidebar from './KadriaSidebar';
import KadriaTopbar from './KadriaTopbar';
import KadriaMobileNavigation from './KadriaMobileNavigation';
import NavigationPerformanceProbe from './NavigationPerformanceProbe';
import DevelopmentWebVitals from './DevelopmentWebVitals';
import GlobalSearchDialog from './GlobalSearchDialog';
import QuickCreate from './QuickCreate';
import WorkspaceCanvas from './WorkspaceCanvas';
import { WorkspaceNavigationProvider, type DashboardMode, type WorkspaceNavigation, useWorkspaceNavigation } from './WorkspaceNavigationContext';
import { shouldRestoreDashboardNavigation } from './workspace-route-guards';
import { ShellContextProvider } from './shell/ShellContextProvider';
import KadriaAssistantWidget from '@/src/components/kadria-assistant/KadriaAssistantWidget';

const SIDEBAR_STORAGE_KEY = 'kadria-workspace-sidebar-compact';
const SCROLL_STORAGE_KEY = 'kadria-workspace-scroll';

type ScrollMemory = {
  mode: DashboardMode;
  scrollPositions: Partial<Record<DashboardMode, number>>;
};

function isDashboardMode(value: unknown): value is DashboardMode {
  return value === 'value' || value === 'commercial' || value === 'calendar' || value === 'clients' || value === 'tasks' || value === 'pipeline' || value === 'value-report';
}

export default function KadriaAppShell({ children }: { children: ReactNode }) {
  return <WorkspaceNavigationProvider><ShellContextProvider>{process.env.NODE_ENV === 'development' && <DevelopmentWebVitals />}<NavigationPerformanceProbe /><KadriaAppShellLayout>{children}</KadriaAppShellLayout><GlobalSearchDialog /><QuickCreate /></ShellContextProvider></WorkspaceNavigationProvider>;
}

function KadriaAppShellLayout({ children }: { children: ReactNode }) {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const { dashboardMode, pendingNavigation, commitNavigation, consumeNavigation, registerNavigationHandler, takeRememberedNavigation } = useWorkspaceNavigation();
  const pathname = usePathname();
  const initialPathnameRef = useRef(pathname);
  const canvasRef = useRef<HTMLElement>(null);
  const dashboardModeRef = useRef<DashboardMode>('value');
  const scrollMemoryRef = useRef<ScrollMemory>({ mode: 'value', scrollPositions: {} });
  const focusTimerRef = useRef<number | null>(null);

  const saveScrollMemory = useCallback(() => {
    try {
      window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(scrollMemoryRef.current));
    } catch {
      // La navigation reste fonctionnelle quand le stockage de session est indisponible.
    }
  }, []);

  const requestNavigation = useCallback((navigation: WorkspaceNavigation) => {
    const canvas = canvasRef.current;
    const currentMode = dashboardModeRef.current;
    if (canvas) scrollMemoryRef.current.scrollPositions[currentMode] = canvas.scrollTop;
    scrollMemoryRef.current.mode = navigation.mode;
    saveScrollMemory();
    commitNavigation(navigation);
  }, [commitNavigation, saveScrollMemory]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    let frame = requestAnimationFrame(() => {
      setDesktop(media.matches);
      try {
        setCompactSidebar(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
      } catch {}
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

  useEffect(() => {
    dashboardModeRef.current = dashboardMode;
  }, [dashboardMode]);

  useEffect(() => {
    if (!desktop) return;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [desktop]);

  useEffect(() => registerNavigationHandler(requestNavigation), [registerNavigationHandler, requestNavigation]);

  useEffect(() => {
    if (!shouldRestoreDashboardNavigation(desktop, initialPathnameRef.current)) return;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(SCROLL_STORAGE_KEY) || 'null') as ScrollMemory | null;
      if (saved && isDashboardMode(saved.mode)) scrollMemoryRef.current = { mode: saved.mode, scrollPositions: saved.scrollPositions || {} };
      const returnContext = takeRememberedNavigation();
      requestAnimationFrame(() => requestNavigation(returnContext || { mode: scrollMemoryRef.current.mode }));
    } catch {
      // La vue Accueil reste le point de départ si la mémoire de navigation est indisponible.
    }
  }, [desktop, requestNavigation, takeRememberedNavigation]);

  useEffect(() => {
    if (!desktop) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame: number | null = null;
    const rememberScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        scrollMemoryRef.current.scrollPositions[dashboardModeRef.current] = canvas.scrollTop;
        saveScrollMemory();
        frame = null;
      });
    };
    canvas.addEventListener('scroll', rememberScroll, { passive: true });
    return () => {
      canvas.removeEventListener('scroll', rememberScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [desktop, saveScrollMemory]);

  useEffect(() => {
    if (!desktop || !pendingNavigation || pendingNavigation.mode !== dashboardMode) return;
    const frame = window.requestAnimationFrame(() => {
      const actionTarget = pendingNavigation.actionId
        ? document.getElementById(`workspace-action-${pendingNavigation.actionId}`)
        : null;
      const target = actionTarget || (pendingNavigation.section
        ? document.getElementById(`workspace-section-${pendingNavigation.section}`)
        : null);

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.remove('kadria-workspace-focus');
        window.requestAnimationFrame(() => target.classList.add('kadria-workspace-focus'));
        if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = window.setTimeout(() => target.classList.remove('kadria-workspace-focus'), 2100);
      } else {
        canvasRef.current?.scrollTo({ top: scrollMemoryRef.current.scrollPositions[dashboardMode] || 0, behavior: 'auto' });
      }
      consumeNavigation(pendingNavigation.id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [consumeNavigation, dashboardMode, desktop, pendingNavigation]);

  useEffect(() => () => {
    if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
  }, []);

  const updateSidebar = () => {
    setCompactSidebar((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  if (desktop === null) {
    return <div aria-busy="true" className="min-h-screen bg-[#f6f8f7]" />;
  }

  if (!desktop) return <div className="min-h-screen bg-[#f6f8f7] pb-16">{children}<KadriaMobileNavigation /><KadriaAssistantWidget /></div>;

  return (
    <div className="kadria-app-shell flex h-screen min-w-0 overflow-hidden bg-[#f6f8f7]">
      <KadriaSidebar compact={compactSidebar} onToggle={updateSidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <KadriaTopbar />
        <div className="flex min-h-0 flex-1 overflow-hidden"><WorkspaceCanvas ref={canvasRef}>{children}</WorkspaceCanvas></div>
      </div>
      <KadriaAssistantWidget />
      <style jsx global>{`
        .kadria-app-shell .kadria-workspace-canvas .dashboard-shell { min-height: 0 !important; background: transparent !important; }
        .kadria-app-shell .kadria-workspace-canvas .dashboard-shell > aside { display: none !important; }
        .kadria-app-shell .kadria-workspace-canvas .dashboard-shell > .min-w-0.flex-1 { padding: 0 !important; }
        .kadria-app-shell .kadria-workspace-canvas .dashboard-shell > .min-w-0.flex-1 > div[style*="justify-content: flex-end"] { display: none !important; }
        .kadria-workspace-focus { animation: kadria-workspace-focus 2.1s ease-out both; border-color: #34d399 !important; }
        @keyframes kadria-workspace-focus { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.22); } 25% { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.12); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        @media (prefers-reduced-motion: reduce) { .kadria-workspace-focus { animation: none; } }
      `}</style>
    </div>
  );
}

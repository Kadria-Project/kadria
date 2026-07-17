'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type DashboardMode = 'value' | 'commercial' | 'calendar' | 'clients' | 'tasks' | 'pipeline' | 'value-report';
export type WorkspaceSection = 'briefing' | 'decisions' | 'priorities' | 'queue' | 'automations' | 'validations' | 'later' | 'calendar' | 'next-appointment';

export type WorkspaceNavigation = {
  mode: DashboardMode;
  actionId?: string;
  section?: WorkspaceSection;
};

const DASHBOARD_MODE_PATHS: Record<DashboardMode, string> = {
  value: '/dashboard-v2',
  tasks: '/dashboard-v2/a-faire',
  commercial: '/dashboard-v2/suivi',
  calendar: '/dashboard-v2/agenda',
  clients: '/dashboard-v2/clients',
  pipeline: '/dashboard-v2/suivi',
  'value-report': '/dashboard-v2/performance',
};

export function dashboardModeFromPathname(pathname: string | null): DashboardMode {
  if (!pathname || pathname === '/dashboard-v2') return 'value';
  if (pathname.startsWith('/dashboard-v2/a-faire')) return 'tasks';
  if (pathname.startsWith('/dashboard-v2/suivi')) return 'commercial';
  if (pathname.startsWith('/dashboard-v2/agenda')) return 'calendar';
  if (pathname.startsWith('/dashboard-v2/clients')) return 'clients';
  if (pathname.startsWith('/dashboard-v2/performance')) return 'value-report';
  return 'value';
}

export function dashboardPathForMode(mode: DashboardMode) {
  return DASHBOARD_MODE_PATHS[mode];
}

type PendingWorkspaceNavigation = WorkspaceNavigation & { id: number };
type NavigationHandler = (navigation: WorkspaceNavigation) => void;

type WorkspaceNavigationValue = {
  dashboardMode: DashboardMode;
  navigate: (navigation: WorkspaceNavigation) => void;
  pendingNavigation: PendingWorkspaceNavigation | null;
  commitNavigation: (navigation: WorkspaceNavigation) => void;
  consumeNavigation: (id: number) => void;
  registerNavigationHandler: (handler: NavigationHandler) => () => void;
  rememberNavigation: (navigation: WorkspaceNavigation) => void;
  takeRememberedNavigation: () => WorkspaceNavigation | null;
};

const RETURN_CONTEXT_STORAGE_KEY = 'kadria-workspace-return-context';
const WorkspaceNavigationContext = createContext<WorkspaceNavigationValue | null>(null);

function isDashboardMode(value: unknown): value is DashboardMode {
  return value === 'value' || value === 'commercial' || value === 'calendar' || value === 'clients' || value === 'tasks' || value === 'pipeline' || value === 'value-report';
}

export function WorkspaceNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dashboardMode = dashboardModeFromPathname(pathname);
  const [pendingNavigation, setPendingNavigation] = useState<PendingWorkspaceNavigation | null>(null);
  const handlerRef = useRef<NavigationHandler | null>(null);
  const navigationIdRef = useRef(0);

  const commitNavigation = useCallback((navigation: WorkspaceNavigation) => {
    setPendingNavigation({ ...navigation, id: ++navigationIdRef.current });
    router.push(dashboardPathForMode(navigation.mode));
  }, [router]);

  const navigate = useCallback((navigation: WorkspaceNavigation) => {
    if (handlerRef.current) {
      handlerRef.current(navigation);
      return;
    }
    commitNavigation(navigation);
  }, [commitNavigation]);

  const consumeNavigation = useCallback((id: number) => {
    setPendingNavigation((current) => current?.id === id ? null : current);
  }, []);

  const registerNavigationHandler = useCallback((handler: NavigationHandler) => {
    handlerRef.current = handler;
    return () => {
      if (handlerRef.current === handler) handlerRef.current = null;
    };
  }, []);

  const rememberNavigation = useCallback((navigation: WorkspaceNavigation) => {
    try {
      window.sessionStorage.setItem(RETURN_CONTEXT_STORAGE_KEY, JSON.stringify(navigation));
    } catch {
      // Le retour au Workspace reste disponible même si le stockage est indisponible.
    }
  }, []);

  const takeRememberedNavigation = useCallback(() => {
    try {
      const raw = window.sessionStorage.getItem(RETURN_CONTEXT_STORAGE_KEY);
      window.sessionStorage.removeItem(RETURN_CONTEXT_STORAGE_KEY);
      if (!raw) return null;
      const navigation = JSON.parse(raw) as WorkspaceNavigation;
      return isDashboardMode(navigation.mode) ? navigation : null;
    } catch {
      return null;
    }
  }, []);

  return <WorkspaceNavigationContext.Provider value={{ dashboardMode, navigate, pendingNavigation, commitNavigation, consumeNavigation, registerNavigationHandler, rememberNavigation, takeRememberedNavigation }}>{children}</WorkspaceNavigationContext.Provider>;
}

export function useWorkspaceNavigation() {
  const context = useContext(WorkspaceNavigationContext);
  if (!context) throw new Error('useWorkspaceNavigation must be used inside WorkspaceNavigationProvider.');
  return context;
}

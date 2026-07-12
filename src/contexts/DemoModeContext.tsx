'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DEMO_ARTISAN,
  DEMO_CLIENT_EVENTS,
  DEMO_EVENTS,
  DEMO_NOTIFICATIONS,
  DEMO_PROJECTS,
  getScenarioArtisan,
  getScenarioEvents,
  getScenarioNotifications,
  getScenarioProjects,
  type DemoClientEvent,
  type DemoEvent,
  type DemoNotification,
  type DemoProject,
  type DemoScenario,
} from '@/src/lib/demo-data';

function readScenario(value: string | null): DemoScenario {
  const allowed: DemoScenario[] = ['normal', 'dense', 'empty', 'essential', 'performance'];
  return allowed.includes(value as DemoScenario) ? (value as DemoScenario) : 'normal';
}

type DemoArtisan = typeof DEMO_ARTISAN;

interface DemoModeContextValue {
  isDemoMode: boolean;
  projects: DemoProject[];
  events: DemoEvent[];
  artisan: DemoArtisan;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  createProject: (project: {
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    siteAddress: string;
    city?: string;
    postalCode?: string;
    latitude?: number | null;
    longitude?: number | null;
    trade?: string;
    projectType?: string;
    aiSummary?: string;
    budget?: string;
    desiredTimeline?: string;
    maturity?: string;
    completenessScore?: number;
    source?: string;
  }) => DemoProject;
  updateProjectStatus: (id: string, status: string) => void;
  updateProjectFields: (id: string, fields: Partial<DemoProject>) => void;
  updateProjectNote: (id: string, note: string) => void;
  updateProjectCallback: (id: string, date: string | null) => void;
  createEvent: (event: Omit<DemoEvent, 'id'>) => void;
  updateEvent: (id: string, fields: Partial<DemoEvent>) => void;
  deleteEvent: (id: string) => void;
  updateArtisanConfig: (fields: Partial<DemoArtisan>) => void;
  clientEvents: Record<string, DemoClientEvent[]>;
  addClientEvent: (projectId: string, event: Omit<DemoClientEvent, 'id' | 'createdAt'> & { createdAt?: string }) => void;
  notifications: DemoNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notification: Omit<DemoNotification, 'id' | 'createdAt' | 'status'>) => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  // Scenario selection (LocalUxAuditToolbar -> ?scenario=normal|dense|empty|
  // essential|performance). useSearchParams is safe here: this layout is
  // rendered dynamically (auth/middleware-gated), never statically exported.
  const searchParams = useSearchParams();
  const scenario = readScenario(searchParams?.get('scenario') ?? null);

  const [projects, setProjects] = useState<DemoProject[]>(() => getScenarioProjects(scenario));
  const [events, setEvents] = useState<DemoEvent[]>(() => getScenarioEvents(scenario));
  const [artisan, setArtisan] = useState<DemoArtisan>(() => getScenarioArtisan(scenario));
  const [theme, setThemeState] = useState<'dark' | 'light'>(DEMO_ARTISAN.theme);
  const [clientEvents, setClientEvents] = useState<Record<string, DemoClientEvent[]>>(DEMO_CLIENT_EVENTS);
  const [notifications, setNotifications] = useState<DemoNotification[]>(() => getScenarioNotifications(scenario));

  // Re-derive fixtures whenever the scenario query param changes so the UI
  // reflects the newly selected scenario without a full page reload.
  useEffect(() => {
    setProjects(getScenarioProjects(scenario));
    setEvents(getScenarioEvents(scenario));
    setArtisan(getScenarioArtisan(scenario));
    setNotifications(getScenarioNotifications(scenario));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  const addClientEvent = useCallback((projectId: string, event: Omit<DemoClientEvent, 'id' | 'createdAt'> & { createdAt?: string }) => {
    setClientEvents((current) => {
      const list = current[projectId] || [];
      const created: DemoClientEvent = {
        id: `demo_evt_${projectId}_${Date.now()}`,
        createdAt: event.createdAt || new Date().toISOString(),
        type: event.type,
        title: event.title,
        message: event.message ?? null,
        source: event.source,
      };
      return { ...current, [projectId]: [...list, created] };
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: 'dark' | 'light') => {
    setThemeState(nextTheme);
    setArtisan((current) => ({ ...current, theme: nextTheme }));
  }, []);

  const createProject = useCallback((projectInput: {
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    siteAddress: string;
    city?: string;
    postalCode?: string;
    latitude?: number | null;
    longitude?: number | null;
    trade?: string;
    projectType?: string;
    aiSummary?: string;
    budget?: string;
    desiredTimeline?: string;
    maturity?: string;
    completenessScore?: number;
    source?: string;
  }) => {
    const now = new Date().toISOString();
    const trimmedName = projectInput.clientName.trim();
    const [clientFirstName = 'Client', ...restName] = trimmedName.split(/\s+/).filter(Boolean);
    const clientName = restName.join(' ') || 'Demo';
    const nextIndex = projects.length + 1;
    const createdProject: DemoProject = {
      id: `demo_local_${Date.now()}`,
      projectNumber: `DEV-2026-${String(nextIndex).padStart(3, '0')}`,
      clientFirstName,
      clientName,
      clientPhone: projectInput.clientPhone.trim(),
      clientEmail: projectInput.clientEmail.trim(),
      siteAddress: projectInput.siteAddress.trim(),
      city: projectInput.city || '',
      postalCode: projectInput.postalCode || '',
      trade: projectInput.trade || artisan.primaryTrade || 'Projet',
      projectType: projectInput.projectType || 'Projet a qualifier',
      budget: projectInput.budget || '',
      desiredTimeline: projectInput.desiredTimeline || '',
      maturity: projectInput.maturity || 'A qualifier',
      aiSummary: projectInput.aiSummary || 'Nouveau dossier cree en mode demo. Aucune donnee reelle n a ete enregistree.',
      completenessScore: projectInput.completenessScore ?? 42,
      status: 'Nouveau',
      source: projectInput.source || 'demo-mobile',
      devisAmount: null,
      photos: [],
      createdAt: now,
      updatedAt: now,
      lastInteractionAt: now,
      callbackDate: null,
      notes: '',
      responsibleUserId: 'demo_owner',
      responsibleAssignedAt: now,
      responsibleUser: {
        userId: 'demo_owner',
        firstName: 'Alexandre',
        lastName: 'Bernard',
        email: 'contact@ab-elec-demo.fr',
        role: 'owner',
        jobTitle: 'Dirigeant',
        status: 'active',
        displayName: 'Alexandre Bernard',
      },
    };

    setProjects((current) => [createdProject, ...current]);
    return createdProject;
  }, [artisan.primaryTrade, projects.length]);

  const updateProjectStatus = useCallback((id: string, status: string) => {
    setProjects((current) => current.map((project) => (project.id === id ? { ...project, status } : project)));
  }, []);

  const updateProjectFields = useCallback((id: string, fields: Partial<DemoProject>) => {
    setProjects((current) => current.map((project) => (project.id === id ? { ...project, ...fields } : project)));
  }, []);

  const updateProjectNote = useCallback((id: string, notes: string) => {
    setProjects((current) => current.map((project) => (project.id === id ? { ...project, notes } : project)));
  }, []);

  const updateProjectCallback = useCallback((id: string, callbackDate: string | null) => {
    setProjects((current) =>
      current.map((project) => (project.id === id ? { ...project, callbackDate } : project)),
    );
  }, []);

  const createEvent = useCallback((event: Omit<DemoEvent, 'id'>) => {
    setEvents((current) => [...current, { ...event, id: `demo_evt_${Date.now()}` }]);
  }, []);

  const updateEvent = useCallback((id: string, fields: Partial<DemoEvent>) => {
    setEvents((current) => current.map((event) => (event.id === id ? { ...event, ...fields } : event)));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((current) => current.filter((event) => event.id !== id));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, status: 'read' as const } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((current) => current.map((n) => ({ ...n, status: 'read' as const })));
  }, []);

  const addNotification = useCallback((notification: Omit<DemoNotification, 'id' | 'createdAt' | 'status'>) => {
    setNotifications((current) => [
      {
        ...notification,
        id: `demo_notif_${Date.now()}`,
        status: 'unread' as const,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  }, []);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => n.status === 'unread').length,
    [notifications],
  );

  const updateArtisanConfig = useCallback((fields: Partial<DemoArtisan>) => {
    setArtisan((current) => ({ ...current, ...fields }));
    if (fields.theme === 'dark' || fields.theme === 'light') {
      setThemeState(fields.theme);
    }
  }, []);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoMode: true,
      projects,
      events,
      artisan,
      theme,
      setTheme,
      createProject,
      updateProjectStatus,
      updateProjectFields,
      updateProjectNote,
      updateProjectCallback,
      createEvent,
      updateEvent,
      deleteEvent,
      updateArtisanConfig,
      clientEvents,
      addClientEvent,
      notifications,
      unreadNotificationCount,
      markNotificationRead,
      markAllNotificationsRead,
      addNotification,
    }),
    [artisan, clientEvents, addClientEvent, createEvent, createProject, deleteEvent, events, projects, setTheme, theme, updateArtisanConfig, updateEvent, updateProjectCallback, updateProjectFields, updateProjectNote, updateProjectStatus, notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead, addNotification],
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within DemoModeProvider');
  }
  return context;
}

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO_ARTISAN, DEMO_CLIENT_EVENTS, DEMO_EVENTS, DEMO_PROJECTS, type DemoClientEvent, type DemoEvent, type DemoProject } from '@/src/lib/demo-data';

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
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<DemoProject[]>(DEMO_PROJECTS);
  const [events, setEvents] = useState<DemoEvent[]>(DEMO_EVENTS);
  const [artisan, setArtisan] = useState<DemoArtisan>(DEMO_ARTISAN);
  const [theme, setThemeState] = useState<'dark' | 'light'>(DEMO_ARTISAN.theme);
  const [clientEvents, setClientEvents] = useState<Record<string, DemoClientEvent[]>>(DEMO_CLIENT_EVENTS);

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
      city: '',
      postalCode: '',
      trade: artisan.primaryTrade || 'Projet',
      projectType: 'Projet a qualifier',
      budget: '',
      desiredTimeline: '',
      maturity: 'A qualifier',
      aiSummary: 'Nouveau dossier cree en mode demo. Aucune donnee reelle n a ete enregistree.',
      completenessScore: 42,
      status: 'Nouveau',
      source: 'demo-mobile',
      devisAmount: null,
      photos: [],
      createdAt: now,
      updatedAt: now,
      lastInteractionAt: now,
      callbackDate: null,
      notes: '',
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
    }),
    [artisan, clientEvents, addClientEvent, createEvent, createProject, deleteEvent, events, projects, setTheme, theme, updateArtisanConfig, updateEvent, updateProjectCallback, updateProjectFields, updateProjectNote, updateProjectStatus],
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

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO_ARTISAN, DEMO_EVENTS, DEMO_PROJECTS, type DemoEvent, type DemoProject } from '@/src/lib/demo-data';

type DemoArtisan = typeof DEMO_ARTISAN;

interface DemoModeContextValue {
  isDemoMode: boolean;
  projects: DemoProject[];
  events: DemoEvent[];
  artisan: DemoArtisan;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  updateProjectStatus: (id: string, status: string) => void;
  updateProjectNote: (id: string, note: string) => void;
  updateProjectCallback: (id: string, date: string | null) => void;
  createEvent: (event: Omit<DemoEvent, 'id'>) => void;
  updateEvent: (id: string, fields: Partial<DemoEvent>) => void;
  deleteEvent: (id: string) => void;
  updateArtisanConfig: (fields: Partial<DemoArtisan>) => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<DemoProject[]>(DEMO_PROJECTS);
  const [events, setEvents] = useState<DemoEvent[]>(DEMO_EVENTS);
  const [artisan, setArtisan] = useState<DemoArtisan>(DEMO_ARTISAN);
  const [theme, setThemeState] = useState<'dark' | 'light'>(DEMO_ARTISAN.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: 'dark' | 'light') => {
    setThemeState(nextTheme);
    setArtisan((current) => ({ ...current, theme: nextTheme }));
  }, []);

  const updateProjectStatus = useCallback((id: string, status: string) => {
    setProjects((current) => current.map((project) => (project.id === id ? { ...project, status } : project)));
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
      updateProjectStatus,
      updateProjectNote,
      updateProjectCallback,
      createEvent,
      updateEvent,
      deleteEvent,
      updateArtisanConfig,
    }),
    [artisan, createEvent, deleteEvent, events, projects, setTheme, theme, updateArtisanConfig, updateEvent, updateProjectCallback, updateProjectNote, updateProjectStatus],
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

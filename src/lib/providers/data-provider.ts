import { getProject, getProjectActivity, getProjects } from '@/src/lib/api';
import type { DataProvider } from './types';
import type { DemoProject } from '@/src/lib/demo-data';
import { DEMO_SETTINGS_CONFIGURATION } from '@/src/lib/demo-data';

/**
 * Production data provider — thin wrapper around the existing real API
 * calls. Screens are NOT migrated to use this in this lot; it exists so
 * future lots can swap `getProjects()`/`getProject()` calls for
 * `data.getProjects()`/`data.getProject()` without behavior change.
 */
export function createProductionDataProvider(): DataProvider {
  return {
    getProjects: (params) => getProjects(params),
    getProject: (id) => getProject(id),
    getProjectActivity: (id) => getProjectActivity(id),
    async getQuotes(projectId) {
      const res = await fetch(`/api/devis?projet_id=${projectId}`);
      if (!res.ok) throw new Error('Erreur récupération devis');
      const json = await res.json();
      return json.devis ?? [];
    },
    async getAppointment(projectId) {
      const res = await fetch(`/api/appointments/by-project?projectId=${projectId}`);
      if (!res.ok) return null;
      return res.json();
    },
    async getSettings() {
      const res = await fetch('/api/artisan/config');
      if (!res.ok) throw new Error('Erreur récupération paramètres');
      return res.json();
    },
    async getUsage() {
      const res = await fetch('/api/usage/monthly');
      if (!res.ok) throw new Error('Erreur récupération usage');
      return res.json();
    },
    async getCatalogue() {
      const res = await fetch('/api/artisan/service-profiles');
      if (!res.ok) return [];
      return res.json();
    },
    async getWidgetConfig() {
      const res = await fetch('/api/artisan/business-profile');
      if (!res.ok) throw new Error('Erreur récupération configuration widget');
      return res.json();
    },
    async getPhotos(projectId) {
      const project = await getProject(projectId);
      return (project as { photos?: unknown[] })?.photos ?? [];
    },
    async getDocuments(projectId) {
      const res = await fetch(`/api/devis?projet_id=${projectId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.devis ?? [];
    },
    async getTravelCost() {
      // Computed client-side from business profile + project address in
      // production today; not yet exposed as a standalone endpoint.
      return null;
    },
    async getServiceMatches() {
      // Computed client-side via matchProjectToServices() in production
      // today; not yet exposed as a standalone endpoint.
      return [];
    },
  };
}

/**
 * Minimal snapshot of demo state needed to answer DataProvider queries.
 * Decoupled from DemoModeContext's full type so this module stays
 * framework-agnostic (no React import here).
 */
export interface DemoDataSnapshot {
  projects: DemoProject[];
  settings?: typeof DEMO_SETTINGS_CONFIGURATION;
}

/**
 * Demo data provider — reads from the in-memory demo fixtures
 * (src/lib/demo-data.ts) instead of any real API/Supabase call. Return
 * shapes intentionally mirror what the production provider returns so the
 * same UI components can consume either.
 */
export function createDemoDataProvider(snapshot: DemoDataSnapshot): DataProvider {
  const findProject = (id: string) => snapshot.projects.find((project) => project.id === id) ?? null;

  return {
    async getProjects() {
      return snapshot.projects;
    },
    async getProject(id) {
      return findProject(id);
    },
    async getProjectActivity(id) {
      return findProject(id)?.activity ?? [];
    },
    async getQuotes(projectId) {
      const project = findProject(projectId);
      if (!project?.quote) return [];
      return [project.quote];
    },
    async getAppointment() {
      return null;
    },
    async getSettings() {
      return snapshot.settings ?? DEMO_SETTINGS_CONFIGURATION;
    },
    async getUsage() {
      return (snapshot.settings ?? DEMO_SETTINGS_CONFIGURATION).offer.quotas;
    },
    async getCatalogue() {
      return [...(snapshot.settings ?? DEMO_SETTINGS_CONFIGURATION).catalogue.services];
    },
    async getWidgetConfig() {
      return (snapshot.settings ?? DEMO_SETTINGS_CONFIGURATION).widget;
    },
    async getPhotos(projectId) {
      return findProject(projectId)?.photos ?? [];
    },
    async getDocuments(projectId) {
      const project = findProject(projectId);
      return project?.quote ? [project.quote] : [];
    },
    async getTravelCost() {
      return null;
    },
    async getServiceMatches() {
      return [];
    },
  };
}

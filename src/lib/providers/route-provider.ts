import type { RouteProvider } from './types';

/**
 * Centralized route maps. No component should hardcode
 * "/dashboard-v2", "/demo-dashboard", "/parametres" or "/demo-parametres"
 * directly — use getAppProviders(mode).routes instead.
 */

export const productionRoutes: RouteProvider = {
  dashboard: '/dashboard-v2',
  settings: '/parametres',
  login: '/login',
  projectDetail: (projectId: string) => `/dashboard-v2/projet/${projectId}`,
  projectQuoteNew: (projectId: string) => `/dashboard-v2/projet/${projectId}/devis/new`,
  projectQuoteDetail: (projectId: string, quoteId: string) =>
    `/dashboard-v2/projet/${projectId}/devis/${quoteId}`,
};

export const demoRoutes: RouteProvider = {
  dashboard: '/demo-dashboard',
  settings: '/demo-parametres',
  login: '/demo',
  projectDetail: (projectId: string) => `/demo-dashboard/projet/${projectId}`,
  projectQuoteNew: (projectId: string) => `/demo-dashboard/projet/${projectId}/devis/new`,
  projectQuoteDetail: (projectId: string, quoteId: string) =>
    `/demo-dashboard/projet/${projectId}/devis/${quoteId}`,
};
